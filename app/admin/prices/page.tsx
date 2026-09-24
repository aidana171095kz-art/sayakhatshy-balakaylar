import { PriceRow } from '@/components/admin/price-row';
import { Empty, LinkButton, PageHeader } from '@/components/ui';
import { requireAdmin } from '@/server/auth/session';
import { listProducts, productLabel } from '@/server/services/products';

export const dynamic = 'force-dynamic';

export default async function PricesPage() {
  await requireAdmin(['OWNER']);
  const products = await listProducts({ status: 'ACTIVE' });

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Цены"
        description="Клиенты всегда видят только текущую цену. Каждое изменение сохраняется в истории."
        actions={<LinkButton href="/admin/prices/history" variant="secondary">История цен</LinkButton>}
      />
      {products.length === 0 ? (
        <Empty>Активных товаров нет.</Empty>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="hidden grid-cols-[1fr_9rem_9rem_7rem] gap-2 border-b px-4 py-2 text-xs font-medium uppercase text-muted-foreground md:grid">
            <span>Товар</span>
            <span>За упаковку, ₸</span>
            <span>За штуку, ₸</span>
            <span />
          </div>
          <div className="divide-y">
            {products.map((p) => (
              <PriceRow
                key={p.id}
                productId={p.id}
                label={`${p.category.emoji ?? ''} ${productLabel(p)}`}
                meta={
                  p.saleUnit === 'PACKAGE'
                    ? `продаётся упаковками${p.packageQuantity ? ` · ${p.packageQuantity} шт/уп.` : ''}`
                    : 'продаётся поштучно'
                }
                saleUnit={p.saleUnit}
                pricePerUnit={p.pricePerUnit}
                pricePerPackage={p.pricePerPackage}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
