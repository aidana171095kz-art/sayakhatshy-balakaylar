import { SignJWT, jwtVerify } from 'jose';

// Сессия токені (подписанный JWT, httpOnly cookie ішінде).
// Бұл файл базаға тимейді — proxy.ts ішінде де қолданылады.

export const SESSION_COOKIE = 'tf_session';
export const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12 сағат

export interface SessionPayload {
  sub: string; // admin id
  role: 'OWNER' | 'MANAGER';
  v: number; // tokenVersion
  pw: boolean; // парольді ауыстыру міндетті (бірінші кіру)
}

function key(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error('AUTH_SECRET берілмеген немесе тым қысқа');
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role, v: payload.v, pw: payload.pw })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    if (typeof payload.sub !== 'string') return null;
    if (payload.role !== 'OWNER' && payload.role !== 'MANAGER') return null;
    if (typeof payload.v !== 'number') return null;
    return { sub: payload.sub, role: payload.role, v: payload.v, pw: payload.pw === true };
  } catch {
    return null;
  }
}
