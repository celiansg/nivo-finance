type ErrorContext = {
  source: string;
  message: string;
  stack?: string;
};

const MAX_FIELD_LENGTH = 500;

function redact(value: string) {
  return value
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/\b\d{8,}\b/g, '[number]')
    .slice(0, MAX_FIELD_LENGTH);
}

export function reportClientError(context: ErrorContext) {
  const payload = JSON.stringify({
    source: redact(context.source),
    message: redact(context.message || 'Erreur inconnue'),
    stack: context.stack ? redact(context.stack) : undefined,
    path: `${window.location.pathname}${window.location.hash.slice(0, 120)}`,
    occurred_at: new Date().toISOString(),
  });

  console.error('[Nivo]', context.source, context.message);
  if (!window.location.hostname.endsWith('vercel.app')) return;
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        '/api/client-errors',
        new Blob([payload], { type: 'application/json' }),
      );
      return;
    }
    void fetch('/api/client-errors', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Error reporting must never interrupt the application.
  }
}
