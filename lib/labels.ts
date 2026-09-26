import type {
  MonobouquetStatus,
  PreOrderStatus,
  PriceType,
  SaleUnit,
  StockMoveType,
  StockReason,
  SupplyStatus,
} from '@prisma/client';

// Экранда көрсетілетін атаулар (admin panel — орыс тілінде).

export const SUPPLY_STATUS: Record<SupplyStatus, { label: string; tone: 'muted' | 'green' | 'yellow' | 'red' | 'blue' | 'primary' }> = {
  PLANNED: { label: 'Запланирована', tone: 'muted' },
  PREORDER_OPEN: { label: 'Предзаказ открыт', tone: 'green' },
  IN_TRANSIT: { label: 'В пути', tone: 'blue' },
  ARRIVED: { label: 'Пришла', tone: 'primary' },
  COMPLETED: { label: 'Завершена', tone: 'muted' },
  CANCELLED: { label: 'Отменена', tone: 'red' },
};

export const STOCK_REASON: Record<StockReason, { label: string; sign: '+' | '−' }> = {
  RECEIPT: { label: 'Поступление', sign: '+' },
  RETURN: { label: 'Возврат', sign: '+' },
  CORRECTION_PLUS: { label: 'Коррекция +', sign: '+' },
  DAMAGE: { label: 'Повреждение', sign: '−' },
  WRITE_OFF: { label: 'Списание', sign: '−' },
  CORRECTION_MINUS: { label: 'Коррекция −', sign: '−' },
};

export const MOVE_TYPE: Record<StockMoveType, string> = {
  SUPPLY_IN: 'Приход',
  RESERVE: 'Бронь',
  RELEASE: 'Снятие брони',
  SALE_OUT: 'Отгрузка',
  RETURN_IN: 'Возврат',
  ADJUSTMENT_IN: 'Коррекция +',
  ADJUSTMENT_OUT: 'Коррекция −',
  WRITE_OFF: 'Списание',
};

export const PRICE_TYPE: Record<PriceType, string> = {
  PRICE_PER_UNIT: 'За штуку',
  PRICE_PER_PACKAGE: 'За упаковку',
};

export const SALE_UNIT: Record<SaleUnit, string> = {
  PACKAGE: 'Упаковками',
  UNIT: 'Поштучно',
};

export const PREORDER_STATUS: Record<PreOrderStatus, { label: string; tone: 'muted' | 'green' | 'yellow' | 'red' | 'blue' | 'primary' }> = {
  NEW: { label: 'Новый', tone: 'yellow' },
  CONFIRMED: { label: 'Подтверждён', tone: 'green' },
  CONVERTED: { label: 'Стал заказом', tone: 'primary' },
  CANCELLED: { label: 'Отменён', tone: 'red' },
};

export const MONO_STATUS: Record<MonobouquetStatus, { label: string; tone: 'muted' | 'green' | 'yellow' | 'red' | 'blue' | 'primary' }> = {
  NEW: { label: 'Новый', tone: 'yellow' },
  CONTACTED: { label: 'Связались', tone: 'blue' },
  CONFIRMED: { label: 'Подтверждён', tone: 'green' },
  COMPLETED: { label: 'Выполнен', tone: 'muted' },
  CANCELLED: { label: 'Отменён', tone: 'red' },
};

export function qtyUnit(unit: SaleUnit): string {
  return unit === 'PACKAGE' ? 'уп.' : 'шт.';
}
