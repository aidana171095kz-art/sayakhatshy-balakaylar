import Link from 'next/link';
import { Badge, Empty, LinkButton, PageHeader } from '@/components/ui';
import { formatDay } from '@/lib/format';
import { SUPPLY_STATUS } from '@/lib/labels';
import { requireAdmin } from '@/server/auth/session';
import { listSupplies } from '@/server/services/supplies';

export const dynamic = 'force-dynamic';

export default async function SuppliesPage() {
  await requireAdmin();
  const supplies = await listSupplies();
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Поставки"
        description="Поставки из Китая: товары → предзаказ → приход на склад."
        actions={<LinkButton href="/admin/supplies/new">+ Новая поставка</LinkButton>}
      />
      {supplies.length === 0 ? (
        <Empty>Поставок пока нет. Создайте первую — клиенты смогут делать предзаказ.</Empty>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {supplies.map((s) => {
            const st = SUPPLY_STATUS[s.status];
            const ordered = s.items.reduce((a, i) => a + (i.expectedQty ?? 0), 0);
            const received = s.items.reduce((a, i) => a + (i.receivedQty ?? 0), 0);
            return (
              <li key={s.id}>
                <Link href={`/admin/supplies/${s.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-muted/50">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">📦 {s.title ?? 'Поставка'}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDay(s.expectedDate)} · позиций: {s.items.length} · заказано: {ordered}
                      {s.arrivedAt && ` · пришло: ${received}`}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.preorderOpen && s.status !== 'PREORDER_OPEN' && <Badge tone="green">🟢 Предзаказ открыт</Badge>}
                    <Badge tone={st.tone}>{s.status === 'PREORDER_OPEN' ? '🟢 ' : ''}{st.label}</Badge>
                    {s._count.preOrders > 0 && <Badge tone="yellow">📝 {s._count.preOrders}</Badge>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
