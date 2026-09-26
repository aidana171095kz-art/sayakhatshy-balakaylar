import { Prisma, type PriceType, type Product } from '@prisma/client';
import { z } from 'zod';
import { prisma, type Tx } from '../db';
import { applyMovement } from './stock';

// ───────── Валидация ─────────

const optionalText = (max: number) =>
  z.preprocess((v) => (v == null || (typeof v === 'string' && v.trim() === '') ? null : v), z.string().trim().max(max).nullable());

const optionalInt = (min: number, max: number, msg: string) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.coerce.number({ invalid_type_error: msg }).int(msg).min(min, msg).max(max, msg).nullable(),
  );

export const productInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Укажите название').max(100),
    categoryId: z.string().min(1, 'Выберите категорию'),
    variety: optionalText(100),
    color: optionalText(50),
    lengthCm: optionalInt(1, 300, 'Длина — целое число от 1 до 300 см'),
    saleUnit: z.enum(['PACKAGE', 'UNIT'], { message: 'Выберите единицу продажи' }),
    packageQuantity: optionalInt(1, 10000, 'Количество в упаковке — целое число больше 0'),
    pricePerUnit: optionalInt(0, 100_000_000, 'Цена за штуку — целое число ₸'),
    pricePerPackage: optionalInt(0, 100_000_000, 'Цена за упаковку — целое число ₸'),
    minOrderQty: z.coerce.number().int().min(1, 'Минимальный заказ — не меньше 1').max(10000),
    status: z.enum(['ACTIVE', 'INACTIVE']),
    description: optionalText(1000),
    photoUrl: z.preprocess(
      (v) => (v == null || (typeof v === 'string' && v.trim() === '') ? null : v),
      z.string().trim().url('Неверная ссылка на фото').startsWith('https://', 'Ссылка на фото должна начинаться с https://').max(1000).nullable(),
    ),
    lowStockThreshold: optionalInt(0, 10000, 'Порог LOW STOCK — целое число от 0'),
  })
  .superRefine((p, ctx) => {
    if (p.saleUnit === 'PACKAGE') {
      if (p.packageQuantity === null) {
        ctx.addIssue({ code: 'custom', path: ['packageQuantity'], message: 'Укажите, сколько штук в упаковке' });
      }
      if (p.pricePerPackage === null) {
        ctx.addIssue({ code: 'custom', path: ['pricePerPackage'], message: 'Укажите цену за упаковку' });
      }
    }
    if (p.saleUnit === 'UNIT' && p.pricePerUnit === null) {
      ctx.addIssue({ code: 'custom', path: ['pricePerUnit'], message: 'Укажите цену за штуку' });
    }
  });

export type ProductInput = z.infer<typeof productInputSchema>;

export const initialStockSchema = optionalInt(0, 100000, 'Начальный остаток — целое число от 0');

export const priceUpdateSchema = z.object({
  pricePerUnit: optionalInt(0, 100_000_000, 'Цена за штуку — целое число ₸'),
  pricePerPackage: optionalInt(0, 100_000_000, 'Цена за упаковку — целое число ₸'),
});

export class ProductError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProductError';
  }
}

// ───────── Баға тарихы ─────────

async function recordPriceChanges(
  tx: Tx,
  productId: string,
  before: { pricePerUnit: number | null; pricePerPackage: number | null },
  after: { pricePerUnit: number | null; pricePerPackage: number | null },
  adminId: string,
) {
  const changes: { priceType: PriceType; oldPrice: number | null; newPrice: number | null }[] = [];
  if (before.pricePerUnit !== after.pricePerUnit) {
    changes.push({ priceType: 'PRICE_PER_UNIT', oldPrice: before.pricePerUnit, newPrice: after.pricePerUnit });
  }
  if (before.pricePerPackage !== after.pricePerPackage) {
    changes.push({ priceType: 'PRICE_PER_PACKAGE', oldPrice: before.pricePerPackage, newPrice: after.pricePerPackage });
  }
  if (changes.length) {
    await tx.priceHistory.createMany({ data: changes.map((c) => ({ ...c, productId, changedById: adminId })) });
  }
  return changes.length;
}

function productData(input: ProductInput) {
  return {
    name: input.name,
    categoryId: input.categoryId,
    variety: input.variety,
    color: input.color,
    lengthCm: input.lengthCm,
    saleUnit: input.saleUnit,
    packageQuantity: input.packageQuantity,
    pricePerUnit: input.pricePerUnit,
    pricePerPackage: input.pricePerPackage,
    minOrderQty: input.minOrderQty,
    status: input.status,
    description: input.description,
    photoUrl: input.photoUrl,
  } satisfies Prisma.ProductUncheckedUpdateInput;
}

// ───────── CRUD ─────────

