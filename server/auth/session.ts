import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Admin, AdminRole } from '@prisma/client';
import { prisma } from '../db';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession } from './token';

export type SessionAdmin = Pick<Admin, 'id' | 'email' | 'name' | 'role' | 'mustChangePassword'>;

export async function createSession(admin: Pick<Admin, 'id' | 'role' | 'tokenVersion' | 'mustChangePassword'>) {
  const token = await signSession({
    sub: admin.id,
    role: admin.role,
    v: admin.tokenVersion,
    pw: admin.mustChangePassword,
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Cookie + база бойынша тексеру: админ белсенді ме, пароль ауыспаған ба. */
export async function getCurrentAdmin(): Promise<SessionAdmin | null> {
  const payload = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  const admin = await prisma.admin.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true, role: true, isActive: true, tokenVersion: true, mustChangePassword: true },
  });
  if (!admin || !admin.isActive || admin.tokenVersion !== payload.v) return null;
  return { id: admin.id, email: admin.email, name: admin.name, role: admin.role, mustChangePassword: admin.mustChangePassword };
}

/**
 * Әр admin бетінде және әр server action-да шақырылады.
 * roles берілсе — тек сол рөлдерге рұқсат.
 */
export async function requireAdmin(roles?: AdminRole[]): Promise<SessionAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect('/login');
  if (roles && !roles.includes(admin.role)) redirect('/admin?denied=1');
  return admin;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}
