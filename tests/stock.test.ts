import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/server/db';
import { OrderTransitionError } from '@/server/services/order-status';
import {
  ConcurrentUpdateError,
  InsufficientStockError,
  changeOrderStatus,
  recordMovement,
} from '@/server/services/stock';
import { makeOrder, makeProduct, resetDb, stockOf } from './helpers';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const snapshot = async (productId: string) => {
  const s = await stockOf(productId);
  return { physical: s.physicalQuantity, reserved: s.reservedQuantity, available: s.availableQuantity };
};

describe('stock: physical / reserved / available', () => {
  it('CONFIRMED — бронь: available азаяды, physical өзгермейді', async () => {
    const p = await makeProduct({ physical: 20 });
    const o = await makeOrder(p.id, 5);

    await changeOrderStatus(o.id, 'CONFIRMED');

    expect(await snapshot(p.id)).toEqual({ physical: 20, reserved: 5, available: 15 });
    const order = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
    expect(order.stockState).toBe('RESERVED');
    expect(order.confirmedAt).not.toBeNull();
  });

  it('PAID — физикалық шығару: physical және reserved азаяды', async () => {
    const p = await makeProduct({ physical: 20 });
    const o = await makeOrder(p.id, 5);
    await changeOrderStatus(o.id, 'CONFIRMED');

    await changeOrderStatus(o.id, 'PAID');
    expect(await snapshot(p.id)).toEqual({ physical: 15, reserved: 0, available: 15 });

    // READY → COMPLETED қайта азайтпайды
    await changeOrderStatus(o.id, 'READY');
    await changeOrderStatus(o.id, 'COMPLETED');
    expect(await snapshot(p.id)).toEqual({ physical: 15, reserved: 0, available: 15 });

    const moves = await prisma.stockMovement.findMany({ where: { orderId: o.id }, orderBy: { createdAt: 'asc' } });
    expect(moves.map((m) => m.type)).toEqual(['RESERVE', 'SALE_OUT']);
  });

  it('PAID-сыз CONFIRMED → READY → COMPLETED: шығару COMPLETED кезінде', async () => {
    const p = await makeProduct({ physical: 10 });
    const o = await makeOrder(p.id, 4);
    await changeOrderStatus(o.id, 'CONFIRMED');
    await changeOrderStatus(o.id, 'READY');
    expect(await snapshot(p.id)).toEqual({ physical: 10, reserved: 4, available: 6 });
    await changeOrderStatus(o.id, 'COMPLETED');
    expect(await snapshot(p.id)).toEqual({ physical: 6, reserved: 0, available: 6 });
  });

  it('CANCELLED — бронь босатылады', async () => {
    const p = await makeProduct({ physical: 20 });
    const o = await makeOrder(p.id, 5);
    await changeOrderStatus(o.id, 'CONFIRMED');

    await changeOrderStatus(o.id, 'CANCELLED', { cancelReason: 'клиент бас тартты' });

    expect(await snapshot(p.id)).toEqual({ physical: 20, reserved: 0, available: 20 });
    const order = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
    expect(order.stockState).toBe('RELEASED');
  });

  it('NEW тапсырысты болдырмау қалдыққа әсер етпейді', async () => {
    const p = await makeProduct({ physical: 20 });
    const o = await makeOrder(p.id, 5);
    await changeOrderStatus(o.id, 'CANCELLED');
    expect(await snapshot(p.id)).toEqual({ physical: 20, reserved: 0, available: 20 });
  });

  it('PAID тапсырысты болдырмау: қоймаға қайтару туралы шешім міндетті', async () => {
    const p = await makeProduct({ physical: 20 });
    const o = await makeOrder(p.id, 5);
    await changeOrderStatus(o.id, 'CONFIRMED');
    await changeOrderStatus(o.id, 'PAID');

    await expect(changeOrderStatus(o.id, 'CANCELLED')).rejects.toMatchObject({
      code: 'RESTOCK_DECISION_REQUIRED',
    });

    await changeOrderStatus(o.id, 'CANCELLED', { restock: true });
    expect(await snapshot(p.id)).toEqual({ physical: 20, reserved: 0, available: 20 });
  });

  it('PAID тапсырысты қайтарусыз болдырмау — қалдық өзгермейді', async () => {
    const p = await makeProduct({ physical: 20 });
    const o = await makeOrder(p.id, 5);
    await changeOrderStatus(o.id, 'CONFIRMED');
    await changeOrderStatus(o.id, 'PAID');
    await changeOrderStatus(o.id, 'CANCELLED', { restock: false });
    expect(await snapshot(p.id)).toEqual({ physical: 15, reserved: 0, available: 15 });
  });

  it('available жетпесе — CONFIRMED болмайды және ештеңе өзгермейді', async () => {
    const p = await makeProduct({ physical: 20, reserved: 18 });
    const o = await makeOrder(p.id, 5);

    await expect(changeOrderStatus(o.id, 'CONFIRMED')).rejects.toBeInstanceOf(InsufficientStockError);

    expect(await snapshot(p.id)).toEqual({ physical: 20, reserved: 18, available: 2 });
    const order = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
    expect(order.status).toBe('NEW');
    expect(order.stockState).toBe('NONE');
    expect(await prisma.stockMovement.count()).toBe(0);
    expect(await prisma.orderStatusHistory.count()).toBe(0);
  });

  it('бір тапсырысты қатар екі рет растау — бронь тек бір рет', async () => {
    const p = await makeProduct({ physical: 20 });
    const o = await makeOrder(p.id, 5);

    const results = await Promise.allSettled([
      changeOrderStatus(o.id, 'CONFIRMED'),
      changeOrderStatus(o.id, 'CONFIRMED'),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(
      rejected.reason instanceof ConcurrentUpdateError || rejected.reason instanceof OrderTransitionError,
    ).toBe(true);
    expect(await snapshot(p.id)).toEqual({ physical: 20, reserved: 5, available: 15 });
  });

  it('соңғы қалдыққа екі клиент таласса — біреуі ғана алады', async () => {
    const p = await makeProduct({ physical: 5 });
    const a = await makeOrder(p.id, 5);
    const b = await makeOrder(p.id, 5);

    const results = await Promise.allSettled([
      changeOrderStatus(a.id, 'CONFIRMED'),
      changeOrderStatus(b.id, 'CONFIRMED'),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await snapshot(p.id)).toEqual({ physical: 5, reserved: 5, available: 0 });
  });

  it('рұқсат етілмеген өту қабылданбайды', async () => {
    const p = await makeProduct({ physical: 20 });
    const o = await makeOrder(p.id, 5);
    await expect(changeOrderStatus(o.id, 'PAID')).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
    await changeOrderStatus(o.id, 'CONFIRMED');
    await changeOrderStatus(o.id, 'COMPLETED');
    await expect(changeOrderStatus(o.id, 'CANCELLED')).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });

  it('COMPLETED клиент статистикасын жаңартады', async () => {
    const p = await makeProduct({ physical: 20 });
    const o = await makeOrder(p.id, 2, 50000);
    await changeOrderStatus(o.id, 'CONFIRMED');
    await changeOrderStatus(o.id, 'COMPLETED');
    const c = await prisma.customer.findUniqueOrThrow({ where: { id: o.customerId } });
    expect(c.ordersCount).toBe(1);
    expect(c.totalSpent).toBe(50000);
    expect(c.lastOrderAt).not.toBeNull();
  });
});

describe('stock: қолмен қозғалыстар', () => {
  it('поставка кірісі жаңа тауарға Stock жолын жасайды', async () => {
    const category = await prisma.category.create({ data: { name: 'Хризантема', slug: 'chrysanthemum' } });
    const p = await prisma.product.create({
      data: { categoryId: category.id, name: 'Хризантема', packageQuantity: 10, pricePerPackage: 12000 },
    });
    await recordMovement({ productId: p.id, type: 'SUPPLY_IN', quantity: 30 });
    expect(await snapshot(p.id)).toEqual({ physical: 30, reserved: 0, available: 30 });
  });

  it('бронь тұрған гүлді есептен шығаруға болмайды', async () => {
    const p = await makeProduct({ physical: 10, reserved: 8 });
    await expect(recordMovement({ productId: p.id, type: 'WRITE_OFF', quantity: 3 })).rejects.toBeInstanceOf(
      InsufficientStockError,
    );
    await recordMovement({ productId: p.id, type: 'WRITE_OFF', quantity: 2 });
    expect(await snapshot(p.id)).toEqual({ physical: 8, reserved: 8, available: 0 });
  });

  it('теріс немесе нөл саны қабылданбайды', async () => {
    const p = await makeProduct({ physical: 10 });
    await expect(recordMovement({ productId: p.id, type: 'SUPPLY_IN', quantity: -5 })).rejects.toThrow();
    await expect(recordMovement({ productId: p.id, type: 'SUPPLY_IN', quantity: 0 })).rejects.toThrow();
  });

  it('база деңгейінде де теріс/сәйкессіз қалдыққа жол жоқ (CHECK)', async () => {
    const p = await makeProduct({ physical: 10 });
    await expect(
      prisma.stock.update({ where: { productId: p.id }, data: { availableQuantity: -1, physicalQuantity: -1 } }),
    ).rejects.toThrow();
    await expect(
      prisma.stock.update({ where: { productId: p.id }, data: { reservedQuantity: 3 } }),
    ).rejects.toThrow(); // physical != reserved + available
    expect(await snapshot(p.id)).toEqual({ physical: 10, reserved: 0, available: 10 });
  });
});
