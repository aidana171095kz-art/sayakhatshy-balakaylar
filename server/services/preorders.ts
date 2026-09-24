import { z } from 'zod';
import { normalizePhone } from '@/lib/phone';
import { salePrice } from '@/lib/pricing';
import { prisma, type Tx } from '../db';
import { nextNumber } from './numbers';
import { productLabel } from './products';
import { getSetting } from './settings';
import { changeOrderStatusInTx } from './stock';

// Предзаказ = келесі поставкаға бронь СҰРАНЫСЫ.
// Физикалық қалдыққа ЕШ әсер етпейді. Поставка келгеннен кейін менеджер оны
// тапсырысқа айналдырады → сол кезде ғана қалдықтан бронь (CONFIRMED) жасалады.

export class PreOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PreOrderError';
  }
}

const optionalText = (max: number) =>
  z.preprocess((v) => (v == null || (typeof v === 'string' && v.trim() === '') ? null : v), z.string().trim().max(max).nullable());

export const customerInputSchema = z.object({
  phone: z.string().transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) ctx.addIssue({ code: 'custom', message: 'Неверный номер телефона' });
    return n ?? '';
  }),
  name: z.string().trim().min(1, 'Укажите имя клиента').max(100),
  companyName: optionalText(100),
});

export const preOrderInputSchema = z.object({
  supplyId: z.string().min(1),
  customer: customerInputSchema,
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Выберите товар'),
        quantity: z.coerce.number().int('Количество — целое число').min(1, 'Количество — больше 0').max(100000),
      }),
    )
    .min(1, 'Добавьте хотя бы одну позицию'),
  neededBy: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.date().nullable()),
  comment: optionalText(1000),
});

/** WhatsApp нөмірі бойынша клиентті табу немесе жасау. Бар клиенттің атын/компаниясын толтырады. */
export async function upsertCustomer(tx: Tx, c: { phone: string; name: string; companyName: string | null }) {
  const existing = await tx.customer.findUnique({ where: { waId: c.phone } });
  if (existing) {
    return tx.customer.update({
      where: { id: existing.id },
      data: { name: existing.name ?? c.name, companyName: existing.companyName ?? c.companyName },
    });
  }
  return tx.customer.create({ data: { waId: c.phone, name: c.name, companyName: c.companyName } });
}

export async function createPreOrder(raw: unknown, opts: { adminId?: string } = {}) {
  const input = preOrderInputSchema.parse(raw);
  const limits = await getSetting('preorders');

  return prisma.$transaction(async (tx) => {
    // Поставка жолын құлыптаймыз — лимитті қатар екі клиент асырып кетпеуі үшін.
    await tx.$queryRaw`SELECT id FROM "Supply" WHERE id = ${input.supplyId} FOR UPDATE`;
    const supply = await tx.supply.findUnique({ where: { id: input.supplyId }, include: { items: { include: { product: true } } } });
    if (!supply) throw new PreOrderError('Поставка не найдена');
    if (!supply.preorderOpen) throw new PreOrderError('Предзаказ на эту поставку закрыт');

    const merged = new Map<string, number>();
    for (const i of input.items) merged.set(i.productId, (merged.get(i.productId) ?? 0) + i.quantity);

    for (const [productId, qty] of merged) {
      const item = supply.items.find((si) => si.productId === productId);
      if (!item) throw new PreOrderError('Этого товара нет в поставке');
      const label = productLabel(item.product);
      if (item.product.status !== 'ACTIVE') throw new PreOrderError(`${label}: товар недоступен`);
      if (qty < item.product.minOrderQty) {
        throw new PreOrderError(`${label}: минимальный заказ — ${item.product.minOrderQty}`);
      }
      if (limits.maxQtyPerItem > 0 && qty > limits.maxQtyPerItem) {
        throw new PreOrderError(`${label}: максимум ${limits.maxQtyPerItem} на один предзаказ`);
      }
      if (item.preorderLimit !== null) {
        const agg = await tx.preOrderItem.aggregate({
          where: { productId, preOrder: { supplyId: supply.id, status: { in: ['NEW', 'CONFIRMED'] } } },
          _sum: { quantity: true },
        });
        const left = item.preorderLimit - (agg._sum.quantity ?? 0);
        if (qty > left) throw new PreOrderError(`${label}: для предзаказа осталось ${Math.max(left, 0)}`);
      }
    }

    const customer = await upsertCustomer(tx, input.customer);
    const preOrder = await tx.preOrder.create({
      data: {
        number: await nextNumber(tx, 'preorder'),
        customerId: customer.id,
        supplyId: supply.id,
        contactName: input.customer.name,
        companyName: input.customer.companyName,
        neededBy: input.neededBy,
        comment: input.comment,
        items: {
          create: [...merged].map(([productId, quantity]) => ({
            productId,
            quantity,
            saleUnit: supply.items.find((si) => si.productId === productId)!.product.saleUnit,
          })),
        },
      },
      include: { items: true },
    });
    await tx.auditLog.create({
      data: { adminId: opts.adminId, action: 'PREORDER_CREATED', entity: 'PreOrder', entityId: preOrder.id },
    });
    return preOrder;
  });
}

