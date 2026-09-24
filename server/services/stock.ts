import { Prisma, type OrderStatus, type StockMoveType } from '@prisma/client';
import { prisma, type Tx } from '../db';
import { planTransition } from './order-status';

// Қалдық үш санмен есептеледі:
//   physicalQuantity  — қоймада нақты тұрған
//   reservedQuantity  — CONFIRMED тапсырыстарға бронь
//   availableQuantity — сатуға бос (бот тек осыны көрсетеді)
// Инвариант physical = reserved + available және бәрі >= 0 — базада CHECK арқылы да қорғалған.
//
// Әр өзгеріс бір UPDATE сұранысымен, шартпен орындалады (мыс. "available >= q"),
// сондықтан екі менеджер бір уақытта басса да қалдық теріс болмайды.

export class InsufficientStockError extends Error {
  constructor(
    public readonly productId: string,
    public readonly movement: StockMoveType,
    public readonly quantity: number,
  ) {
    super(`Недостаточно остатка (товар ${productId}, ${movement}, ${quantity})`);
    this.name = 'InsufficientStockError';
  }
}

export class ConcurrentUpdateError extends Error {
  constructor() {
    super('Заказ только что изменил другой пользователь. Обновите страницу и повторите.');
    this.name = 'ConcurrentUpdateError';
  }
}

type Delta = { physical: number; reserved: number; available: number };

const EFFECT: Record<StockMoveType, Delta> = {
  SUPPLY_IN: { physical: +1, reserved: 0, available: +1 },
  RESERVE: { physical: 0, reserved: +1, available: -1 },
  RELEASE: { physical: 0, reserved: -1, available: +1 },
  SALE_OUT: { physical: -1, reserved: -1, available: 0 },
  RETURN_IN: { physical: +1, reserved: 0, available: +1 },
  ADJUSTMENT_IN: { physical: +1, reserved: 0, available: +1 },
  ADJUSTMENT_OUT: { physical: -1, reserved: 0, available: -1 },
  WRITE_OFF: { physical: -1, reserved: 0, available: -1 },
};

function change(sign: number, q: number) {
  if (sign > 0) return { increment: q };
  if (sign < 0) return { decrement: q };
  return undefined;
}

export interface MovementInput {
  productId: string;
  type: StockMoveType;
  quantity: number;
  orderId?: string;
  supplyId?: string;
  adminId?: string;
  note?: string;
}

/** Бір қалдық қозғалысы. Міндетті түрде транзакция ішінде шақырылады. */
export async function applyMovement(tx: Tx, input: MovementInput) {
  const { productId, type, quantity } = input;
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('Количество должно быть целым положительным числом');
  }
  const d = EFFECT[type];

  // Азайтылатын өріс жеткілікті ме — сол шарт WHERE ішінде.
  const where: Prisma.StockWhereInput = { productId };
  if (d.available < 0) where.availableQuantity = { gte: quantity };
  if (d.reserved < 0) where.reservedQuantity = { gte: quantity };
  if (d.physical < 0) where.physicalQuantity = { gte: quantity };

  // Кіріс қозғалыстар үшін Stock жолы әлі жоқ болуы мүмкін.
  if (d.physical > 0 && d.available > 0) {
    await tx.stock.upsert({ where: { productId }, create: { productId }, update: {} });
  }

  const updated = await tx.stock.updateMany({
    where,
    data: {
      physicalQuantity: change(d.physical, quantity),
      reservedQuantity: change(d.reserved, quantity),
      availableQuantity: change(d.available, quantity),
    },
  });
  if (updated.count !== 1) throw new InsufficientStockError(productId, type, quantity);

  const after = await tx.stock.findUniqueOrThrow({ where: { productId } });
  return tx.stockMovement.create({
    data: {
      productId,
      type,
      quantity,
      physicalAfter: after.physicalQuantity,
      reservedAfter: after.reservedQuantity,
      availableAfter: after.availableQuantity,
      orderId: input.orderId,
      supplyId: input.supplyId,
      adminId: input.adminId,
      note: input.note,
    },
  });
}

/** Админнің қолмен түзетуі / бүлінген гүлді есептен шығару / поставка кірісі. */
export async function recordMovement(input: MovementInput) {
  return prisma.$transaction((tx) => applyMovement(tx, input));
}

export interface ChangeStatusOptions {
  adminId?: string;
  note?: string;
  /** Тек PAID/COMPLETED тапсырысты болдырмағанда керек: гүл қоймаға қайта ма? */
  restock?: boolean;
  cancelReason?: string;
}

/**
 * Тапсырыс статусын өзгертеді және қалдыққа әсерін бір транзакцияда қолданады.
 * Бір тапсырыс қалдықты екі рет өзгерте алмайды: статус+stockState "compare-and-set" арқылы тексеріледі.
 */
export async function changeOrderStatus(orderId: string, to: OrderStatus, opts: ChangeStatusOptions = {}) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });
    const plan = planTransition(order.status, to, order.stockState, { restock: opts.restock });
    const now = new Date();

    const cas = await tx.order.updateMany({
      where: { id: order.id, status: order.status, stockState: order.stockState },
      data: {
        status: to,
        stockState: plan.nextStockState,
        ...(to === 'CONFIRMED' && { confirmedAt: now }),
        ...(to === 'PAID' && { paidAt: now }),
        ...(to === 'COMPLETED' && { completedAt: now }),
        ...(to === 'CANCELLED' && { cancelledAt: now, cancelReason: opts.cancelReason ?? null }),
        ...(opts.adminId && { handledById: opts.adminId }),
      },
    });
    if (cas.count !== 1) throw new ConcurrentUpdateError();

    if (plan.movement) {
      // Бір тауар бірнеше жолда болса — қосып, бір қозғалыс жасаймыз.
      const perProduct = new Map<string, number>();
      for (const item of order.items) {
        if (!item.productId) continue; // монобукет сияқты еркін позиция қалдыққа әсер етпейді
        perProduct.set(item.productId, (perProduct.get(item.productId) ?? 0) + item.quantity);
      }
      for (const [productId, quantity] of perProduct) {
        await applyMovement(tx, {
          productId,
          type: plan.movement,
          quantity,
          orderId: order.id,
          adminId: opts.adminId,
          note: `${order.number}: ${order.status} → ${to}`,
        });
      }
    }

    if (to === 'COMPLETED') {
      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          ordersCount: { increment: 1 },
          totalSpent: { increment: order.totalAmount },
          lastOrderAt: now,
          status: 'ACTIVE',
        },
      });
    }

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: to,
        changedById: opts.adminId,
        note: opts.note,
      },
    });

    return tx.order.findUniqueOrThrow({ where: { id: order.id } });
  });
}
