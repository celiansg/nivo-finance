type RequestLike = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type ResponseLike = {
  status: (code: number) => ResponseLike;
  json: (body: unknown) => void;
  setHeader?: (name: string, value: string) => void;
};

type GeminiPart = { text?: string };

const MAX_IMAGE_BYTES = 8_000_000;
const MAX_REQUEST_BYTES = 12_000_000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const TOKEN_TIMEOUT_MS = 8_000;
const GEMINI_TIMEOUT_MS = 45_000;
const MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite';
const MODEL_FALLBACKS = ['gemini-3.5-flash-lite', 'gemini-2.5-flash'];
const requestCounters = new Map<string, { count: number; resetAt: number }>();

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function jsonBody(body: unknown) {
  if (typeof body === 'string') {
    if (body.length > MAX_REQUEST_BYTES) throw new Error('Corps de requête trop volumineux.');
    return JSON.parse(body) as Record<string, unknown>;
  }
  if (!body || typeof body !== 'object') throw new Error('Corps de requête invalide.');
  if (JSON.stringify(body).length > MAX_REQUEST_BYTES)
    throw new Error('Corps de requête trop volumineux.');
  return body as Record<string, unknown>;
}

function requestKey(req: RequestLike) {
  const forwarded = headerValue(req.headers['x-forwarded-for']);
  return forwarded?.split(',')[0]?.trim() || headerValue(req.headers['x-real-ip']) || 'unknown';
}

