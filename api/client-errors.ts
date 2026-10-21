type RequestLike = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type ResponseLike = {
  status: (code: number) => ResponseLike;
  json: (body: unknown) => void;
};

const MAX_BODY_LENGTH = 4_000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_EVENTS = 20;
const counters = new Map<string, { count: number; resetAt: number }>();

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function key(req: RequestLike) {
  return (
    headerValue(req.headers['x-forwarded-for'])?.split(',')[0]?.trim() ||
    headerValue(req.headers['x-real-ip']) ||
    'unknown'
  );
}

function readBody(body: unknown) {
  const text = typeof body === 'string' ? body : JSON.stringify(body ?? {});
  if (text.length > MAX_BODY_LENGTH) throw new Error('payload_too_large');
  return JSON.parse(text) as Record<string, unknown>;
}

function redact(value: string) {
  return value
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/\b\d{8,}\b/g, '[number]')
    .slice(0, 500);
}

export default function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée.' });
  const now = Date.now();
  for (const [visitorId, counter] of counters) {
    if (counter.resetAt <= now) counters.delete(visitorId);
  }
  const visitor = key(req);
  const previous = counters.get(visitor);
  if (!previous || previous.resetAt <= now) counters.set(visitor, { count: 1, resetAt: now + WINDOW_MS });
  else if (++previous.count > MAX_EVENTS) return res.status(204).json({});

  try {
    const payload = readBody(req.body);
    const source = typeof payload.source === 'string' ? redact(payload.source).slice(0, 80) : 'unknown';
    const message = typeof payload.message === 'string' ? redact(payload.message) : 'unknown';
    console.error(
      JSON.stringify({
        event: 'nivo_client_error',
        source,
        message,
        path: typeof payload.path === 'string' ? redact(payload.path).slice(0, 160) : undefined,
        occurred_at: typeof payload.occurred_at === 'string' ? payload.occurred_at : undefined,
      }),
    );
  } catch {
    return res.status(400).json({ error: 'Événement invalide.' });
  }
  return res.status(204).json({});
}
