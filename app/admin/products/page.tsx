import Link from 'next/link';
import { Alert, Badge, Empty, LinkButton, PageHeader, inputClass } from '@/components/ui';
import { formatTenge, salePrice } from '@/lib/pricing';
import { qtyUnit } from '@/lib/labels';
import { requireAdmin } from '@/server/auth/session';
import { listCategories } from '@/server/services/categories';
import { listProducts, productLabel } from '@/server/services/products';
import { getLowStockThreshold } from '@/server/services/settings';
import { effectiveThreshold, stockLevel } from '@/server/services/stock';
import { setProductStatusAction } from './actions';
import { SubmitButton } from '@/components/admin/submit-button';

export const dynamic = 'force-dynamic';

type Search = Promise<{ category?: string; status?: string; q?: string; saved?: string }>;

export default async function ProductsPage({ searchParams }: { searchParams: Search }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const status = sp.status === 'INACTIVE' ? 'INACTIVE' : sp.status === 'all' ? undefined : 'ACTIVE';
  const [products, categories, threshold] = await Promise.all([
    listProducts({ categoryId: sp.category || undefined, status, q: sp.q?.slice(0, 100) || undefined }),
    listCategories(),
    getLowStockThreshold(),
  ]);
  const isOwner = admin.role === 'OWNER';

  return (
    <div>
      <PageHeader
        title="Товары"
        description="Каталог. Клиенты в WhatsApp видят только активные товары."
        actions={isOwner && <LinkButton href="/admin/products/new">+ Добавить товар</LinkButton>}
      />
      {sp.saved && <div className="mb-4"><Alert tone="success">✅ Товар сохранён.</Alert></div>}

      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <input name="q" defaultValue={sp.q} placeholder="Поиск: роза, red…" className={inputClass} />
        <select name="category" defaultValue={sp.category ?? ''} className={inputClass}>
          <option value="">Все категории</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={sp.status ?? 'ACTIVE'} className={inputClass}>
          <option value="ACTIVE">Активные</option>
          <option value="INACTIVE">Неактивные</option>
          <option value="all">Все</option>
        </select>
        <button className="rounded-md border px-4 py-2 text-sm hover:bg-muted">Показать</button>
      </form>

      {products.length === 0 ? (
        <Empty>
          Товаров пока нет.{' '}
          {isOwner && (
            <Link href="/admin/products/new" className="text-primary underline">
              Добавьте первый товар
            </Link>
          )}
        </Empty>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {products.map((p) => {
            const price = salePrice(p);
            const available = p.stock?.availableQuantity ?? 0;
            const level = stockLevel(available, effectiveThreshold(p.stock?.lowStockThreshold, threshold));
            return (
              <li key={p.id} className="flex items-center gap-3 p-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.photoUrl ? <img src={p.photoUrl} alt="" className="h-full w-full object-cover" /> : p.category.emoji ?? '🌷'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">
                      {productLabel(p)}
                    </Link>
                    {p.status === 'INACTIVE' && <Badge>Неактивен</Badge>}
                    {level === 'OUT' && p.status === 'ACTIVE' && <Badge tone="red">🔴 Нет в наличии</Badge>}
                    {level === 'LOW' && p.status === 'ACTIVE' && <Badge tone="yellow">⚠️ Мало</Badge>}
                  </div>
                  <div className="mt-0.5 text-sm text-muted-foreground">
                    {p.category.name}
                    {p.saleUnit === 'PACKAGE' && p.packageQuantity ? ` · ${p.packageQuantity} шт/уп.` : ' · поштучно'}
                    {' · '}
                    {price !== null ? `${formatTenge(price)} / ${qtyUnit(p.saleUnit)}` : 'цена не указана'}
                  </div>
                </div>
                <div className="hidden text-right sm:block">
                  <div className="font-mono text-lg font-semibold">{available}</div>
                  <div className="text-xs text-muted-foreground">доступно, {qtyUnit(p.saleUnit)}</div>
                </div>
                {isOwner && (
                  <form action={setProductStatusAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="status" value={p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'} />
                    <SubmitButton pendingText="…" className="rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted" title="Показывать клиентам или нет">
                      {p.status === 'ACTIVE' ? 'Скрыть' : 'Включить'}
                    </SubmitButton>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