function consumeRateLimit(req: RequestLike) {
  const now = Date.now();
  for (const [key, counter] of requestCounters) {
    if (counter.resetAt <= now) requestCounters.delete(key);
  }
  const key = requestKey(req);
  const current = requestCounters.get(key);
  if (!current || current.resetAt <= now) {
    requestCounters.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  current.count += 1;
  if (current.count <= RATE_LIMIT_MAX_REQUESTS) return { allowed: true, retryAfter: 0 };
  return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function cleanJson(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function providerError(status: number | undefined) {
  if (status === 401 || status === 403)
    return 'La clé Gemini est refusée. Vérifiez GEMINI_API_KEY dans les variables Production de Vercel.';
  if (status === 429)
    return 'Le quota Gemini est temporairement atteint. Réessayez dans quelques instants.';
  if (status === 400 || status === 404)
    return 'Le modèle Gemini configuré n’est pas disponible. Supprimez GEMINI_MODEL dans Vercel ou utilisez gemini-3.5-flash-lite, puis redéployez.';
  return 'Le service Gemini est momentanément indisponible. Réessayez dans quelques instants.';
}

async function verifyFirebaseToken(token: string) {
  const apiKey = process.env.FIREBASE_API_KEY;
  if (!apiKey) throw new Error('FIREBASE_API_KEY manquante dans Vercel.');
  const response = await fetchWithTimeout(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    },
    TOKEN_TIMEOUT_MS,
  );
  if (!response.ok) return false;
  const result = (await response.json()) as { users?: Array<{ localId?: string }> };
  return Boolean(result.users?.[0]?.localId);
}

function promptForToday() {
  const today = new Date().toISOString().slice(0, 10);
  return `
Tu es l'assistant d'import de Nivo, une application financière personnelle.
Analyse uniquement les opérations visibles sur l'image fournie. Il peut s'agir d'un relevé bancaire, d'un historique de carte ou d'une capture d'écran d'une application bancaire.

Règles strictes :
- Ne jamais inventer une ligne qui n'est pas lisible.
- Les montants doivent être positifs dans amount.
- direction vaut expense pour un débit/dépense et income pour un crédit/revenu.
- Convertis les dates lisibles au format YYYY-MM-DD. Si l'année est absente, utilise l'année la plus probable autour de ${today} et ajoute une remarque dans warnings.
- N'extrais pas les soldes, plafonds, totaux, numéros de carte ou informations personnelles comme des opérations.
- Si une date, un montant ou un libellé est incertain, omets la ligne et explique pourquoi dans warnings.
- Réponds uniquement avec le JSON demandé, sans Markdown.

Retourne cet objet :
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "libellé court",
      "amount": 0,
      "direction": "expense",
      "category": "catégorie probable en français",
      "confidence": 0.0
    }
  ],
  "summary": "résumé très court",
  "warnings": ["remarque éventuelle"]
}
`;
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée.' });
  const rate = consumeRateLimit(req);
  if (!rate.allowed) {
    res.setHeader?.('Retry-After', String(rate.retryAfter));
    return res.status(429).json({ error: 'Trop de demandes. Réessayez dans quelques minutes.' });
  }

  try {
    const authorization = headerValue(req.headers.authorization);
    if (!authorization?.startsWith('Bearer '))
      return res.status(401).json({ error: 'Session Firebase requise.' });
    if (!(await verifyFirebaseToken(authorization.slice('Bearer '.length))))
      return res.status(401).json({ error: 'Session Firebase invalide.' });

    const payload = jsonBody(req.body);
    const image = typeof payload.image === 'string' ? payload.image : '';
    const mimeType = typeof payload.mimeType === 'string' ? payload.mimeType : '';
    if (!image || !/^image\/(jpeg|png|webp|heic|heif)$/i.test(mimeType))
      return res.status(400).json({ error: 'Ajoutez une image JPG, PNG, WebP ou HEIC.' });
    if (image.length > MAX_IMAGE_BYTES * 1.4)
      return res
        .status(413)
        .json({ error: 'Cette image est trop volumineuse. Choisissez une capture plus légère.' });

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey)
      return res
        .status(503)
        .json({ error: 'L’analyse IA n’est pas encore configurée dans Vercel.' });

    const requestBody = JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { inline_data: { mime_type: mimeType, data: image } },
            { text: promptForToday() },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            transactions: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  date: { type: 'STRING' },
                  description: { type: 'STRING' },
                  amount: { type: 'NUMBER' },
                  direction: { type: 'STRING', enum: ['expense', 'income'] },
                  category: { type: 'STRING' },
                  confidence: { type: 'NUMBER' },
                },
                required: ['date', 'description', 'amount', 'direction', 'category', 'confidence'],
              },
            },
            summary: { type: 'STRING' },
            warnings: { type: 'ARRAY', items: { type: 'STRING' } },
          },
          required: ['transactions', 'summary', 'warnings'],
        },
      },
    });
    let response: Response | undefined;
    let result:
      | {
          error?: { message?: string };
          candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
        }
      | undefined;
    const models = [...new Set([MODEL, ...MODEL_FALLBACKS])];
    let usedModel = MODEL;
    for (const model of models) {
      usedModel = model;
      response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': geminiKey,
          },
          body: requestBody,
        },
        GEMINI_TIMEOUT_MS,
      );
      result = (await response.json()) as {
        error?: { message?: string };
        candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
      };
      if (response.ok || ![400, 403, 404].includes(response.status)) break;
    }
    if (!response || !result || !response.ok) {
      console.error(
        JSON.stringify({
          event: 'nivo_ai_provider_error',
          status: response?.status,
          attemptedModels: models,
          providerMessage: result?.error?.message?.slice(0, 240) || 'unknown',
        }),
      );
      return res.status(502).json({ error: providerError(response?.status) });
    }

    const text = result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('');
    if (!text)
      return res.status(502).json({ error: 'L’IA n’a trouvé aucune opération exploitable.' });
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleanJson(text)) as Record<string, unknown>;
    } catch {
      console.error(JSON.stringify({ event: 'nivo_ai_invalid_provider_json' }));
      return res.status(502).json({ error: 'La réponse du service IA est invalide.' });
    }
    const transactions = Array.isArray(parsed.transactions)
      ? parsed.transactions
          .slice(0, 100)
          .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object'))
          .map((row) => ({
            date: typeof row.date === 'string' ? row.date : '',
            description:
              typeof row.description === 'string' ? row.description.trim().slice(0, 200) : '',
            amount: typeof row.amount === 'number' ? Math.abs(row.amount) : Number(row.amount),
            direction: row.direction === 'income' ? 'income' : 'expense',
            category:
              typeof row.category === 'string' ? row.category.trim().slice(0, 100) : 'Autre',
            confidence:
              typeof row.confidence === 'number' ? Math.max(0, Math.min(1, row.confidence)) : 0,
          }))
          .filter(
            (row) =>
              /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
              row.description.length > 0 &&
              Number.isFinite(row.amount) &&
              row.amount > 0,
          )
      : [];
    return res.status(200).json({
      transactions,
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      warnings: Array.isArray(parsed.warnings)
        ? parsed.warnings
            .filter((warning): warning is string => typeof warning === 'string')
            .slice(0, 8)
        : [],
      model: usedModel,
    });
  } catch (cause) {
    console.error(
      JSON.stringify({
        event: 'nivo_ai_request_error',
        error: cause instanceof Error ? cause.message.slice(0, 240) : 'unknown',
      }),
    );
    return res.status(500).json({
      error: 'Analyse impossible pour le moment. Réessayez dans quelques instants.',
    });
  }
}
