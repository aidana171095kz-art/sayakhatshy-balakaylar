import Link from 'next/link';
import { LevelBadge } from '@/components/admin/level-badge';
import { Empty, PageHeader } from '@/components/ui';
import { qtyUnit } from '@/lib/labels';
import { requireAdmin } from '@/server/auth/session';
import { listProducts, productLabel } from '@/server/services/products';
import { getLowStockThreshold } from '@/server/services/settings';
import { effectiveThreshold, stockLevel } from '@/server/services/stock';

export const dynamic = 'force-dynamic';

const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'low', label: '⚠️ Мало' },
  { key: 'out', label: '🔴 Нет' },
];

export default async function StockPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  await requireAdmin();
  const { level: filter = 'all' } = await searchParams;
  const [products, threshold] = await Promise.all([listProducts({ status: 'ACTIVE' }), getLowStockThreshold()]);

  const rows = products
    .map((p) => {
      const s = p.stock;
      const available = s?.availableQuantity ?? 0;
      return {
        p,
        physical: s?.physicalQuantity ?? 0,
        reserved: s?.reservedQuantity ?? 0,
        available,
        level: stockLevel(available, effectiveThreshold(s?.lowStockThreshold, threshold)),
      };
    })
    .filter((r) => filter === 'all' || (filter === 'low' && r.level === 'LOW') || (filter === 'out' && r.level === 'OUT'));

  return (
    <div>
      <PageHeader
        title="Остатки"
        description={
          <>
            <b>Физический</b> = на складе · <b>Забронировано</b> = подтверждённые заказы · <b>Доступно</b> = можно продать.
            Клиенты видят только «Доступно».
          </>
        }
      />
      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === 'all' ? '/admin/stock' : `/admin/stock?level=${f.key}`}
            className={`rounded-full border px-3 py-1 text-sm ${filter === f.key ? 'border-primary bg-accent font-medium' : 'hover:bg-muted'}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Empty>{filter === 'all' ? 'Активных товаров нет.' : 'Таких товаров нет 👍'}</Empty>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="hidden grid-cols-[1fr_7rem_7rem_7rem_9rem] gap-2 border-b px-4 py-2 text-xs font-medium uppercase text-muted-foreground md:grid">
            <span>Товар</span>
            <span className="text-right">Физический</span>
            <span className="text-right">Забронировано</span>
            <span className="text-right">Доступно</span>
            <span />
          </div>
          <ul className="divide-y">
            {rows.map(({ p, physical, reserved, available, level }) => (
              <li key={p.id}>
                <Link
                  href={`/admin/stock/${p.id}`}
                  className="grid grid-cols-3 gap-2 px-4 py-3 hover:bg-muted/50 md:grid-cols-[1fr_7rem_7rem_7rem_9rem] md:items-center"
                >
                  <span className="col-span-3 font-medium md:col-span-1">
                    {p.category.emoji} {productLabel(p)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">({qtyUnit(p.saleUnit)})</span>
                  </span>
                  <span className="md:text-right">
                    <span className="block text-xs text-muted-foreground md:hidden">Физический</span>
                    <span className="font-mono">{physical}</span>
                  </span>
                  <span className="md:text-right">
                    <span className="block text-xs text-muted-foreground md:hidden">Бронь</span>
                    <span className="font-mono">{reserved}</span>
                  </span>
                  <span className="md:text-right">
                    <span className="block text-xs text-muted-foreground md:hidden">Доступно</span>
                    <span className="font-mono text-lg font-semibold">{available}</span>
                  </span>
                  <span className="col-span-3 md:col-span-1 md:text-right">
                    <LevelBadge level={level} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
