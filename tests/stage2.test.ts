import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/server/db';
import { getStockAlerts } from '@/server/services/dashboard';
import { createMonobouquetRequest, updateMonobouquet } from '@/server/services/monobouquets';
import {
  cancelPreOrder,
  convertPreOrderToOrder,
  createPreOrder,
} from '@/server/services/preorders';
import {
  createProduct,
  getPriceHistory,
  listCatalogProducts,
  setProductStatus,
  updatePrices,
  updateProduct,
} from '@/server/services/products';
import { getSettings, updateSetting } from '@/server/services/settings';
import { InsufficientStockError, adjustStock } from '@/server/services/stock';
import {
  addSupplyItem,
  cancelSupply,
  closePreorder,
  createSupply,
  markInTransit,
  openPreorder,
  receiveSupply,
} from '@/server/services/supplies';
import { makeAdmin, makeCategory, resetDb } from './helpers';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const stockOf = async (productId: string) => {
  const s = await prisma.stock.findUniqueOrThrow({ where: { productId } });
  return { physical: s.physicalQuantity, reserved: s.reservedQuantity, available: s.availableQuantity };
};

function roseInput(categoryId: string, overrides: Record<string, unknown> = {}) {
  return {
    name: 'Роза',
    categoryId,
    variety: 'Red',
    color: 'красный',
    lengthCm: '60',
    saleUnit: 'PACKAGE',
    packageQuantity: '20',
    pricePerUnit: '',
    pricePerPackage: '25000',
    minOrderQty: '1',
    status: 'ACTIVE',
    description: '',
    photoUrl: '',
    lowStockThreshold: '',
    ...overrides,
  };
}

async function setup() {
  const admin = await makeAdmin();
  const cat = await makeCategory();
  return { admin, cat };
}

async function supplyWithItem(adminId: string, productId: string, expectedQty = 20, preorderLimit: number | '' = '') {
  const supply = await createSupply({ title: 'Поставка №1', expectedDate: '2026-10-05', notes: '' }, adminId);
  const item = await addSupplyItem(supply.id, { productId, expectedQty, preorderLimit }, adminId);
  return { supply, item };
}

const customer = (phone = '+7 701 123 45 67') => ({ phone, name: 'Айдана', companyName: 'Flower Shop' });

// ─────────────────────────────── ТОВАРЫ ───────────────────────────────

