import { describe, expect, it } from 'vitest';
import { formatTenge, isSellable, salePrice, unitLabel } from '@/lib/pricing';
import { maskPhone, redact } from '@/server/logger';
import { planTransition } from '@/server/services/order-status';
import { periodStart } from '@/server/services/dashboard';
import { validatePhoto, detectImageType } from '@/server/services/uploads';
import { normalizePhone } from '@/lib/phone';
import { allowedActions } from '@/server/services/supplies';
import { stockLevel } from '@/server/services/stock';

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

describe('dashboard periods (Астана, UTC+5)', () => {
  // 2026-09-24 (бейсенбі) 21:30 UTC = 25 қыркүйек, жұма 02:30 Астана уақытымен
  const now = new Date('2026-09-24T21:30:00Z');
  it('бүгін — Астана уақытымен түн ортасынан', () => {
    expect(periodStart('today', now).toISOString()).toBe('2026-09-24T19:00:00.000Z');
  });
  it('апта — дүйсенбіден', () => {
    expect(periodStart('week', now).toISOString()).toBe('2026-09-20T19:00:00.000Z'); // 21 қыркүйек, дүйсенбі 00:00
  });
  it('ай — 1-інен', () => {
    expect(periodStart('month', now).toISOString()).toBe('2026-08-31T19:00:00.000Z');
  });
});

describe('stock level', () => {
  it('OUT / LOW / OK', () => {
    expect(stockLevel(0, 3)).toBe('OUT');
    expect(stockLevel(3, 3)).toBe('LOW');
    expect(stockLevel(4, 3)).toBe('OK');
    expect(stockLevel(0, 0)).toBe('OUT');
  });
});

describe('photo upload validation', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
  it('JPEG/PNG байттар бойынша танылады', () => {
    expect(detectImageType(jpeg)).toBe('image/jpeg');
    expect(detectImageType(png)).toBe('image/png');
  });
  it('басқа формат және 4 МБ-тан үлкен файл қабылданбайды', () => {
    expect(() => validatePhoto(new TextEncoder().encode('<svg onload=alert(1)>'))).toThrow(/JPG или PNG/);
    const big = new Uint8Array(4 * 1024 * 1024 + 1);
    big.set(jpeg);
    expect(() => validatePhoto(big)).toThrow(/4 МБ/);
  });
});

describe('phone', () => {
  it('қазақстан нөмірлері бір форматқа келеді', () => {
    expect(normalizePhone('+7 (701) 123-45-67')).toBe('77011234567');
    expect(normalizePhone('87011234567')).toBe('77011234567');
    expect(normalizePhone('7011234567')).toBe('77011234567');
    expect(normalizePhone('123')).toBeNull();
  });
});

describe('supply actions', () => {
  it('статусқа қарай батырмалар', () => {
    expect(allowedActions('PLANNED', false)).toEqual(['OPEN_PREORDER', 'IN_TRANSIT', 'ARRIVE', 'CANCEL']);
    expect(allowedActions('IN_TRANSIT', true)).toEqual(['CLOSE_PREORDER', 'ARRIVE', 'CANCEL']);
    expect(allowedActions('ARRIVED', false)).toEqual(['COMPLETE']);
    expect(allowedActions('COMPLETED', false)).toEqual([]);
    expect(allowedActions('CANCELLED', false)).toEqual([]);
  });
});
