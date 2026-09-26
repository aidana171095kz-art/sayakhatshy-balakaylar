import type { SaleUnit } from '@prisma/client';

// Баға тек админ енгізген мәннен алынады. Жоқ болса — null ("цену уточнит менеджер").
// Упаковка бағасын дана бағасынан (немесе керісінше) өзіміз есептемейміз.

export interface PricedProduct {
  saleUnit: SaleUnit;
  pricePerUnit: number | null;
  pricePerPackage: number | null;
  packageQuantity: number | null;
}

/** Клиент сатып алатын бірліктің бағасы (saleUnit бойынша). */
export function salePrice(p: PricedProduct): number | null {
  return p.saleUnit === 'PACKAGE' ? p.pricePerPackage : p.pricePerUnit;
}

/** Тапсырыс беруге бола ма: баға бар және упаковка болса — ішіндегі саны белгілі. */
export function isSellable(p: PricedProduct): boolean {
  const price = salePrice(p);
  if (price === null || price <= 0) return false;
  if (p.saleUnit === 'PACKAGE' && !p.packageQuantity) return false;
  return true;
}

export function lineTotal(p: PricedProduct, quantity: number): number | null {
  const price = salePrice(p);
  return price === null ? null : price * quantity;
}

/** 25000 → "25 000 ₸" (тұрақты формат, серверде де, браузерде де бірдей) */
export function formatTenge(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const digits = Math.abs(Math.trunc(amount)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${digits} ₸`;
}

export function unitLabel(unit: SaleUnit, quantity: number): string {
  if (unit === 'UNIT') return 'шт';
  const n = Math.abs(quantity) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return 'упаковок';
  if (n1 === 1) return 'упаковка';
  if (n1 >= 2 && n1 <= 4) return 'упаковки';
  return 'упаковок';
}
