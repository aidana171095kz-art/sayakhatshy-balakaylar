import { prisma } from '../db';

// Логин әрекеттерін шектеу. Базада сақталады — Vercel-де бірнеше сервер данасы болса да дұрыс жұмыс істейді.

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS_PER_EMAIL = 5;
const MAX_FAILS_PER_IP = 20;

export async function isLoginBlocked(email: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const [byEmail, byIp] = await Promise.all([
    prisma.loginAttempt.count({ where: { key: `email:${email}`, success: false, createdAt: { gte: since } } }),
    prisma.loginAttempt.count({ where: { key: `ip:${ip}`, success: false, createdAt: { gte: since } } }),
  ]);
  return byEmail >= MAX_FAILS_PER_EMAIL || byIp >= MAX_FAILS_PER_IP;
}

export async function recordLoginAttempt(email: string, ip: string, success: boolean) {
  await prisma.loginAttempt.createMany({
    data: [
      { key: `email:${email}`, success },
      { key: `ip:${ip}`, success },
    ],
  });
  // Ескі жазбаларды тазалау (1 тәуліктен ескі)
  if (Math.random() < 0.05) {
    await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 86_400_000) } } });
  }
}
