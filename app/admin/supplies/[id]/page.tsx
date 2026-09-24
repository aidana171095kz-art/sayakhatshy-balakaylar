import { notFound } from 'next/navigation';
import {
  AddSupplyItemForm,
  ConfirmButton,
  ConvertPreOrderForm,
  PreOrderForm,
  SupplyForm,
  SupplyItemEditForm,
} from '@/components/admin/supply-forms';
import { Alert, Badge, Card, Empty, LinkButton, PageHeader, buttonClass } from '@/components/ui';
import { formatDay, toDateInput } from '@/lib/format';
import { PREORDER_STATUS, SUPPLY_STATUS, qtyUnit } from '@/lib/labels';
import { formatPhone } from '@/lib/phone';
import { requireAdmin } from '@/server/auth/session';
import { prisma } from '@/server/db';
import { productLabel } from '@/server/services/products';
import { OPEN_STATUSES, allowedActions, getSupply, preorderTotals } from '@/server/services/supplies';
import { preOrderStatusAction, removeSupplyItemAction, supplyStatusAction } from '../actions';

export const dynamic = 'force-dynamic';

type Search = Promise<{ error?: string; created?: string; arrived?: string }>;

function Step({ n, label, done, active }: { n: number; label: string; done: boolean; active: boolean }) {
  return (
    <li className={`flex items-center gap-2 text-sm ${active ? 'font-medium' : done ? '' : 'text-muted-foreground'}`}>
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
          done ? 'bg-[hsl(var(--success))] text-white' : active ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}
      >
        {done ? '✓' : n}
      </span>
      {label}
    </li>
  );
}