describe('Товары', () => {
  it('Product create: өз packageQuantity мәнімен, бастапқы қалдықпен', async () => {
    const { admin, cat } = await setup();
    const rose = await createProduct(roseInput(cat.id), admin.id, 12);
    const spray = await createProduct(
      roseInput(cat.id, { name: 'Spray rose', variety: '', packageQuantity: '10', pricePerPackage: '18000', lengthCm: '' }),
      admin.id,
    );

    expect(rose.packageQuantity).toBe(20);
    expect(spray.packageQuantity).toBe(10); // әр тауардың өз саны
    expect(await stockOf(rose.id)).toEqual({ physical: 12, reserved: 0, available: 12 });
    expect(await stockOf(spray.id)).toEqual({ physical: 0, reserved: 0, available: 0 });

    const mv = await prisma.stockMovement.findFirstOrThrow({ where: { productId: rose.id } });
    expect(mv).toMatchObject({ type: 'SUPPLY_IN', reason: 'RECEIPT', quantity: 12, adminId: admin.id });
  });

  it('Product create: упаковкамен сатылса packageQuantity мен упаковка бағасы міндетті', async () => {
    const { admin, cat } = await setup();
    await expect(createProduct(roseInput(cat.id, { packageQuantity: '' }), admin.id)).rejects.toThrow(/штук в упаковке/);
    await expect(createProduct(roseInput(cat.id, { pricePerPackage: '' }), admin.id)).rejects.toThrow(/цену за упаковку/);
    await expect(
      createProduct(roseInput(cat.id, { saleUnit: 'UNIT', pricePerUnit: '' }), admin.id),
    ).rejects.toThrow(/цену за штуку/);
    expect(await prisma.product.count()).toBe(0);
  });

  it('Product edit: өрістер жаңарады, баға өзгерсе — тарихқа жазылады', async () => {
    const { admin, cat } = await setup();
    const p = await createProduct(roseInput(cat.id), admin.id);
    await updateProduct(p.id, roseInput(cat.id, { lengthCm: '70', pricePerPackage: '27000', lowStockThreshold: '5' }), admin.id);

    const after = await prisma.product.findUniqueOrThrow({ where: { id: p.id }, include: { stock: true } });
    expect(after.lengthCm).toBe(70);
    expect(after.pricePerPackage).toBe(27000);
    expect(after.stock?.lowStockThreshold).toBe(5);

    const history = await getPriceHistory(p.id);
    expect(history[0]).toMatchObject({ priceType: 'PRICE_PER_PACKAGE', oldPrice: 25000, newPrice: 27000, changedById: admin.id });
  });

  it('Product deactivate: INACTIVE тауар каталогта көрінбейді', async () => {
    const { admin, cat } = await setup();
    const a = await createProduct(roseInput(cat.id), admin.id);
    const b = await createProduct(roseInput(cat.id, { lengthCm: '70' }), admin.id);
    await setProductStatus(a.id, 'INACTIVE', admin.id);

    const catalog = await listCatalogProducts();
    expect(catalog.map((p) => p.id)).toEqual([b.id]);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: a.id } })).status).toBe('INACTIVE');
  });
});

// ─────────────────────────────── ЦЕНЫ ───────────────────────────────

describe('Цены', () => {
  it('Price update + Price history: әр түр бөлек жол, кім өзгертті', async () => {
    const { admin, cat } = await setup();
    const p = await createProduct(roseInput(cat.id), admin.id);
    await prisma.priceHistory.deleteMany(); // бастапқы бағаны есептемейміз

    await updatePrices(p.id, { pricePerUnit: '1400', pricePerPackage: '26000' }, admin.id);
    const history = await getPriceHistory(p.id);
    expect(history).toHaveLength(2);
    expect(history.find((h) => h.priceType === 'PRICE_PER_UNIT')).toMatchObject({ oldPrice: null, newPrice: 1400 });
    expect(history.find((h) => h.priceType === 'PRICE_PER_PACKAGE')).toMatchObject({ oldPrice: 25000, newPrice: 26000 });
    expect(history.every((h) => h.changedById === admin.id)).toBe(true);

    // Өзгеріс жоқ — тарих жазылмайды
    await updatePrices(p.id, { pricePerUnit: '1400', pricePerPackage: '26000' }, admin.id);
    expect(await prisma.priceHistory.count()).toBe(2);

    // Актуалды баға — соңғысы
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).pricePerPackage).toBe(26000);
  });

  it('сату бірлігінің бағасын өшіруге болмайды', async () => {
    const { admin, cat } = await setup();
    const p = await createProduct(roseInput(cat.id), admin.id);
    await expect(updatePrices(p.id, { pricePerUnit: '', pricePerPackage: '' }, admin.id)).rejects.toThrow(/обязательна/);
  });
});

// ─────────────────────────────── ОСТАТКИ ───────────────────────────────

