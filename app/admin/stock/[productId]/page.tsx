import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdjustStockForm } from '@/components/admin/adjust-stock-form';
import { LevelBadge } from '@/components/admin/level-badge';
import { Card, Empty, PageHeader } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { MOVE_TYPE, STOCK_REASON, qtyUnit } from '@/lib/labels';
import { unitLabel } from '@/lib/pricing';
import { requireAdmin } from '@/server/auth/session';
import { prisma } from '@/server/db';
import { productLabel } from '@/server/services/products';
import { getLowStockThreshold } from '@/server/services/settings';
import { effectiveThreshold, stockLevel } from '@/server/services/stock';

export const dynamic = 'force-dynamic';

const PLUS = new Set(['SUPPLY_IN', 'RETURN_IN', 'ADJUSTMENT_IN']);

export default async function ProductStockPage({ params }: { params: Promise<{ productId: string }> }) {
  await requireAdmin();
  const { productId } = await params;
  const [product, threshold] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      include: {
        stock: true,
        category: true,
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: { admin: { select: { email: true } }, order: { select: { number: true } }, supply: { select: { id: true, title: true } } },
        },
      },
    }),
    getLowStockThreshold(),
  ]);
  if (!product) notFound();

  const s = product.stock;
  const physical = s?.physicalQuantity ?? 0;
  const reserved = s?.reservedQuantity ?? 0;
  const available = s?.availableQuantity ?? 0;
  const t = effectiveThreshold(s?.lowStockThreshold, threshold);
  const u = product.saleUnit;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={productLabel(product)}
        back={{ href: '/admin/stock', label: 'Остатки' }}
        description={<>Порог LOW STOCK: {t} · <LevelBadge level={stockLevel(available, t)} /></>}
      />

      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: 'Физический остаток', value: physical },
          { label: 'Забронировано', value: reserved },
          { label: 'Доступно', value: available, strong: true },
        ].map((b) => (
          <div key={b.label} className={`rounded-lg border p-3 md:p-4 ${b.strong ? 'border-primary/40 bg-accent' : 'bg-card'}`}>
            <div className="text-xs text-muted-foreground md:text-sm">{b.label}</div>
            <div className="mt-1 font-mono text-2xl font-semibold md:text-3xl">{b.value}</div>
            <div className="text-xs text-muted-foreground">{unitLabel(u, b.value)}</div>
          </div>
        ))}
      </div>
      <p className="-mt-3 mb-6 text-center font-mono text-xs text-muted-foreground">
        {physical} = {reserved} + {available}
      </p>

      <div className="grid gap-6 md:grid-cols-[20rem_1fr]">
        <Card title="Изменить остаток" description="Каждое изменение сохраняется в журнале.">
          <AdjustStockForm productId={product.id} unit={qtyUnit(u)} />
        </Card>

        <Card title="Журнал движений">
          {product.stockMovements.length === 0 ? (
            <Empty>Движений пока нет.</Empty>
          ) : (
            <ul className="divide-y text-sm">
              {product.stockMovements.map((m) => (
                <li key={m.id} className="py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">
                      {m.reason ? STOCK_REASON[m.reason].label : MOVE_TYPE[m.type]}
                      {m.order && <span className="font-normal text-muted-foreground"> · {m.order.number}</span>}
                      {m.supply && (
                        <Link href={`/admin/supplies/${m.supply.id}`} className="font-normal text-muted-foreground underline">
                          {' '}· {m.supply.title ?? 'поставка'}
                        </Link>
                      )}
                    </span>
                    <span className={`font-mono font-semibold ${PLUS.has(m.type) ? 'text-[hsl(var(--success))]' : m.type === 'RESERVE' || m.type === 'RELEASE' ? '' : 'text-destructive'}`}>
                      {m.type === 'RESERVE' ? '🔒 ' : m.type === 'RELEASE' ? '🔓 ' : PLUS.has(m.type) ? '+' : '−'}
                      {m.quantity}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(m.createdAt)} · {m.admin?.email ?? 'система'} · после: {m.physicalAfter} / {m.reservedAfter} / {m.availableAfter}
                  </div>
                  {m.note && <div className="text-xs">💬 {m.note}</div>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted-foreground">«после» = физический / бронь / доступно</p>
        </Card>
      </div>
    </div>
  );
}
