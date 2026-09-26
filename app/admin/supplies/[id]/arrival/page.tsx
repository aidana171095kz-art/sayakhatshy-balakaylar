import { notFound, redirect } from 'next/navigation';
import { ArrivalForm } from '@/components/admin/supply-forms';
import { PageHeader } from '@/components/ui';
import { formatDay } from '@/lib/format';
import { qtyUnit } from '@/lib/labels';
import { requireAdmin } from '@/server/auth/session';
import { productLabel } from '@/server/services/products';
import { allowedActions, getSupply, preorderTotals } from '@/server/services/supplies';

export const dynamic = 'force-dynamic';

export default async function ArrivalPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supply = await getSupply(id);
  if (!supply) notFound();
  if (!allowedActions(supply.status, supply.preorderOpen).includes('ARRIVE')) redirect(`/admin/supplies/${id}`);
  const totals = (await preorderTotals([id])).get(id);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="📦 Поставка пришла"
        back={{ href: `/admin/supplies/${id}`, label: supply.title ?? 'Поставка' }}
        description={`${supply.title ?? 'Поставка'} · ожидалась ${formatDay(supply.expectedDate)}`}
      />
      {supply.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">В поставке нет товаров.</p>
      ) : (
        <ArrivalForm
          supplyId={id}
          items={supply.items.map((i) => ({
            id: i.id,
            label: productLabel(i.product),
            unit: qtyUnit(i.product.saleUnit),
            expectedQty: i.expectedQty,
            preordered: totals?.get(i.productId) ?? 0,
          }))}
        />
      )}
    </div>
  );
}