describe('Остатки', () => {
  it('Stock movement: себеп, саны, админ, комментарий журналда', async () => {
    const { admin, cat } = await setup();
    const p = await createProduct(roseInput(cat.id), admin.id, 20);

    await adjustStock({ productId: p.id, reason: 'DAMAGE', quantity: 2, adminId: admin.id, note: 'помялись' });
    await adjustStock({ productId: p.id, reason: 'CORRECTION_PLUS', quantity: 1, adminId: admin.id });
    await adjustStock({ productId: p.id, reason: 'RETURN', quantity: 1, adminId: admin.id });

    expect(await stockOf(p.id)).toEqual({ physical: 20, reserved: 0, available: 20 });
    const moves = await prisma.stockMovement.findMany({ where: { productId: p.id }, orderBy: { createdAt: 'asc' } });
    expect(moves.map((m) => [m.reason, m.type, m.quantity])).toEqual([
      ['RECEIPT', 'SUPPLY_IN', 20],
      ['DAMAGE', 'WRITE_OFF', 2],
      ['CORRECTION_PLUS', 'ADJUSTMENT_IN', 1],
      ['RETURN', 'RETURN_IN', 1],
    ]);
    expect(moves[1]).toMatchObject({ adminId: admin.id, note: 'помялись', physicalAfter: 18, availableAfter: 18 });
  });

  it('Negative stock protection: бос қалдықтан көп шығаруға болмайды', async () => {
    const { admin, cat } = await setup();
    const p = await createProduct(roseInput(cat.id), admin.id, 3);
    await expect(
      adjustStock({ productId: p.id, reason: 'CORRECTION_MINUS', quantity: 4, adminId: admin.id }),
    ).rejects.toBeInstanceOf(InsufficientStockError);
    await expect(adjustStock({ productId: p.id, reason: 'WRITE_OFF', quantity: 0, adminId: admin.id })).rejects.toThrow();
    expect(await stockOf(p.id)).toEqual({ physical: 3, reserved: 0, available: 3 });
    expect(await prisma.stockMovement.count({ where: { productId: p.id } })).toBe(1);
  });

  it('Low stock / Out of stock: жалпы және тауардың өз порогы', async () => {
    const { admin, cat } = await setup();
    await updateSetting('general', { lowStockThreshold: 3, currency: 'KZT', language: 'RU' }, admin.id);
    const ok = await createProduct(roseInput(cat.id, { lengthCm: '50' }), admin.id, 10);
    const low = await createProduct(roseInput(cat.id, { lengthCm: '60' }), admin.id, 3);
    const out = await createProduct(roseInput(cat.id, { lengthCm: '70' }), admin.id, 0);
    const ownThreshold = await createProduct(roseInput(cat.id, { lengthCm: '80', lowStockThreshold: '10' }), admin.id, 8);

    const alerts = await getStockAlerts();
    expect(alerts.activeProducts).toBe(4);
    expect(alerts.low.map((r) => r.id).sort()).toEqual([low.id, ownThreshold.id].sort());
    expect(alerts.out.map((r) => r.id)).toEqual([out.id]);
    expect([...alerts.low, ...alerts.out].some((r) => r.id === ok.id)).toBe(false);
  });
});

// ─────────────────────────────── ПОСТАВКИ ───────────────────────────────