function StatusButton({ id, action, children, variant = 'secondary', confirm }: { id: string; action: string; children: React.ReactNode; variant?: 'primary' | 'secondary' | 'danger'; confirm?: string }) {
  return (
    <form action={supplyStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      {confirm ? (
        <ConfirmButton message={confirm} className={buttonClass(variant)}>
          {children}
        </ConfirmButton>
      ) : (
        <button className={buttonClass(variant)}>{children}</button>
      )}
    </form>
  );
}

export default async function SupplyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Search }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const supply = await getSupply(id);
  if (!supply) notFound();

  const totals = (await preorderTotals([id])).get(id) ?? new Map<string, number>();
  const actions = allowedActions(supply.status, supply.preorderOpen);
  const editable = OPEN_STATUSES.includes(supply.status);
  const arrived = supply.status === 'ARRIVED' || supply.status === 'COMPLETED';
  const st = SUPPLY_STATUS[supply.status];

  const inSupply = new Set(supply.items.map((i) => i.productId));
  const catalog = editable
    ? await prisma.product.findMany({ where: { status: 'ACTIVE' }, include: { category: true }, orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }] })
    : [];
  const addable = catalog.filter((p) => !inSupply.has(p.id)).map((p) => ({ id: p.id, label: `${p.category.emoji ?? ''} ${productLabel(p)}` }));
  const supplyProducts = supply.items.map((i) => ({ id: i.productId, label: productLabel(i.product) }));

  const activePreorders = supply.preOrders.filter((p) => p.status === 'NEW' || p.status === 'CONFIRMED');
  const otherPreorders = supply.preOrders.filter((p) => p.status !== 'NEW' && p.status !== 'CONFIRMED');

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={`📦 ${supply.title ?? 'Поставка'}`}
        back={{ href: '/admin/supplies', label: 'Поставки' }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>{formatDay(supply.expectedDate)}</span>
            <Badge tone={st.tone}>{st.label}</Badge>
            {supply.preorderOpen && <Badge tone="green">🟢 Предзаказ открыт</Badge>}
          </span>
        }
      />

      {sp.error && <div className="mb-4"><Alert tone="error">{sp.error}</Alert></div>}
      {sp.created && <div className="mb-4"><Alert tone="success">✅ Поставка создана. Теперь добавьте товары.</Alert></div>}
      {sp.arrived && <div className="mb-4"><Alert tone="success">✅ Товар добавлен на склад. Теперь можно превратить предзаказы в заказы.</Alert></div>}

      <ol className="mb-6 grid gap-2 rounded-lg border bg-card p-4 sm:grid-cols-4">
        <Step n={1} label="Данные" done active={false} />
        <Step n={2} label={`Товары (${supply.items.length})`} done={supply.items.length > 0} active={supply.items.length === 0} />
        <Step n={3} label="Предзаказ" done={supply.preorderOpen || arrived || supply.preOrders.length > 0} active={supply.items.length > 0 && !supply.preorderOpen && !arrived} />
        <Step n={4} label="Приход на склад" done={arrived} active={supply.preorderOpen} />
      </ol>

      {actions.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {actions.includes('OPEN_PREORDER') && (
            <StatusButton id={id} action="OPEN_PREORDER" variant="primary">
              🟢 Открыть предзаказ
            </StatusButton>
          )}
          {actions.includes('CLOSE_PREORDER') && (
            <StatusButton id={id} action="CLOSE_PREORDER" confirm="Закрыть предзаказ? Клиенты больше не смогут бронировать эту поставку.">
              ⏸ Закрыть предзаказ
            </StatusButton>
          )}
          {actions.includes('IN_TRANSIT') && (
            <StatusButton id={id} action="IN_TRANSIT">
              🚚 В пути
            </StatusButton>
          )}
          {actions.includes('ARRIVE') && (
            <LinkButton href={`/admin/supplies/${id}/arrival`} variant={supply.preorderOpen ? 'secondary' : 'primary'}>
              📦 Поставка пришла
            </LinkButton>
          )}
          {actions.includes('COMPLETE') && (
            <StatusButton id={id} action="COMPLETE" confirm="Завершить поставку? Это закрывает цикл поставки.">
              ✔ Завершить поставку
            </StatusButton>
          )}
          {actions.includes('CANCEL') && (
            <StatusButton
              id={id}
              action="CANCEL"
              variant="danger"
              confirm={`Отменить поставку?${activePreorders.length ? ` Будут отменены и предзаказы: ${activePreorders.length}.` : ''}`}
            >
              Отменить поставку
            </StatusButton>
          )}
        </div>
      )}

      {/* ───── Товары ───── */}
      <Card title="Товары в поставке" className="mb-6" description={editable ? 'Заказано у поставщика и лимит для предзаказа (пусто = без лимита).' : undefined}>
        {supply.items.length === 0 ? (
          <Empty>Добавьте товары, которые придут в этой поставке.</Empty>
        ) : (
          <ul className="mb-4 divide-y text-sm">
            <li className="hidden grid-cols-[1fr_12rem_6rem_6rem_2rem] gap-2 pb-2 text-xs font-medium uppercase text-muted-foreground md:grid">
              <span>Товар</span>
              <span>Заказано / лимит</span>
              <span className="text-right">Предзаказ</span>
              <span className="text-right">Пришло</span>
              <span />
            </li>
            {supply.items.map((i) => {
              const pre = totals.get(i.productId) ?? 0;
              const shortage = i.receivedQty !== null && i.expectedQty !== null && i.receivedQty < i.expectedQty;
              return (
                <li key={i.id} className="grid grid-cols-2 gap-2 py-2 md:grid-cols-[1fr_12rem_6rem_6rem_2rem] md:items-center">
                  <span className="col-span-2 font-medium md:col-span-1">
                    {i.product.category.emoji} {productLabel(i.product)}{' '}
                    <span className="text-xs font-normal text-muted-foreground">({qtyUnit(i.product.saleUnit)})</span>
                  </span>
                  <span className="col-span-2 md:col-span-1">
                    {editable ? (
                      <SupplyItemEditForm itemId={i.id} expectedQty={i.expectedQty} preorderLimit={i.preorderLimit} />
                    ) : (
                      <span className="font-mono">
                        {i.expectedQty ?? '—'}
                        {i.preorderLimit !== null && <span className="text-muted-foreground"> / лимит {i.preorderLimit}</span>}
                      </span>
                    )}
                  </span>
                  <span className="md:text-right">
                    <span className="text-xs text-muted-foreground md:hidden">Предзаказ: </span>
                    <span className="font-mono">{pre}</span>
                  </span>
                  <span className="md:text-right">
                    <span className="text-xs text-muted-foreground md:hidden">Пришло: </span>
                    <span className={`font-mono ${shortage ? 'font-semibold text-destructive' : ''}`}>{i.receivedQty ?? '—'}</span>
                  </span>
                  <span className="md:text-right">
                    {editable && pre === 0 && (
                      <form action={removeSupplyItemAction}>
                        <input type="hidden" name="supplyId" value={id} />
                        <input type="hidden" name="itemId" value={i.id} />
                        <ConfirmButton message="Убрать товар из поставки?" className="text-muted-foreground hover:text-destructive">
                          ✕
                        </ConfirmButton>
                      </form>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {editable && <AddSupplyItemForm supplyId={id} products={addable} />}
      </Card>

      {/* ───── Предзаказы ───── */}
      <Card
        title={`Предзаказы (${activePreorders.length})`}
        className="mb-6"
        description={
          arrived
            ? 'Поставка пришла: превратите предзаказ в заказ — товар забронируется со склада. Если пришло меньше — уменьшите количество.'
            : 'Предзаказ не трогает склад. Бронь со склада — только после прихода поставки.'
        }
      >
        {activePreorders.length === 0 ? (
          <Empty>Активных предзаказов нет.</Empty>
        ) : (
          <ul className="divide-y">
            {activePreorders.map((po) => (
              <li key={po.id} className="grid gap-3 py-3 md:grid-cols-[1fr_auto]">
                <div className="text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{po.number}</span>
                    <span className="font-medium">{po.contactName}</span>
                    {po.companyName && <span className="text-muted-foreground">· {po.companyName}</span>}
                    <Badge tone={PREORDER_STATUS[po.status].tone}>{PREORDER_STATUS[po.status].label}</Badge>
                  </div>
                  <div className="text-muted-foreground">{formatPhone(po.customer.waId)}{po.neededBy && ` · нужно к ${formatDay(po.neededBy)}`}</div>
                  <ul className="mt-1">
                    {po.items.map((it) => (
                      <li key={it.id}>
                        🌷 {productLabel(it.product)} — <b>{it.quantity}</b> {qtyUnit(it.saleUnit)}
                      </li>
                    ))}
                  </ul>
                  {po.comment && <div className="text-xs">💬 {po.comment}</div>}
                </div>
                <div className="flex flex-col gap-2 md:w-72">
                  {arrived && (
                    <ConvertPreOrderForm
                      preOrderId={po.id}
                      items={po.items.map((it) => {
                        const si = supply.items.find((x) => x.productId === it.productId);
                        return {
                          productId: it.productId,
                          label: productLabel(it.product),
                          quantity: it.quantity,
                          available: si?.product.stock?.availableQuantity ?? 0,
                        };
                      })}
                    />
                  )}
                  <div className="flex gap-2">
                    {po.status === 'NEW' && (
                      <form action={preOrderStatusAction}>
                        <input type="hidden" name="supplyId" value={id} />
                        <input type="hidden" name="preOrderId" value={po.id} />
                        <input type="hidden" name="action" value="CONFIRM" />
                        <button className={buttonClass('secondary', 'sm')} title="Менеджер связался с клиентом и подтвердил">
                          Подтвердить
                        </button>
                      </form>
                    )}
                    <form action={preOrderStatusAction}>
                      <input type="hidden" name="supplyId" value={id} />
                      <input type="hidden" name="preOrderId" value={po.id} />
                      <input type="hidden" name="action" value="CANCEL" />
                      <ConfirmButton message={`Отменить предзаказ ${po.number}?`} className={buttonClass('danger', 'sm')}>
                        Отменить
                      </ConfirmButton>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {otherPreorders.length > 0 && (
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-muted-foreground">Обработанные и отменённые ({otherPreorders.length})</summary>
            <ul className="mt-2 space-y-1">
              {otherPreorders.map((po) => (
                <li key={po.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{po.number}</span>
                  {po.contactName}
                  <Badge tone={PREORDER_STATUS[po.status].tone}>{PREORDER_STATUS[po.status].label}</Badge>
                  {po.order && <span className="text-xs text-muted-foreground">→ заказ {po.order.number}</span>}
                </li>
              ))}
            </ul>
          </details>
        )}

        {supply.preorderOpen && supplyProducts.length > 0 && (
          <details className="mt-4 rounded-md border p-3">
            <summary className="cursor-pointer text-sm font-medium">+ Добавить предзаказ вручную (звонок, Instagram)</summary>
            <div className="mt-3">
              <PreOrderForm supplyId={id} products={supplyProducts} />
            </div>
          </details>
        )}
      </Card>

      {editable && (
        <details className="rounded-lg border bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium">✏️ Изменить название, дату, комментарий</summary>
          <div className="mt-4 max-w-md">
            <SupplyForm supply={{ id, title: supply.title, expectedDate: toDateInput(supply.expectedDate), notes: supply.notes }} />
          </div>
        </details>
      )}
      {!editable && supply.notes && <Card title="Комментарий">{supply.notes}</Card>}
    </div>
  );
}
