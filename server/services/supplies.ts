import type { Prisma, SupplyStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db';
import { applyMovement } from './stock';

// Поставка циклі:
//   PLANNED ──(предзаказ ашу)──► PREORDER_OPEN ──► IN_TRANSIT ──(Поставка пришла)──► ARRIVED ──► COMPLETED
//      └─────────────────────────────────────────► IN_TRANSIT
//   PLANNED / PREORDER_OPEN / IN_TRANSIT ──► CANCELLED
//
// Предзаказ ашық па — `preorderOpen` өрісі (бот тек соған қарайды).
// Предзаказды PLANNED, PREORDER_OPEN немесе IN_TRANSIT кезінде ашуға болады.

export class SupplyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupplyError';
  }
}

/** Поставка келгенге дейінгі статустар: позицияларды өзгертуге, предзаказ ашуға болады. */
export const OPEN_STATUSES: SupplyStatus[] = ['PLANNED', 'PREORDER_OPEN', 'IN_TRANSIT'];

export type SupplyAction = 'OPEN_PREORDER' | 'CLOSE_PREORDER' | 'IN_TRANSIT' | 'ARRIVE' | 'COMPLETE' | 'CANCEL';

/** Қай статуста қандай әрекет рұқсат етілген (UI батырмалары да осыған қарайды). */
export function allowedActions(status: SupplyStatus, preorderOpen: boolean): SupplyAction[] {
  const actions: SupplyAction[] = [];
  if (OPEN_STATUSES.includes(status)) {
    actions.push(preorderOpen ? 'CLOSE_PREORDER' : 'OPEN_PREORDER');
    if (status !== 'IN_TRANSIT') actions.push('IN_TRANSIT');
    actions.push('ARRIVE', 'CANCEL');
  }
  if (status === 'ARRIVED') actions.push('COMPLETE');
  return actions;
}

function assertAction(supply: { status: SupplyStatus; preorderOpen: boolean }, action: SupplyAction) {
  if (!allowedActions(supply.status, supply.preorderOpen).includes(action)) {
    throw new SupplyError(`Действие недоступно для поставки в статусе ${supply.status}`);
  }
}

// ───────── Валидация ─────────

export const supplyInputSchema = z.object({
  title: z.string().trim().min(1, 'Укажите название поставки').max(100),
  expectedDate: z.coerce.date({ errorMap: () => ({ message: 'Укажите дату поставки' }) }),
  notes: z.preprocess((v) => (v == null || (typeof v === 'string' && v.trim() === '') ? null : v), z.string().trim().max(1000).nullable()),
});

export const supplyItemInputSchema = z.object({
  productId: z.string().min(1, 'Выберите товар'),
  expectedQty: z.coerce.number().int('Количество — целое число').min(1, 'Количество — больше 0').max(100000),
  preorderLimit: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.coerce.number().int().min(0, 'Лимит — от 0').max(100000).nullable(),
  ),
});

// ───────── Поставка ─────────

export async function createSupply(raw: unknown, adminId: string) {
  const input = supplyInputSchema.parse(raw);
  const supply = await prisma.supply.create({ data: input });
  await prisma.auditLog.create({ data: { adminId, action: 'SUPPLY_CREATED', entity: 'Supply', entityId: supply.id } });
  return supply;
}

export async function updateSupply(supplyId: string, raw: unknown, adminId: string) {
  const input = supplyInputSchema.parse(raw);
  const supply = await prisma.supply.findUniqueOrThrow({ where: { id: supplyId } });
  if (!OPEN_STATUSES.includes(supply.status)) throw new SupplyError('Поставку уже нельзя изменить');
  const updated = await prisma.supply.update({ where: { id: supplyId }, data: input });
  await prisma.auditLog.create({ data: { adminId, action: 'SUPPLY_UPDATED', entity: 'Supply', entityId: supplyId } });
  return updated;
}

// ───────── Позициялар ─────────

async function assertEditable(supplyId: string) {
  const supply = await prisma.supply.findUnique({ where: { id: supplyId } });
  if (!supply) throw new SupplyError('Поставка не найдена');
  if (!OPEN_STATUSES.includes(supply.status)) throw new SupplyError('Позиции можно менять только до прихода поставки');
  return supply;
}

export async function addSupplyItem(supplyId: string, raw: unknown, adminId: string) {
  const input = supplyItemInputSchema.parse(raw);
  await assertEditable(supplyId);
  const product = await prisma.product.findUnique({ where: { id: input.productId } });
  if (!product) throw new SupplyError('Товар не найден');
  const exists = await prisma.supplyItem.findUnique({ where: { supplyId_productId: { supplyId, productId: input.productId } } });
  if (exists) throw new SupplyError('Этот товар уже есть в поставке — измените количество в списке');
  const item = await prisma.supplyItem.create({ data: { supplyId, ...input } });
  await prisma.auditLog.create({ data: { adminId, action: 'SUPPLY_ITEM_ADDED', entity: 'Supply', entityId: supplyId, diff: input } });
  return item;
}

