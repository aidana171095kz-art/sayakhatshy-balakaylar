import type { OrderStatus, StockMoveType, StockState } from '@prisma/client';

// Тапсырыс статусының ережелері — таза функциялар, базаға тәуелсіз (тесттеуге оңай).
//
// Қалдыққа әсері:
//   → CONFIRMED            : available − , reserved +        (бронь)
//   → PAID / COMPLETED     : reserved − , physical −         (физикалық шығару, бір рет қана)
//   → CANCELLED (бронь)    : reserved − , available +        (бронь босатылады)
//   → CANCELLED (шығарылған): restock=true болса physical + , available +
//   NEW / PENDING / READY  : әсер жоқ

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['PENDING', 'CONFIRMED', 'CANCELLED'],
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PAID', 'READY', 'COMPLETED', 'CANCELLED'],
  PAID: ['READY', 'COMPLETED', 'CANCELLED'],
  READY: ['PAID', 'COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export class OrderTransitionError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_TRANSITION' | 'RESTOCK_DECISION_REQUIRED' | 'INCONSISTENT_STOCK_STATE',
  ) {
    super(message);
    this.name = 'OrderTransitionError';
  }
}

export interface TransitionPlan {
  /** Әр позиция бойынша қолданылатын қалдық қозғалысы (null = қалдық өзгермейді) */
  movement: StockMoveType | null;
  nextStockState: StockState;
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function planTransition(
  from: OrderStatus,
  to: OrderStatus,
  stockState: StockState,
  opts: { restock?: boolean } = {},
): TransitionPlan {
  if (!canTransition(from, to)) {
    throw new OrderTransitionError(`Нельзя изменить статус ${from} → ${to}`, 'INVALID_TRANSITION');
  }

  const inconsistent = () =>
    new OrderTransitionError(
      `Состояние остатка заказа (${stockState}) не соответствует статусу ${to}`,
      'INCONSISTENT_STOCK_STATE',
    );

  switch (to) {
    case 'PENDING':
      if (stockState !== 'NONE') throw inconsistent();
      return { movement: null, nextStockState: 'NONE' };

    case 'CONFIRMED':
      if (stockState !== 'NONE') throw inconsistent();
      return { movement: 'RESERVE', nextStockState: 'RESERVED' };

    case 'READY':
      if (stockState !== 'RESERVED' && stockState !== 'DEDUCTED') throw inconsistent();
      return { movement: null, nextStockState: stockState };

    case 'PAID':
    case 'COMPLETED':
      if (stockState === 'RESERVED') return { movement: 'SALE_OUT', nextStockState: 'DEDUCTED' };
      if (stockState === 'DEDUCTED') return { movement: null, nextStockState: 'DEDUCTED' };
      throw inconsistent();

    case 'CANCELLED':
      if (stockState === 'NONE') return { movement: null, nextStockState: 'NONE' };
      if (stockState === 'RESERVED') return { movement: 'RELEASE', nextStockState: 'RELEASED' };
      if (stockState === 'DEDUCTED') {
        if (opts.restock === undefined) {
          throw new OrderTransitionError(
            'Товар уже списан со склада. Укажите, вернуть ли его на склад при отмене.',
            'RESTOCK_DECISION_REQUIRED',
          );
        }
        return opts.restock
          ? { movement: 'RETURN_IN', nextStockState: 'RETURNED' }
          : { movement: null, nextStockState: 'DEDUCTED' };
      }
      throw inconsistent();

    default:
      throw new OrderTransitionError(`Неизвестный статус: ${to}`, 'INVALID_TRANSITION');
  }
}
