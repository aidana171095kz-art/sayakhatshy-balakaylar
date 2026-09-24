import { describe, expect, it } from 'vitest';
import { formatTenge, isSellable, salePrice, unitLabel } from '@/lib/pricing';
import { maskPhone, redact } from '@/server/logger';
import { planTransition } from '@/server/services/order-status';

describe('pricing', () => {
  const base = { pricePerUnit: 1300, pricePerPackage: 25000, packageQuantity: 20 };

  it('saleUnit бойынша админ енгізген бағаны алады', () => {
    expect(salePrice({ ...base, saleUnit: 'PACKAGE' })).toBe(25000);
    expect(salePrice({ ...base, saleUnit: 'UNIT' })).toBe(1300);
  });

  it('бағаны өзі есептемейді: упаковка бағасы жоқ болса — null', () => {
    const p = { saleUnit: 'PACKAGE' as const, pricePerUnit: 1300, pricePerPackage: null, packageQuantity: 20 };
    expect(salePrice(p)).toBeNull();
    expect(isSellable(p)).toBe(false);
  });

  it('упаковкадағы саны берілмесе — сатылмайды', () => {
    expect(isSellable({ ...base, packageQuantity: null, saleUnit: 'PACKAGE' })).toBe(false);
    expect(isSellable({ ...base, packageQuantity: null, saleUnit: 'UNIT' })).toBe(true);
  });

  it('теңге форматы', () => {
    expect(formatTenge(25000)).toBe('25 000 ₸');
    expect(formatTenge(1250000)).toBe('1 250 000 ₸');
    expect(formatTenge(0)).toBe('0 ₸');
  });

  it('орысша жекеше/көпше', () => {
    expect(unitLabel('PACKAGE', 1)).toBe('упаковка');
    expect(unitLabel('PACKAGE', 3)).toBe('упаковки');
    expect(unitLabel('PACKAGE', 5)).toBe('упаковок');
    expect(unitLabel('PACKAGE', 11)).toBe('упаковок');
    expect(unitLabel('PACKAGE', 21)).toBe('упаковка');
    expect(unitLabel('UNIT', 7)).toBe('шт');
  });
});

describe('order transitions', () => {
  it('ережелер кестесі', () => {
    expect(planTransition('NEW', 'CONFIRMED', 'NONE')).toEqual({ movement: 'RESERVE', nextStockState: 'RESERVED' });
    expect(planTransition('CONFIRMED', 'PAID', 'RESERVED')).toEqual({ movement: 'SALE_OUT', nextStockState: 'DEDUCTED' });
    expect(planTransition('PAID', 'COMPLETED', 'DEDUCTED')).toEqual({ movement: null, nextStockState: 'DEDUCTED' });
    expect(planTransition('CONFIRMED', 'CANCELLED', 'RESERVED')).toEqual({ movement: 'RELEASE', nextStockState: 'RELEASED' });
    expect(planTransition('PAID', 'CANCELLED', 'DEDUCTED', { restock: true })).toEqual({
      movement: 'RETURN_IN',
      nextStockState: 'RETURNED',
    });
  });

  it('сәйкессіз күй қабылданбайды (екі рет бронь)', () => {
    expect(() => planTransition('NEW', 'CONFIRMED', 'RESERVED')).toThrow();
  });
});

describe('logger redaction', () => {
  it('құпияларды жасырады', () => {
    const out = redact({
      access_token: 'EAAG123',
      headers: { Authorization: 'Bearer EAAG123' },
      url: 'https://graph.facebook.com/x?access_token=EAAG123&a=1',
      nested: { appSecret: 'abc', ok: 'visible' },
    }) as any;
    expect(JSON.stringify(out)).not.toContain('EAAG123');
    expect(JSON.stringify(out)).not.toContain('abc');
    expect(out.nested.ok).toBe('visible');
  });

  it('телефонды жасырады', () => {
    expect(maskPhone('77011234567')).toBe('7701***4567');
    expect(maskPhone('+7 701 123 45 67')).toBe('7701***4567');
  });
});
