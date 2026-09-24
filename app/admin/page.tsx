import Link from 'next/link';
import { Alert, Card, PageHeader, Stat } from '@/components/ui';
import { formatDay } from '@/lib/format';
import { requireAdmin } from '@/server/auth/session';
import { type Period, getDashboard } from '@/server/services/dashboard';

export const dynamic = 'force-dynamic';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Сегодня' },
  { key: 'week', label: 'Эта неделя' },
  { key: 'month', label: 'Этот месяц' },
];

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string; pw?: string; period?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const period: Period = PERIODS.some((p) => p.key === sp.period) ? (sp.period as Period) : 'today';
  const d = await getDashboard(period);
  const periodLabel = PERIODS.find((p) => p.key === period)!.label.toLowerCase();

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description={`Здравствуйте! ${admin.email}`} />

      {sp.pw === 'changed' && <Alert tone="success">✅ Пароль изменён.</Alert>}
      {sp.denied && <Alert tone="error">Этот раздел доступен только владельцу.</Alert>}

      {d.nextSupply && (
        <Link href={`/admin/supplies/${d.nextSupply.id}`} className="block rounded-lg border border-primary/30 bg-accent p-4 hover:border-primary">
          <div className="text-sm text-accent-foreground">📦 Ближайшая поставка</div>
          <div className="text-lg font-semibold">
            {d.nextSupply.title ?? 'Поставка'} — {formatDay(d.nextSupply.expectedDate)}
          </div>
          <div className="text-sm">{d.nextSupply.preorderOpen ? '🟢 Предзаказ открыт' : 'Предзаказ закрыт'}</div>
        </Link>
      )}

      <section>
        <h2 className="mb-2 text-sm font-medium uppercase text-muted-foreground">Склад — сейчас</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="📦 Поставки в работе" value={d.activeSupplies} href="/admin/supplies" />
          <Stat label="🌷 Активные товары" value={d.alerts.activeProducts} href="/admin/products" />
          <Stat label="⚠️ Low stock" value={d.alerts.low.length} tone={d.alerts.low.length ? 'warn' : undefined} href="/admin/stock?level=low" />
          <Stat label="🔴 Out of stock" value={d.alerts.out.length} tone={d.alerts.out.length ? 'danger' : undefined} href="/admin/stock?level=out" />
        </div>
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium uppercase text-muted-foreground">Продажи — {periodLabel}</h2>
          <div className="flex gap-1 rounded-lg border bg-card p-1">
            {PERIODS.map((p) => (
              <Link
                key={p.key}
                href={p.key === 'today' ? '/admin' : `/admin?period=${p.key}`}
                className={`rounded-md px-3 py-1 text-sm ${period === p.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                {p.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="📋 Новые заказы" value={d.newOrders} hint="раздел — этап 5" />
          <Stat label="📝 Предзаказы" value={d.preorders} href="/admin/supplies" />
          <Stat label="👥 Новые клиенты" value={d.newCustomers} hint="раздел — этап 5" />
          <Stat label="💐 Монобукеты" value={d.monobouquets} href="/admin/monobouquets" />
        </div>
      </section>

      {(d.alerts.out.length > 0 || d.alerts.low.length > 0) && (
        <Card title="Требует внимания">
          <ul className="divide-y text-sm">
            {[...d.alerts.out, ...d.alerts.low].map((r) => (
              <li key={r.id}>
                <Link href={`/admin/stock/${r.id}`} className="flex items-center justify-between gap-2 py-2 hover:underline">
                  <span>
                    {r.level === 'OUT' ? '🔴' : '⚠️'} {r.emoji} {r.label}
                  </span>
                  <span className="font-mono">
                    {r.available} {r.saleUnit === 'PACKAGE' ? 'уп.' : 'шт.'}
                    <span className="text-xs text-muted-foreground"> / порог {r.threshold}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
