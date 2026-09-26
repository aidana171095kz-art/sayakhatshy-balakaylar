'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/server/db';
import { verifyAgainstDummy, verifyPassword } from '@/server/auth/password';
import { isLoginBlocked, recordLoginAttempt } from '@/server/auth/rate-limit';
import { clientIp, createSession } from '@/server/auth/session';
import { logger } from '@/server/logger';

export interface LoginState {
  error?: string;
  email?: string;
}

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(128),
});

const GENERIC_ERROR = 'Неверный email или пароль.';

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({ email: formData.get('email'), password: formData.get('password') });
  if (!parsed.success) return { error: GENERIC_ERROR, email: String(formData.get('email') ?? '').slice(0, 200) };
  const { email, password } = parsed.data;
  const ip = await clientIp();

  if (await isLoginBlocked(email, ip)) {
    logger.warn('login blocked by rate limit', { ip });
    return { error: 'Слишком много неудачных попыток. Повторите через 15 минут.', email };
  }

  const admin = await prisma.admin.findUnique({ where: { email } });
  const ok = admin && admin.isActive ? await verifyPassword(password, admin.passwordHash) : await verifyAgainstDummy(password);
  await recordLoginAttempt(email, ip, Boolean(ok));

  if (!ok || !admin) return { error: GENERIC_ERROR, email };

  await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  await createSession(admin);
  redirect(admin.mustChangePassword ? '/admin/account' : '/admin');
}
