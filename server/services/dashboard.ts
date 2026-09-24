import { prisma } from '../db';
import { productLabel } from './products';
import { getLowStockThreshold } from './settings';
import { OPEN_STATUSES } from './supplies';
import { effectiveThreshold, stockLevel } from './stock';

export type Period = 'today' | 'week' | 'month';

// Қазақстан уақыты — UTC+5 (2024 жылдан бүкіл ел бойынша).
const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;

/** Кезеңнің басы (Астана уақытымен): бүгін 00:00 / дүйсенбі 00:00 / айдың 1-і 00:00. */
export function periodStart(period: Period, now = new Date()): Date {
  const local = new Date(now.getTime() + TZ_OFFSET_MS);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();
  let startLocal: number;
  if (period === 'today') startLocal = Date.UTC(y, m, d);
  else if (period === 'week') {
    const weekday = (local.getUTCDay() + 6) % 7; // дүйсенбі = 0
    startLocal = Date.UTC(y, m, d - weekday);
  } else startLocal = Date.UTC(y, m, 1);
  return new Date(startLocal - TZ_OFFSET_MS);
}

export async function getStockAlerts() {
  const [threshold, products] = await Promise.all([
    getLowStockThreshold(),
    prisma.product.findMany({
      where: { status: 'ACTIVE' },
      include: { stock: true, category: true },
      orderBy: { name: 'asc' },
    }),
  ]);
  const rows = products.map((p) => {
    const available = p.stock?.availableQuantity ?? 0;
    const t = effectiveThreshold(p.stock?.lowStockThreshold, threshold);
    return { id: p.id, label: productLabel(p), emoji: p.category.emoji, available, threshold: t, saleUnit: p.saleUnit, level: stockLevel(available, t) };
  });
  return {
    activeProducts: products.length,
    low: rows.filter((r) => r.level === 'LOW'),
    out: rows.filter((r) => r.level === 'OUT'),
  };
}

export async function getDashboard(period: Period, now = new Date()) {
  const since = periodStart(period, now);
  const [alerts, activeSupplies, nextSupply, newOrders, preorders, newCustomers, monobouquets] = await Promise.all([
    getStockAlerts(),
    prisma.supply.count({ where: { status: { in: [...OPEN_STATUSES, 'ARRIVED'] } } }),
    prisma.supply.findFirst({
      where: { status: { in: OPEN_STATUSES } },
      orderBy: { expectedDate: 'asc' },
      select: { id: true, title: true, expectedDate: true, preorderOpen: true },
    }),
    prisma.order.count({ where: { createdAt: { gte: since }, status: { not: 'CANCELLED' } } }),
    prisma.preOrder.count({ where: { createdAt: { gte: since }, status: { not: 'CANCELLED' } } }),
    prisma.customer.count({ where: { createdAt: { gte: since } } }),
    prisma.monobouquetRequest.count({ where: { createdAt: { gte: since }, status: { not: 'CANCELLED' } } }),
  ]);
  return { since, alerts, activeSupplies, nextSupply, newOrders, preorders, newCustomers, monobouquets };
}
