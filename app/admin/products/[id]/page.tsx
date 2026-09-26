import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductForm } from '@/components/admin/product-form';
import { PageHeader } from '@/components/ui';
import { requireAdmin } from '@/server/auth/session';
import { prisma } from '@/server/db';
import { listCategories } from '@/server/services/categories';
import { productLabel } from '@/server/services/products';
import { getLowStockThreshold } from '@/server/services/settings';
import { isBlobConfigured } from '@/server/services/uploads';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(['OWNER']);
  const { id } = await params;
  const [product, categories, threshold] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { stock: true } }),
    listCategories(),
    getLowStockThreshold(),
  ]);
  if (!product) notFound();
  return (
    <div className="max-w-3xl">
      <PageHeader
        title={productLabel(product)}
        back={{ href: '/admin/products', label: 'Товары' }}
        description={
          <>
            <Link href={`/admin/stock/${product.id}`} className="underline">Остаток и журнал</Link>
            {' · '}
            <Link href={`/admin/prices/history?product=${product.id}`} className="underline">История цен</Link>
          </>
        }
      />
      <ProductForm product={product} categories={categories} blobReady={isBlobConfigured()} globalThreshold={threshold} />
    </div>
  );
}