describe('Поставки', () => {
  it('Supply create + Supply item create (бір тауар екі рет қосылмайды)', async () => {
    const { admin, cat } = await setup();
    const p = await createProduct(roseInput(cat.id), admin.id);
    const { supply, item } = await supplyWithItem(admin.id, p.id, 20);
    expect(supply.status).toBe('PLANNED');
    expect(item).toMatchObject({ expectedQty: 20, receivedQty: null });
    await expect(addSupplyItem(supply.id, { productId: p.id, expectedQty: 5, preorderLimit: '' }, admin.id)).rejects.toThrow(
      /уже есть/,
    );
  });

  it('Supply arrival: заказано 20, пришло 18 → қалдыққа тек 18 қосылады', async () => {
    const { admin, cat } = await setup();
    const p = await createProduct(roseInput(cat.id), admin.id, 2);
    const { supply, item } = await supplyWithItem(admin.id, p.id, 20);

    await receiveSupply(supply.id, [{ itemId: item.id, receivedQty: 18 }], admin.id);

    expect(await stockOf(p.id)).toEqual({ physical: 20, reserved: 0, available: 20 }); // 2 + 18
    const s = await prisma.supply.findUniqueOrThrow({ where: { id: supply.id }, include: { items: true } });
    expect(s.status).toBe('ARRIVED');
    expect(s.items[0]).toMatchObject({ expectedQty: 20, receivedQty: 18 });
    const mv = await prisma.stockMovement.findFirstOrThrow({ where: { supplyId: supply.id } });
    expect(mv).toMatchObject({ type: 'SUPPLY_IN', reason: 'RECEIPT', quantity: 18 });
  });

  it('Supply arrival: әр позицияға сан міндетті, 0 болса қозғалыс жоқ, қайта басуға болмайды', async () => {
    const { admin, cat } = await setup();
    const a = await createProduct(roseInput(cat.id), admin.id);
    const b = await createProduct(roseInput(cat.id, { lengthCm: '70' }), admin.id);
    const { supply, item } = await supplyWithItem(admin.id, a.id, 20);
    const itemB = await addSupplyItem(supply.id, { productId: b.id, expectedQty: 15, preorderLimit: '' }, admin.id);

    await expect(receiveSupply(supply.id, [{ itemId: item.id, receivedQty: 20 }], admin.id)).rejects.toThrow(/каждой позиции/);
    expect(await stockOf(a.id)).toEqual({ physical: 0, reserved: 0, available: 0 });

    await receiveSupply(supply.id, [{ itemId: item.id, receivedQty: 20 }, { itemId: itemB.id, receivedQty: 0 }], admin.id);
    expect(await stockOf(a.id)).toEqual({ physical: 20, reserved: 0, available: 20 });
    expect(await stockOf(b.id)).toEqual({ physical: 0, reserved: 0, available: 0 });
    expect(await prisma.stockMovement.count({ where: { supplyId: supply.id } })).toBe(1);

    await expect(
      receiveSupply(supply.id, [{ itemId: item.id, receivedQty: 20 }, { itemId: itemB.id, receivedQty: 0 }], admin.id),
    ).rejects.toThrow(/недоступно/);
    expect(await stockOf(a.id)).toEqual({ physical: 20, reserved: 0, available: 20 });
  });

  it('қатар екі рет «Поставка пришла» басылса — қалдық бір рет қана қосылады', async () => {
    const { admin, cat } = await setup();
    const p = await createProduct(roseInput(cat.id), admin.id);
    const { supply, item } = await supplyWithItem(admin.id, p.id, 20);
    const body = [{ itemId: item.id, receivedQty: 18 }];
    const results = await Promise.allSettled([receiveSupply(supply.id, body, admin.id), receiveSupply(supply.id, body, admin.id)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await stockOf(p.id)).toEqual({ physical: 18, reserved: 0, available: 18 });
  });

  it('статус циклі: PLANNED → PREORDER_OPEN → IN_TRANSIT (предзаказ ашық қалады)', async () => {
    const { admin, cat } = await setup();
    const p = await createProduct(roseInput(cat.id), admin.id);
    const { supply } = await supplyWithItem(admin.id, p.id);

    expect(await openPreorder(supply.id, admin.id)).toMatchObject({ status: 'PREORDER_OPEN', preorderOpen: true });
    expect(await markInTransit(supply.id, admin.id)).toMatchObject({ status: 'IN_TRANSIT', preorderOpen: true });
    expect(await closePreorder(supply.id, admin.id)).toMatchObject({ status: 'IN_TRANSIT', preorderOpen: false });
    expect(await openPreorder(supply.id, admin.id)).toMatchObject({ status: 'IN_TRANSIT', preorderOpen: true });
  });

  it('бос поставкаға предзаказ ашуға болмайды', async () => {
    const { admin } = await setup();
    const supply = await createSupply({ title: 'Пустая', expectedDate: '2026-10-05', notes: '' }, admin.id);
    await expect(openPreorder(supply.id, admin.id)).rejects.toThrow(/добавьте товары/);
  });
});

// ─────────────────────────────── ПРЕДЗАКАЗ ───────────────────────────────

describe('Предзаказ', () => {
  it('Pre-order: PreOrderItem ретінде сақталады, физикалық қалдыққа тимейді', async () => {
    const { admin, cat } = await setup();
    const p = await createProduct(roseInput(cat.id), admin.id, 4);
    const { supply } = await supplyWithItem(admin.id, p.id);
    await openPreorder(supply.id, admin.id);

    const po = await createPreOrder({ supplyId: supply.id, customer: customer(), items: [{ productId: p.id, quantity: 5 }] });

    expect(po.number).toMatch(/^PO-\d{6}$/);
    expect(po.items).toHaveLength(1);
    expect(po.items[0]).toMatchObject({ productId: p.id, quantity: 5 });
    expect(await stockOf(p.id)).toEqual({ physical: 4, reserved: 0, available: 4 });
    const c = await prisma.customer.findUniqueOrThrow({ where: { waId: '77011234567' } });
    expect(c).toMatchObject({ name: 'Айдана', companyName: 'Flower Shop' });
  });

  it('предзаказ жабық болса / тауар поставкада жоқ болса / минимумнан аз болса — қабылданбайды', async () => {
    const { admin, cat } = await setup();
    const p = await createProduct(roseInput(cat.id, { minOrderQty: '2' }), admin.id);
    const other = await createProduct(roseInput(cat.id, { lengthCm: '90' }), admin.id);
    const { supply } = await supplyWithItem(admin.id, p.id);

    await expect(createPreOrder({ supplyId: supply.id, customer: customer(), items: [{ productId: p.id, quantity: 5 }] })).rejects.toThrow(
      /закрыт/,
    );
    await openPreorder(supply.id, admin.id);
    await expect(
      createPreOrder({ supplyId: supply.id, customer: customer(), items: [{ productId: other.id, quantity: 5 }] }),
    ).rejects.toThrow(/нет в поставке/);
    await expect(createPreOrder({ supplyId: supply.id, customer: customer(), items: [{ productId: p.id, quantity: 1 }] })).rejects.toThrow(
      /минимальный/,
    );
    expect(await prisma.preOrder.count()).toBe(0);
  });

  it('предзаказ лимиті: қатар екі клиент соңғы орынға таласса — біреуі ғана өтеді', async () => {
    const { admin, cat } = await setup();
    const p = await createProduct(roseInput(cat.id), admin.id);
    const { supply } = await supplyWithItem(admin.id, p.id, 20, 10);
    await openPreorder(supply.id, admin.id);
    await createPreOrder({ supplyId: supply.id, customer: customer('77010000001'), items: [{ productId: p.id, quantity: 4 }] });

    const results = await Promise.allSettled([
      createPreOrder({ supplyId: supply.id, customer: customer('77010000002'), items: [{ productId: p.id, quantity: 6 }] }),
      createPreOrder({ supplyId: supply.id, customer: customer('77010000003'), items: [{ productId: p.id, quantity: 6 }] }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const total = await prisma.preOrderItem.aggregate({ _sum: { quantity: true } });
    expect(total._sum.quantity).toBe(10);
  });

  it('Cancelled pre-order: лимиттен шығады, қалдыққа әсер жоқ', async () => {
    const { admin, cat } = await setup();
    const p = await createProduct(roseInput(cat.id), admin.id, 5);
    const { supply } = await supplyWithItem(admin.id, p.id, 20, 5);
    await openPreorder(supply.id, admin.id);
    const po = await createPreOrder({ supplyId: supply.id, customer: customer(), items: [{ productId: p.id, quantity: 5 }] });

    await cancelPreOrder(po.id, admin.id);
    expect((await prisma.preOrder.findUniqueOrThrow({ where: { id: po.id } })).status).toBe('CANCELLED');
    await expect(cancelPreOrder(po.id, admin.id)).rejects.toThrow(/уже изменён/);
    expect(await stockOf(p.id)).toEqual({ physical: 5, reserved: 0, available: 5 });

    // орын босады
    await createPreOrder({ supplyId: supply.id, customer: customer('77010000009'), items: [{ productId: p.id, quantity: 5 }] });
  });

  it('поставка болдырылмаса — белсенді предзаказдар да болдырылмайды', async () => {
    const { admin, cat } = await setup();
    const p = await createProduct(roseInput(cat.id), admin.id);
    const { supply } = await supplyWithItem(admin.id, p.id);
    await openPreorder(supply.id, admin.id);
    await createPreOrder({ supplyId: supply.id, customer: customer(), items: [{ productId: p.id, quantity: 2 }] });

    expect(await cancelSupply(supply.id, admin.id)).toEqual({ cancelledPreorders: 1 });
    expect(await prisma.preOrder.count({ where: { status: 'CANCELLED' } })).toBe(1);
  });

  it('поставка келгенге дейін предзаказды тапсырысқа айналдыруға болмайды', async () => {
    const { admin, cat } = await setup();
    const p = await createProduct(roseInput(cat.id), admin.id, 50);
    const { supply } = await supplyWithItem(admin.id, p.id);
    await openPreorder(supply.id, admin.id);
    const po = await createPreOrder({ supplyId: supply.id, customer: customer(), items: [{ productId: p.id, quantity: 5 }] });
    await expect(convertPreOrderToOrder(po.id, [], admin.id)).rejects.toThrow(/после прихода/);
  });

  it('Reserved / Available: поставка келген соң предзаказ → CONFIRMED тапсырыс, бронь жасалады', async () => {
    const { admin, cat } = await setup();
    const p = await createProduct(roseInput(cat.id), admin.id);
    const { supply, item } = await supplyWithItem(admin.id, p.id, 20);
    await openPreorder(supply.id, admin.id);
    const po = await createPreOrder({ supplyId: supply.id, customer: customer(), items: [{ productId: p.id, quantity: 5 }] });
    await receiveSupply(supply.id, [{ itemId: item.id, receivedQty: 20 }], admin.id);

    const order = await convertPreOrderToOrder(po.id, [], admin.id);

    expect(order).toMatchObject({ status: 'CONFIRMED', stockState: 'RESERVED', source: 'PREORDER', totalAmount: 125000 });
    expect(order.number).toMatch(/^TF-\d{6}$/);
    expect(order.items[0]).toMatchObject({ quantity: 5, unitPrice: 25000, productLabel: 'Роза Red 60 см' });
    expect(await stockOf(p.id)).toEqual({ physical: 20, reserved: 5, available: 15 });
    expect((await prisma.preOrder.findUniqueOrThrow({ where: { id: po.id } })).status).toBe('CONVERTED');
    await expect(convertPreOrderToOrder(po.id, [], admin.id)).rejects.toThrow(/уже обработан/);
  });

  it('поставка толық келмесе: менеджер санды азайтады; қалдық жетпесе — ештеңе өзгермейді', async () => {
    const { admin, cat } = await setup();
    const p = await createProduct(roseInput(cat.id), admin.id);
    const { supply, item } = await supplyWithItem(admin.id, p.id, 20);
    await openPreorder(supply.id, admin.id);
    const po = await createPreOrder({ supplyId: supply.id, customer: customer(), items: [{ productId: p.id, quantity: 5 }] });
    await receiveSupply(supply.id, [{ itemId: item.id, receivedQty: 3 }], admin.id);

    await expect(convertPreOrderToOrder(po.id, [], admin.id)).rejects.toBeInstanceOf(InsufficientStockError);
    expect((await prisma.preOrder.findUniqueOrThrow({ where: { id: po.id } })).status).toBe('NEW');
    expect(await prisma.order.count()).toBe(0);
    expect(await stockOf(p.id)).toEqual({ physical: 3, reserved: 0, available: 3 });

    const order = await convertPreOrderToOrder(po.id, [{ productId: p.id, quantity: 3 }], admin.id);
    expect(order.totalAmount).toBe(75000);
    expect(await stockOf(p.id)).toEqual({ physical: 3, reserved: 3, available: 0 });
  });

  it('Concurrent reservation: соңғы қалдыққа екі предзаказ қатар айналдырылса — біреуі ғана', async () => {
    const { admin, cat } = await setup();
    const p = await createProduct(roseInput(cat.id), admin.id);
    const { supply, item } = await supplyWithItem(admin.id, p.id, 20);
    await openPreorder(supply.id, admin.id);
    const a = await createPreOrder({ supplyId: supply.id, customer: customer('77010000001'), items: [{ productId: p.id, quantity: 5 }] });
    const b = await createPreOrder({ supplyId: supply.id, customer: customer('77010000002'), items: [{ productId: p.id, quantity: 5 }] });
    await receiveSupply(supply.id, [{ itemId: item.id, receivedQty: 7 }], admin.id);

    const results = await Promise.allSettled([convertPreOrderToOrder(a.id, [], admin.id), convertPreOrderToOrder(b.id, [], admin.id)]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await stockOf(p.id)).toEqual({ physical: 7, reserved: 5, available: 2 });
    expect(await prisma.order.count()).toBe(1);
  });
});

// ─────────────────────────────── МОНОБУКЕТ ───────────────────────────────

describe('Монобукет', () => {
  it('сұраныс → баға → растау; қалдыққа әсер жоқ', async () => {
    const { admin, cat } = await setup();
    const p = await createProduct(roseInput(cat.id), admin.id, 10);
    const req = await createMonobouquetRequest({
      customer: customer(),
      categoryId: cat.id,
      flowerNote: 'красные розы',
      stemCount: '51',
      size: 'L',
      wrapping: 'крафт',
      neededBy: '',
      comment: '',
    });
    expect(req).toMatchObject({ status: 'NEW', stemCount: 51, quotedPrice: null });
    expect(req.number).toMatch(/^MB-\d{6}$/);

    await expect(updateMonobouquet(req.id, { status: 'CONFIRMED', quotedPrice: '', comment: '' }, admin.id)).rejects.toThrow(
      /укажите цену/,
    );
    await updateMonobouquet(req.id, { status: 'CONTACTED', quotedPrice: '45000', comment: '' }, admin.id);
    const confirmed = await updateMonobouquet(req.id, { status: 'CONFIRMED', quotedPrice: '45000', comment: '' }, admin.id);
    expect(confirmed).toMatchObject({ status: 'CONFIRMED', quotedPrice: 45000, quotedById: admin.id });
    await expect(updateMonobouquet(req.id, { status: 'NEW', quotedPrice: '45000', comment: '' }, admin.id)).rejects.toThrow(
      /Нельзя/,
    );
    expect(await stockOf(p.id)).toEqual({ physical: 10, reserved: 0, available: 10 });
  });
});

// ─────────────────────────────── НАСТРОЙКИ ───────────────────────────────

describe('Настройки', () => {
  it('әдепкі мәндер және сақтау', async () => {
    const { admin } = await setup();
    const defaults = await getSettings();
    expect(defaults.business).toMatchObject({ name: 'TALSHYN FLOWERS', address: 'Астана, ул. Күйші Дина, 12' });
    expect(defaults.general).toMatchObject({ lowStockThreshold: 3, currency: 'KZT' });

    await updateSetting('business', { ...defaults.business, instagram: '@talshyn.flowers', phone: '' }, admin.id);
    const s = await getSettings();
    expect(s.business.instagram).toBe('@talshyn.flowers');
    expect(s.business.phone).toBeNull();
    await expect(updateSetting('general', { lowStockThreshold: -1, currency: 'KZT', language: 'RU' }, admin.id)).rejects.toThrow();
  });
});