export async function updateSupplyItem(itemId: string, raw: unknown, adminId: string) {
  const input = supplyItemInputSchema.omit({ productId: true }).parse(raw);
  const item = await prisma.supplyItem.findUniqueOrThrow({ where: { id: itemId } });
  await assertEditable(item.supplyId);
  if (input.preorderLimit !== null) {
    const booked = await preorderedQty(item.supplyId, item.productId);
    if (input.preorderLimit < booked) {
      throw new SupplyError(`Лимит меньше уже принятых предзаказов (${booked})`);
    }
  }
  const updated = await prisma.supplyItem.update({ where: { id: itemId }, data: input });
  await prisma.auditLog.create({ data: { adminId, action: 'SUPPLY_ITEM_UPDATED', entity: 'Supply', entityId: item.supplyId, diff: input } });
  return updated;
}

export async function removeSupplyItem(itemId: string, adminId: string) {
  const item = await prisma.supplyItem.findUniqueOrThrow({ where: { id: itemId } });
  await assertEditable(item.supplyId);
  if ((await preorderedQty(item.supplyId, item.productId)) > 0) {
    throw new SupplyError('На эту позицию есть предзаказы — сначала отмените их');
  }
  await prisma.supplyItem.delete({ where: { id: itemId } });
  await prisma.auditLog.create({ data: { adminId, action: 'SUPPLY_ITEM_REMOVED', entity: 'Supply', entityId: item.supplyId } });
}

// ───────── Статус әрекеттері ─────────

export async function openPreorder(supplyId: string, adminId: string) {
  const supply = await prisma.supply.findUniqueOrThrow({ where: { id: supplyId }, include: { _count: { select: { items: true } } } });
  assertAction(supply, 'OPEN_PREORDER');
  if (supply._count.items === 0) throw new SupplyError('Сначала добавьте товары в поставку');
  const updated = await prisma.supply.update({
    where: { id: supplyId },
    data: { preorderOpen: true, status: supply.status === 'PLANNED' ? 'PREORDER_OPEN' : supply.status },
  });
  await prisma.auditLog.create({ data: { adminId, action: 'PREORDER_OPENED', entity: 'Supply', entityId: supplyId } });
  return updated;
}

export async function closePreorder(supplyId: string, adminId: string) {
  const supply = await prisma.supply.findUniqueOrThrow({ where: { id: supplyId } });
  assertAction(supply, 'CLOSE_PREORDER');
  const updated = await prisma.supply.update({
    where: { id: supplyId },
    data: { preorderOpen: false, status: supply.status === 'PREORDER_OPEN' ? 'PLANNED' : supply.status },
  });
  await prisma.auditLog.create({ data: { adminId, action: 'PREORDER_CLOSED', entity: 'Supply', entityId: supplyId } });
  return updated;
}

export async function markInTransit(supplyId: string, adminId: string) {
  const supply = await prisma.supply.findUniqueOrThrow({ where: { id: supplyId } });
  assertAction(supply, 'IN_TRANSIT');
  const updated = await prisma.supply.update({ where: { id: supplyId }, data: { status: 'IN_TRANSIT' } });
  await prisma.auditLog.create({ data: { adminId, action: 'SUPPLY_IN_TRANSIT', entity: 'Supply', entityId: supplyId } });
  return updated;
}

export const receiveSchema = z.array(
  z.object({
    itemId: z.string().min(1),
    receivedQty: z.coerce.number({ invalid_type_error: 'Укажите, сколько пришло' }).int('Целое число').min(0, 'Не может быть меньше 0').max(100000),
  }),
);

/**
 * «Поставка пришла». Әр позиция бойынша НАҚТЫ келген санды админ енгізеді —
 * қалдыққа тек сол сан қосылады (Заказано саны ешқашан автоматты қосылмайды).
 * Бір рет қана орындалады: статус ARRIVED болғаннан кейін қайта басу қате береді.
 */
