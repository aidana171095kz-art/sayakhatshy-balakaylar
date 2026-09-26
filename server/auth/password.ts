import bcrypt from 'bcryptjs';
import { z } from 'zod';

const COST = 12;

export const passwordSchema = z
  .string()
  .min(10, 'Пароль должен быть не короче 10 символов')
  .max(128, 'Пароль слишком длинный')
  .refine((p) => /[A-Za-zА-Яа-яӘәҒғҚқҢңӨөҰұҮүҺһІі]/.test(p) && /\d/.test(p), {
    message: 'Пароль должен содержать буквы и цифры',
  });

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Жоқ email үшін де bcrypt орындаймыз — жауап уақыты арқылы email бар-жоғын білуге болмайды.
let dummyHash: Promise<string> | undefined;
export async function verifyAgainstDummy(plain: string): Promise<false> {
  dummyHash ??= bcrypt.hash('timing-equalizer', COST);
  await bcrypt.compare(plain, await dummyHash);
  return false;
}
