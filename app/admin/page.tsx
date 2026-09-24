import { prisma } from '@/server/db';
import { whatsappConfigStatus } from '@/server/env';
import { requireAdmin } from '@/server/auth/session';
import { getLowStockThreshold } from '@/server/services/settings';

export const dynamic = 'force-dynamic';

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: 'warn' }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-semibold ${tone === 'warn' ? 'text-[hsl(var(--warning))]' : ''}`}>
        {value}
      </div>
    </div>
  );
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string; pw?: string }> }) {
  const admin = await requireAdmin();
  const { denied, pw } = await searchParams;

  const [categories, products, customers, newOrders, preorders, stocks, threshold] = await Promise.all([
    prisma.category.count({ where: { isActive: true } }),
    prisma.product.count({ where: { status: 'ACTIVE' } }),
    prisma.customer.count(),
    prisma.order.count({ where: { status: { in: ['NEW', 'PENDING'] } } }),
    prisma.preOrder.count({ where: { status: { in: ['NEW', 'CONFIRMED'] } } }),
    prisma.stock.findMany({
      where: { product: { status: 'ACTIVE' } },
      select: { availableQuantity: true, lowStockThreshold: true },
    }),
    getLowStockThreshold(),
  ]);
  const lowStock = stocks.filter((s) => s.availableQuantity <= (s.lowStockThreshold ?? threshold)).length;
  const whatsapp = admin.role === 'OWNER' ? whatsappConfigStatus() : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Здравствуйте, {admin.name}.</p>
      </div>

      {pw === 'changed' && (
        <p className="rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">✅ Пароль изменён.</p>
      )}

      {denied && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Этот раздел доступен только владельцу.
        </p>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Категорий" value={categories} />
        <Stat label="Активных товаров" value={products} />
        <Stat label="Клиентов" value={customers} />
        <Stat label="Новых заказов" value={newOrders} />
        <Stat label="Активных предзаказов" value={preorders} />
        <Stat label={`⚠️ LOW STOCK (≤ ${threshold})`} value={lowStock} tone={lowStock ? 'warn' : undefined} />
      </section>

      {admin.role === 'OWNER' && (
        <section className="rounded-lg border bg-card p-4">
          <h2 className="font-medium">Подключение WhatsApp</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Показывается только наличие ключей, сами значения не отображаются.
          </p>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {whatsapp.map((w) => (
              <li key={w.key} className="flex items-center gap-2 font-mono text-xs">
                <span>{w.present ? '✅' : '⬜'}</span>
                {w.key}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
