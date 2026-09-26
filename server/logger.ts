// JSON логтар. Құпия өрістер ешқашан логқа түспейді.

const SECRET_KEY = /token|secret|password|passwd|authorization|cookie|signature|api[-_]?key/i;
const BEARER = /Bearer\s+[A-Za-z0-9._\-]+/g;
const URL_TOKEN = /(access_token=)[^&\s]+/gi;

/** 77011234567 → 7701***4567 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return '***';
  return `${digits.slice(0, 4)}***${digits.slice(-4)}`;
}

function redactString(s: string): string {
  return s.replace(BEARER, 'Bearer [REDACTED]').replace(URL_TOKEN, '$1[REDACTED]');
}

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[depth]';
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value instanceof Error) {
    return { name: value.name, message: redactString(value.message) };
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SECRET_KEY.test(k) ? '[REDACTED]' : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

type Level = 'debug' | 'info' | 'warn' | 'error';

function write(level: Level, msg: string, data?: Record<string, unknown>) {
  if (level === 'debug' && process.env.NODE_ENV === 'production') return;
  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    msg: redactString(msg),
    ...(data ? (redact(data) as Record<string, unknown>) : {}),
  });
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => write('debug', msg, data),
  info: (msg: string, data?: Record<string, unknown>) => write('info', msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => write('warn', msg, data),
  error: (msg: string, data?: Record<string, unknown>) => write('error', msg, data),
};
