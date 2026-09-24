import { prisma } from '../db';

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row ? (row.value as T) : fallback;
}

export async function getLowStockThreshold(): Promise<number> {
  const v = await getSetting<number>('low_stock_threshold', 3);
  return Number.isInteger(v) && v >= 0 ? v : 3;
}
