'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/server/db';
import { hashPassword, passwordSchema, verifyPassword } from '@/server/auth/password';
import { createSession, destroySession, requireAdmin } from '@/server/auth/session';

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}

export interface ChangePasswordState {
  error?: string;
}

const changeSchema = z
  .object({
    current: z.string().min(1, 'Введите текущий пароль'),
    next: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: 'Новые пароли не совпадают', path: ['confirm'] })
  .refine((v) => v.next !== v.current, { message: 'Новый пароль должен отличаться от старого', path: ['next'] });

export async function changePasswordAction(_prev: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const session = await requireAdmin();
  const parsed = changeSchema.safeParse({
    current: formData.get('current'),
    next: formData.get('next'),
    confirm: formData.get('confirm'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Ошибка' };

  const admin = await prisma.admin.findUniqueOrThrow({ where: { id: session.id } });
  if (!(await verifyPassword(parsed.data.current, admin.passwordHash))) {
    return { error: 'Текущий пароль неверный' };
  }

  const updated = await prisma.admin.update({
    where: { id: admin.id },
    data: {
      passwordHash: await hashPassword(parsed.data.next),
      mustChangePassword: false,
      tokenVersion: { increment: 1 }, // басқа құрылғылардағы ескі сессиялар өшеді
    },
  });
  await prisma.auditLog.create({ data: { adminId: admin.id, action: 'PASSWORD_CHANGED', entity: 'Admin', entityId: admin.id } });
  await createSession(updated);
  redirect('/admin?pw=changed');
}
