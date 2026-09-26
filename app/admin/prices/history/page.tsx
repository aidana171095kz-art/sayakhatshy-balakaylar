import { Empty, PageHeader } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { PRICE_TYPE } from '@/lib/labels';
import { formatTenge } from '@/lib/pricing';
import { requireAdmin } from '@/server/auth/session';
import { getPriceHistory, productLabel } from '@/server/services/products';

export const dynamic = 'force-dynamic';

export default async function PriceHistoryPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  await requireAdmin(['OWNER']);
  const { product } = await searchParams;
  const rows = await getPriceHistory(product || undefined, 300);

  return (
    <div className="max-w-4xl">
      <PageHeader title="История цен" back={{ href: '/admin/prices', label: 'Цены' }} />
      {rows.length === 0 ? (
        <Empty>Изменений цен пока нет.</Empty>
      ) : (
        <ul className="divide-y rounded-lg border bg-card text-sm">
          {rows.map((h) => (
            <li key={h.id} className="grid gap-1 px-4 py-3 md:grid-cols-[1fr_8rem_12rem] md:items-center">
              <div>
                <div className="font-medium">{productLabel(h.product)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDateTime(h.createdAt)} · {h.changedBy?.email ?? '—'}
                </div>
              </div>
              <div className="text-muted-foreground">{PRICE_TYPE[h.priceType]}</div>
              <div className="font-mono">
                <span className="text-muted-foreground line-through">{h.oldPrice === null ? '—' : formatTenge(h.oldPrice)}</span>
                {' → '}
                <b>{h.newPrice === null ? 'удалена' : formatTenge(h.newPrice)}</b>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
