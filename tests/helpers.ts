import { prisma } from '@/server/db';

export async function resetDb() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  if (list) await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

let seq = 0;

export async function makeProduct(stock: { physical: number; reserved?: number }) {
  seq++;
  const category = await prisma.category.create({ data: { name: `Cat ${seq}`, slug: `cat-${seq}` } });
  const reserved = stock.reserved ?? 0;
  return prisma.product.create({
    data: {
      categoryId: category.id,
      name: 'Роза',
      variety: 'Red',
      lengthCm: 70,
      packageQuantity: 20,
      pricePerPackage: 25000,
      stock: {
        create: {
          physicalQuantity: stock.physical,
          reservedQuantity: reserved,
          availableQuantity: stock.physical - reserved,
        },
      },
    },
  });
}

export async function makeOrder(productId: string, quantity: number, totalAmount = quantity * 25000) {
  seq++;
  const customer = await prisma.customer.create({ data: { waId: `7700000${String(seq).padStart(4, '0')}` } });
  return prisma.order.create({
    data: {
      number: `TF-T${seq}`,
      customerId: customer.id,
      totalAmount,
      items: {
        create: [{ productId, quantity, unitPrice: 25000, lineTotal: totalAmount, productLabel: 'Роза Red 70 см' }],
      },
    },
  });
}

export function stockOf(productId: string) {
  return prisma.stock.findUniqueOrThrow({ where: { productId } });
}

export async function makeAdmin() {
  seq++;
  return prisma.admin.create({
    data: { email: `admin${seq}@test.local`, name: 'Test', passwordHash: 'x', role: 'OWNER', mustChangePassword: false },
  });
}

export async function makeCategory() {
  seq++;
  return prisma.category.create({ data: { name: `Роза ${seq}`, slug: `rose-${seq}` } });
}