export async function receiveSupply(supplyId: string, raw: unknown, adminId: string) {
  const received = receiveSchema.parse(raw);
  return prisma.$transaction(async (tx) => {
    const supply = await tx.supply.findUnique({ where: { id: supplyId }, include: { items: true } });
    if (!supply) throw new SupplyError('Поставка не найдена');
    assertAction(supply, 'ARRIVE');
    if (supply.items.length === 0) throw new SupplyError('В поставке нет товаров');

    const byItem = new Map(received.map((r) => [r.itemId, r.receivedQty]));
    const missing = supply.items.filter((i) => !byItem.has(i.id));
    if (missing.length) throw new SupplyError('Укажите фактическое количество для каждой позиции (0, если не пришло)');
    for (const id of byItem.keys()) {
      if (!supply.items.some((i) => i.id === id)) throw new SupplyError('Позиция не относится к этой поставке');
    }

    // Қатар екі рет басылса — біреуі ғана өтеді.
    const cas = await tx.supply.updateMany({
      where: { id: supplyId, status: supply.status },
      data: { status: 'ARRIVED', preorderOpen: false, arrivedAt: new Date() },
    });
    if (cas.count !== 1) throw new SupplyError('Поставку только что изменил другой пользователь. Обновите страницу.');

    let totalIn = 0;
    for (const item of supply.items) {
      const qty = byItem.get(item.id)!;
      await tx.supplyItem.update({ where: { id: item.id }, data: { receivedQty: qty } });
      if (qty > 0) {
        await applyMovement(tx, {
          productId: item.productId,
          type: 'SUPPLY_IN',
          reason: 'RECEIPT',
          quantity: qty,
          supplyId,
          adminId,
          note: `${supply.title ?? 'Поставка'}: заказано ${item.expectedQty ?? '—'}, пришло ${qty}`,
        });
        totalIn += qty;
      }
    }
    await tx.auditLog.create({
      data: { adminId, action: 'SUPPLY_ARRIVED', entity: 'Supply', entityId: supplyId, diff: { received, totalIn } },
    });
    return tx.supply.findUniqueOrThrow({ where: { id: supplyId } });
  });
}

export async function completeSupply(supplyId: string, adminId: string) {
  const supply = await prisma.supply.findUniqueOrThrow({ where: { id: supplyId } });
  assertAction(supply, 'COMPLETE');
  const updated = await prisma.supply.update({ where: { id: supplyId }, data: { status: 'COMPLETED' } });
  await prisma.auditLog.create({ data: { adminId, action: 'SUPPLY_COMPLETED', entity: 'Supply', entityId: supplyId } });
  return updated;
}

/** Поставканы болдырмау — оның белсенді предзаказдары да болдырылмайды. */
export async function cancelSupply(supplyId: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const supply = await tx.supply.findUniqueOrThrow({ where: { id: supplyId } });
    assertAction(supply, 'CANCEL');
    const cas = await tx.supply.updateMany({
      where: { id: supplyId, status: supply.status },
      data: { status: 'CANCELLED', preorderOpen: false },
    });
    if (cas.count !== 1) throw new SupplyError('Поставку только что изменил другой пользователь. Обновите страницу.');
    const cancelled = await tx.preOrder.updateMany({
      where: { supplyId, status: { in: ['NEW', 'CONFIRMED'] } },
      data: { status: 'CANCELLED' },
    });
    await tx.auditLog.create({
      data: { adminId, action: 'SUPPLY_CANCELLED', entity: 'Supply', entityId: supplyId, diff: { preordersCancelled: cancelled.count } },
    });
    return { cancelledPreorders: cancelled.count };
  });
}

// ───────── Оқу ─────────

const ACTIVE_PREORDER: Prisma.PreOrderWhereInput = { status: { in: ['NEW', 'CONFIRMED'] } };

export async function preorderedQty(supplyId: string, productId: string): Promise<number> {
  const agg = await prisma.preOrderItem.aggregate({
    where: { productId, preOrder: { supplyId, ...ACTIVE_PREORDER } },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}

/** Әр тауар бойынша белсенді предзаказ саны (supplyId → productId → qty). */
export async function preorderTotals(supplyIds: string[]) {
  const rows = await prisma.preOrderItem.findMany({
    where: { preOrder: { supplyId: { in: supplyIds }, ...ACTIVE_PREORDER } },
    select: { productId: true, quantity: true, preOrder: { select: { supplyId: true } } },
  });
  const out = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const bySupply = out.get(r.preOrder.supplyId) ?? new Map<string, number>();
    bySupply.set(r.productId, (bySupply.get(r.productId) ?? 0) + r.quantity);
    out.set(r.preOrder.supplyId, bySupply);
  }
  return out;
}

export function listSupplies() {
  return prisma.supply.findMany({
    orderBy: [{ expectedDate: 'desc' }, { createdAt: 'desc' }],
    include: {
      items: { select: { expectedQty: true, receivedQty: true } },
      _count: { select: { preOrders: { where: ACTIVE_PREORDER } } },
    },
  });
}

export function getSupply(supplyId: string) {
  return prisma.supply.findUnique({
    where: { id: supplyId },
    include: {
      items: { include: { product: { include: { stock: true, category: true } } }, orderBy: { product: { name: 'asc' } } },
      preOrders: {
        include: { customer: true, items: { include: { product: true } }, order: { select: { id: true, number: true, status: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

/** Бот үшін: предзаказ ашық, ең жақын поставка. */
export function nextOpenSupply() {
  return prisma.supply.findFirst({
    where: { preorderOpen: true, status: { in: OPEN_STATUSES } },
    orderBy: { expectedDate: 'asc' },
    include: { items: { include: { product: true } } },
  });
}