export async function createProduct(raw: unknown, adminId: string, initialStock?: number | null): Promise<Product> {
  const input = productInputSchema.parse(raw);
  return prisma.$transaction(async (tx) => {
    const category = await tx.category.findUnique({ where: { id: input.categoryId } });
    if (!category) throw new ProductError('Категория не найдена');

    const product = await tx.product.create({ data: productData(input) as Prisma.ProductUncheckedCreateInput });
    await tx.stock.create({ data: { productId: product.id, lowStockThreshold: input.lowStockThreshold } });
    await recordPriceChanges(tx, product.id, { pricePerUnit: null, pricePerPackage: null }, product, adminId);

    if (initialStock && initialStock > 0) {
      await applyMovement(tx, {
        productId: product.id,
        type: 'SUPPLY_IN',
        reason: 'RECEIPT',
        quantity: initialStock,
        adminId,
        note: 'Начальный остаток',
      });
    }
    await tx.auditLog.create({
      data: { adminId, action: 'PRODUCT_CREATED', entity: 'Product', entityId: product.id, diff: { name: product.name } },
    });
    return product;
  });
}

export async function updateProduct(productId: string, raw: unknown, adminId: string): Promise<Product> {
  const input = productInputSchema.parse(raw);
  return prisma.$transaction(async (tx) => {
    const before = await tx.product.findUnique({ where: { id: productId } });
    if (!before) throw new ProductError('Товар не найден');
    const category = await tx.category.findUnique({ where: { id: input.categoryId } });
    if (!category) throw new ProductError('Категория не найдена');

    const after = await tx.product.update({ where: { id: productId }, data: productData(input) });
    await tx.stock.upsert({
      where: { productId },
      create: { productId, lowStockThreshold: input.lowStockThreshold },
      update: { lowStockThreshold: input.lowStockThreshold },
    });
    await recordPriceChanges(tx, productId, before, after, adminId);
    await tx.auditLog.create({ data: { adminId, action: 'PRODUCT_UPDATED', entity: 'Product', entityId: productId } });
    return after;
  });
}

export async function setProductStatus(productId: string, status: 'ACTIVE' | 'INACTIVE', adminId: string) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.update({ where: { id: productId }, data: { status } });
    await tx.auditLog.create({
      data: { adminId, action: status === 'ACTIVE' ? 'PRODUCT_ACTIVATED' : 'PRODUCT_DEACTIVATED', entity: 'Product', entityId: productId },
    });
    return product;
  });
}

/** Тек баға өзгерту (Цены экраны). Сату бірлігінің бағасын өшіруге болмайды. */
export async function updatePrices(productId: string, raw: unknown, adminId: string): Promise<Product> {
  const input = priceUpdateSchema.parse(raw);
  return prisma.$transaction(async (tx) => {
    const before = await tx.product.findUnique({ where: { id: productId } });
    if (!before) throw new ProductError('Товар не найден');
    if (before.saleUnit === 'PACKAGE' && input.pricePerPackage === null) {
      throw new ProductError('Товар продаётся упаковками — цена за упаковку обязательна');
    }
    if (before.saleUnit === 'UNIT' && input.pricePerUnit === null) {
      throw new ProductError('Товар продаётся поштучно — цена за штуку обязательна');
    }
    const after = await tx.product.update({ where: { id: productId }, data: input });
    const changed = await recordPriceChanges(tx, productId, before, after, adminId);
    if (changed) {
      await tx.auditLog.create({ data: { adminId, action: 'PRICE_UPDATED', entity: 'Product', entityId: productId, diff: input } });
    }
    return after;
  });
}

// ───────── Оқу ─────────

export const productWithStock = { category: true, stock: true } satisfies Prisma.ProductInclude;

export async function listProducts(filter: { categoryId?: string; status?: 'ACTIVE' | 'INACTIVE'; q?: string } = {}) {
  const where: Prisma.ProductWhereInput = {};
  if (filter.categoryId) where.categoryId = filter.categoryId;
  if (filter.status) where.status = filter.status;
  if (filter.q) {
    where.OR = [
      { name: { contains: filter.q, mode: 'insensitive' } },
      { variety: { contains: filter.q, mode: 'insensitive' } },
      { color: { contains: filter.q, mode: 'insensitive' } },
    ];
  }
  return prisma.product.findMany({
    where,
    include: productWithStock,
    orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }, { lengthCm: 'asc' }],
  });
}

/** Клиентке (WhatsApp каталогына) көрінетін тауарлар: тек ACTIVE және белсенді категорияда. */
export const catalogWhere: Prisma.ProductWhereInput = { status: 'ACTIVE', category: { isActive: true } };

export function listCatalogProducts() {
  return prisma.product.findMany({ where: catalogWhere, include: productWithStock, orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }] });
}

export function getPriceHistory(productId?: string, take = 100) {
  return prisma.priceHistory.findMany({
    where: productId ? { productId } : undefined,
    include: { product: { select: { id: true, name: true, variety: true, lengthCm: true } }, changedBy: { select: { email: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take,
  });
}

/** "Роза Red 60 см" */
export function productLabel(p: { name: string; variety?: string | null; color?: string | null; lengthCm?: number | null }) {
  return [p.name, p.variety, p.variety ? null : p.color, p.lengthCm ? `${p.lengthCm} см` : null].filter(Boolean).join(' ');
}