async function setStatus(id: string, from: ('NEW' | 'CONFIRMED')[], to: 'CONFIRMED' | 'CANCELLED', adminId: string) {
  const res = await prisma.preOrder.updateMany({ where: { id, status: { in: from } }, data: { status: to } });
  if (res.count !== 1) throw new PreOrderError('Статус предзаказа уже изменён');
  await prisma.auditLog.create({ data: { adminId, action: `PREORDER_${to}`, entity: 'PreOrder', entityId: id } });
}

/** Менеджер клиентпен сөйлесіп, предзаказды растады. Қалдыққа әсер жоқ. */
export const confirmPreOrder = (id: string, adminId: string) => setStatus(id, ['NEW'], 'CONFIRMED', adminId);

export const cancelPreOrder = (id: string, adminId: string) => setStatus(id, ['NEW', 'CONFIRMED'], 'CANCELLED', adminId);

export const convertSchema = z.array(
  z.object({ productId: z.string().min(1), quantity: z.coerce.number().int().min(0).max(100000) }),
);

/**
 * Поставка келгеннен кейін: предзаказ → тапсырыс (CONFIRMED, қалдықтан бронь).
 * Менеджер әр позицияның санын азайта алады (мыс. поставка толық келмесе). 0 — позиция алынбайды.
 * Қалдық жетпесе — ештеңе өзгермейді, қате қайтады.
 */
export async function convertPreOrderToOrder(preOrderId: string, rawQty: unknown, adminId: string) {
  const quantities = convertSchema.parse(rawQty);
  return prisma.$transaction(async (tx) => {
    const po = await tx.preOrder.findUnique({
      where: { id: preOrderId },
      include: { supply: true, items: { include: { product: true } } },
    });
    if (!po) throw new PreOrderError('Предзаказ не найден');
    if (po.supply.status !== 'ARRIVED' && po.supply.status !== 'COMPLETED') {
      throw new PreOrderError('Предзаказ можно превратить в заказ только после прихода поставки');
    }

    const cas = await tx.preOrder.updateMany({
      where: { id: po.id, status: { in: ['NEW', 'CONFIRMED'] } },
      data: { status: 'CONVERTED' },
    });
    if (cas.count !== 1) throw new PreOrderError('Предзаказ уже обработан');

    const qtyByProduct = new Map(quantities.map((q) => [q.productId, q.quantity]));
    const lines = po.items
      .map((i) => {
        const quantity = qtyByProduct.get(i.productId) ?? i.quantity;
        if (quantity > i.quantity) throw new PreOrderError(`${productLabel(i.product)}: нельзя больше, чем в предзаказе`);
        return { item: i, quantity };
      })
      .filter((l) => l.quantity > 0);
    if (!lines.length) throw new PreOrderError('Все позиции равны 0 — отмените предзаказ вместо этого');

    const orderItems = lines.map(({ item, quantity }) => {
      const price = salePrice(item.product);
      if (price === null) throw new PreOrderError(`${productLabel(item.product)}: не указана цена`);
      return {
        productId: item.productId,
        saleUnit: item.product.saleUnit,
        quantity,
        unitPrice: price,
        lineTotal: price * quantity,
        productLabel: productLabel(item.product),
      };
    });

    const order = await tx.order.create({
      data: {
        number: await nextNumber(tx, 'order'),
        customerId: po.customerId,
        source: 'PREORDER',
        supplyId: po.supplyId,
        preOrderId: po.id,
        neededBy: po.neededBy,
        comment: po.comment,
        totalAmount: orderItems.reduce((s, i) => s + i.lineTotal, 0),
        handledById: adminId,
        items: { create: orderItems },
      },
    });
    // Бронь: available − , reserved +. Қалдық жетпесе — бүкіл транзакция кері қайтады.
    await changeOrderStatusInTx(tx, order.id, 'CONFIRMED', { adminId, note: `Из предзаказа ${po.number}` });
    await tx.auditLog.create({
      data: { adminId, action: 'PREORDER_CONVERTED', entity: 'PreOrder', entityId: po.id, diff: { orderId: order.id } },
    });
    return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
  });
}
