import type { MonobouquetStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db';
import { nextNumber } from './numbers';
import { customerInputSchema, upsertCustomer } from './preorders';

// Монобукет 1-нұсқада — жеке сұраныс. Менеджер клиентпен байланысады, бағаны қолмен қояды.
// Қалдыққа автоматты әсер ЖОҚ.

export class MonobouquetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MonobouquetError';
  }
}

export const MONO_TRANSITIONS: Record<MonobouquetStatus, MonobouquetStatus[]> = {
  NEW: ['CONTACTED', 'CONFIRMED', 'CANCELLED'],
  CONTACTED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

const optionalText = (max: number) =>
  z.preprocess((v) => (v == null || (typeof v === 'string' && v.trim() === '') ? null : v), z.string().trim().max(max).nullable());
const optionalInt = (min: number, max: number, msg: string) =>
  z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.number().int(msg).min(min, msg).max(max, msg).nullable());

export const monobouquetInputSchema = z.object({
  customer: customerInputSchema,
  categoryId: optionalText(40),
  flowerNote: optionalText(200),
  stemCount: optionalInt(1, 10000, 'Количество — целое число больше 0'),
  size: optionalText(40),
  wrapping: optionalText(40),
  neededBy: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.date().nullable()),
  comment: optionalText(1000),
});

export async function createMonobouquetRequest(raw: unknown, opts: { adminId?: string } = {}) {
  const input = monobouquetInputSchema.parse(raw);
  if (!input.categoryId && !input.flowerNote) throw new MonobouquetError('Укажите цветок');
  return prisma.$transaction(async (tx) => {
    const customer = await upsertCustomer(tx, input.customer);
    const req = await tx.monobouquetRequest.create({
      data: {
        number: await nextNumber(tx, 'monobouquet'),
        customerId: customer.id,
        categoryId: input.categoryId,
        flowerNote: input.flowerNote,
        stemCount: input.stemCount,
        size: input.size,
        wrapping: input.wrapping,
        neededBy: input.neededBy,
        comment: input.comment,
      },
    });
    await tx.auditLog.create({ data: { adminId: opts.adminId, action: 'MONOBOUQUET_CREATED', entity: 'MonobouquetRequest', entityId: req.id } });
    return req;
  });
}

export const monobouquetUpdateSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED']),
  quotedPrice: optionalInt(0, 100_000_000, 'Цена — целое число ₸'),
  comment: optionalText(1000),
});

export async function updateMonobouquet(id: string, raw: unknown, adminId: string) {
  const input = monobouquetUpdateSchema.parse(raw);
  return prisma.$transaction(async (tx) => {
    const req = await tx.monobouquetRequest.findUnique({ where: { id } });
    if (!req) throw new MonobouquetError('Запрос не найден');
    if (input.status !== req.status && !MONO_TRANSITIONS[req.status].includes(input.status)) {
      throw new MonobouquetError(`Нельзя изменить статус ${req.status} → ${input.status}`);
    }
    if (MONO_TRANSITIONS[req.status].length === 0 && input.quotedPrice !== req.quotedPrice) {
      throw new MonobouquetError('Запрос уже закрыт');
    }
    if (input.status === 'CONFIRMED' && input.quotedPrice === null) {
      throw new MonobouquetError('Перед подтверждением укажите цену');
    }
    const priceChanged = input.quotedPrice !== req.quotedPrice;
    const updated = await tx.monobouquetRequest.update({
      where: { id },
      data: {
        status: input.status,
        comment: input.comment,
        quotedPrice: input.quotedPrice,
        ...(priceChanged && { quotedById: adminId, quotedAt: new Date() }),
      },
    });
    await tx.auditLog.create({
      data: { adminId, action: 'MONOBOUQUET_UPDATED', entity: 'MonobouquetRequest', entityId: id, diff: input },
    });
    return updated;
  });
}

export function listMonobouquets(status?: MonobouquetStatus) {
  return prisma.monobouquetRequest.findMany({
    where: status ? { status } : undefined,
    include: { customer: true, category: true, quotedBy: { select: { email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}
