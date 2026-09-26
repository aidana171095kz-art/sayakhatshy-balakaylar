import { ProductForm } from '@/components/admin/product-form';
import { PageHeader } from '@/components/ui';
import { requireAdmin } from '@/server/auth/session';
import { listCategories } from '@/server/services/categories';
import { getLowStockThreshold } from '@/server/services/settings';
import { isBlobConfigured } from '@/server/services/uploads';

export default async function NewProductPage() {
  await requireAdmin(['OWNER']);
  const [categories, threshold] = await Promise.all([listCategories(), getLowStockThreshold()]);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Новый товар" back={{ href: '/admin/products', label: 'Товары' }} />
      <ProductForm categories={categories} blobReady={isBlobConfigured()} globalThreshold={threshold} />
    </div>
  );
}
