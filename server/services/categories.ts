import { z } from 'zod';
import { prisma } from '../db';

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, 'Укажите название').max(60),
  emoji: z.preprocess((v) => (v == null || (typeof v === 'string' && v.trim() === '') ? null : v), z.string().trim().max(8).nullable()),
  allowMonobouquet: z.boolean(),
});

function slugify(name: string) {
  const map: Record<string, string> = {
    а: 'a', ә: 'a', б: 'b', в: 'v', г: 'g', ғ: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', і: 'i',
    к: 'k', қ: 'q', л: 'l', м: 'm', н: 'n', ң: 'n', о: 'o', ө: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ұ: 'u',
    ү: 'u', ф: 'f', х: 'h', һ: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  const base = name
    .toLowerCase()
    .split('')
    .map((c) => map[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base || 'category';
}

export function listCategories() {
  return prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { products: true } } },
  });
}

export async function createCategory(raw: unknown, adminId: string) {
  const input = categoryInputSchema.parse(raw);
  const base = slugify(input.name);
  let slug = base;
  for (let i = 2; await prisma.category.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
  const max = await prisma.category.aggregate({ _max: { sortOrder: true } });
  const category = await prisma.category.create({
    data: { ...input, slug, sortOrder: (max._max.sortOrder ?? 0) + 10 },
  });
  await prisma.auditLog.create({ data: { adminId, action: 'CATEGORY_CREATED', entity: 'Category', entityId: category.id } });
  return category;
}

export async function updateCategory(id: string, raw: unknown, adminId: string) {
  const input = categoryInputSchema.parse(raw);
  const category = await prisma.category.update({ where: { id }, data: input });
  await prisma.auditLog.create({ data: { adminId, action: 'CATEGORY_UPDATED', entity: 'Category', entityId: id } });
  return category;
}

export async function setCategoryActive(id: string, isActive: boolean, adminId: string) {
  const category = await prisma.category.update({ where: { id }, data: { isActive } });
  await prisma.auditLog.create({ data: { adminId, action: isActive ? 'CATEGORY_ACTIVATED' : 'CATEGORY_DEACTIVATED', entity: 'Category', entityId: id } });
  return category;
}
