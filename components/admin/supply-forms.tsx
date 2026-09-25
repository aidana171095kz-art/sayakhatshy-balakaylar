'use client';

import {
  addSupplyItemAction,
  convertPreOrderAction,
  createPreOrderAction,
  createSupplyAction,
  receiveSupplyAction,
  updateSupplyAction,
  updateSupplyItemAction,
} from '@/app/admin/supplies/actions';
import { Alert, Button, Field, inputClass } from '@/components/ui';
import { useFormAction } from '@/lib/use-form-action';

type Opt = { id: string; label: string };

// ───────── 1-қадам: поставка деректері ─────────

export function SupplyForm({ supply }: { supply?: { id: string; title: string | null; expectedDate: string; notes: string | null } }) {
  const { state, pending, formRef, onSubmit } = useFormAction(supply ? updateSupplyAction : createSupplyAction);
  const e = state.fieldErrors ?? {};
  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      {supply && <input type="hidden" name="id" value={supply.id} />}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="Название поставки *" error={e.title} hint="Например: Поставка №12 или «Октябрь, 1-я»">
        <input name="title" required maxLength={100} defaultValue={supply?.title ?? ''} className={inputClass} />
      </Field>
      <Field label="Ожидаемая дата *" error={e.expectedDate} hint="Эту дату увидят клиенты в WhatsApp">
        <input name="expectedDate" type="date" required defaultValue={supply?.expectedDate ?? ''} className={inputClass} />
      </Field>
      <Field label="Комментарий" error={e.notes}>
        <textarea name="notes" rows={2} maxLength={1000} defaultValue={supply?.notes ?? ''} className={inputClass} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? 'Сохранение…' : supply ? 'Сохранить' : 'Далее → товары'}
      </Button>
    </form>
  );
}

// ───────── 2-қадам: тауарлар ─────────

export function AddSupplyItemForm({ supplyId, products }: { supplyId: string; products: Opt[] }) {
  const { state, pending, formRef, onSubmit } = useFormAction(addSupplyItemAction, { resetOnSuccess: true });
  const e = state.fieldErrors ?? {};
  if (products.length === 0) {
    return (
      <div className="space-y-2">
        {state.ok && <Alert tone="success">✅ {state.ok}</Alert>}
        <p className="text-sm text-muted-foreground">Все активные товары уже в поставке.</p>
      </div>
    );
  }
  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[1fr_8rem_9rem_auto] sm:items-end">
      <input type="hidden" name="supplyId" value={supplyId} />
      <Field label="Товар" error={e.productId}>
        <select name="productId" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Выберите…
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Заказано" error={e.expectedQty}>
        <input name="expectedQty" type="number" min={1} required inputMode="numeric" className={inputClass} />
      </Field>
      <Field label="Лимит предзаказа" error={e.preorderLimit}>
        <input name="preorderLimit" type="number" min={0} inputMode="numeric" placeholder="без лимита" className={inputClass} />
      </Field>
      <Button type="submit" disabled={pending}>
        + Добавить
      </Button>
      {(state.error || state.ok) && (
        <div className="sm:col-span-4">
          {state.error ? <Alert tone="error">{state.error}</Alert> : <Alert tone="success">✅ {state.ok}</Alert>}
        </div>
      )}
    </form>
  );
}

export function SupplyItemEditForm({ itemId, expectedQty, preorderLimit }: { itemId: string; expectedQty: number | null; preorderLimit: number | null }) {
  const { state, pending, formRef, onSubmit } = useFormAction(updateSupplyItemAction);
  const err = state.fieldErrors ? Object.values(state.fieldErrors)[0] : state.error;
  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="itemId" value={itemId} />
      <input name="expectedQty" type="number" min={1} required defaultValue={expectedQty ?? ''} aria-label="Заказано" className={`${inputClass} w-20 py-1 text-right font-mono`} />
      <input name="preorderLimit" type="number" min={0} defaultValue={preorderLimit ?? ''} placeholder="∞" aria-label="Лимит предзаказа" className={`${inputClass} w-20 py-1 text-right font-mono`} />
      <button disabled={pending} className="rounded-md border px-2 py-1 text-xs hover:bg-muted">
        {pending ? '…' : 'OK'}
      </button>
      {err && <span className="w-full text-xs text-destructive">{err}</span>}
      {state.ok && !pending && <span className="text-xs text-[hsl(var(--success))]">✅</span>}
    </form>
  );
}

// ───────── Поставка пришла ─────────

export function ArrivalForm({
  supplyId,
  items,
}: {
  supplyId: string;
  items: { id: string; label: string; unit: string; expectedQty: number | null; preordered: number }[];
}) {
  const { state, pending, formRef, onSubmit } = useFormAction(receiveSupplyAction, { confirm: 'Добавить указанное количество на склад? Это действие нельзя отменить.' });
  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="supplyId" value={supplyId} />
      {state.error && <Alert tone="error">{state.fieldErrors ? Object.values(state.fieldErrors)[0] : state.error}</Alert>}
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="grid grid-cols-[1fr_5rem_7rem] gap-2 border-b px-4 py-2 text-xs font-medium uppercase text-muted-foreground">
          <span>Товар</span>
          <span className="text-right">Заказано</span>
          <span className="text-right">Пришло *</span>
        </div>
        <ul className="divide-y">
          {items.map((i) => (
            <li key={i.id} className="grid grid-cols-[1fr_5rem_7rem] items-center gap-2 px-4 py-3">
              <span>
                <span className="font-medium">{i.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {i.unit}
                  {i.preordered > 0 && ` · предзаказано: ${i.preordered}`}
                </span>
              </span>
              <span className="text-right font-mono text-muted-foreground">{i.expectedQty ?? '—'}</span>
              <input
                name={`received:${i.id}`}
                type="number"
                min={0}
                required
                inputMode="numeric"
                aria-label={`Пришло: ${i.label}`}
                className={`${inputClass} text-right font-mono`}
              />
            </li>
          ))}
        </ul>
      </div>
      <p className="text-sm text-muted-foreground">
        Впишите <b>фактическое</b> количество по каждой позиции. На склад добавится именно оно, а не «заказано». Если позиция
        не пришла — впишите 0.
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? 'Сохранение…' : '📦 Поставка пришла — добавить на склад'}
      </Button>
    </form>
  );
}

// ───────── Предзаказ (менеджер қолмен қосады) ─────────

export function PreOrderForm({ supplyId, products }: { supplyId: string; products: Opt[] }) {
  const { state, pending, formRef, onSubmit } = useFormAction(createPreOrderAction, { resetOnSuccess: true });
  const e = state.fieldErrors ?? {};
  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="supplyId" value={supplyId} />
      <Field label="Телефон WhatsApp *" error={e.phone}>
        <input name="phone" required inputMode="tel" placeholder="+7 701 123 45 67" className={inputClass} />
      </Field>
      <Field label="Имя *" error={e.name}>
        <input name="name" required maxLength={100} className={inputClass} />
      </Field>
      <Field label="Магазин / компания" error={e.companyName}>
        <input name="companyName" maxLength={100} className={inputClass} />
      </Field>
      <Field label="К какой дате нужно" error={e.neededBy}>
        <input name="neededBy" type="date" className={inputClass} />
      </Field>
      <Field label="Товар *" error={e.productId}>
        <select name="productId" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Выберите…
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Количество *" error={e.quantity}>
        <input name="quantity" type="number" min={1} required inputMode="numeric" className={inputClass} />
      </Field>
      <Field label="Комментарий" error={e.comment} className="sm:col-span-2">
        <input name="comment" maxLength={1000} className={inputClass} />
      </Field>
      <div className="space-y-2 sm:col-span-2">
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.ok && <Alert tone="success">✅ {state.ok}</Alert>}
        <Button type="submit" disabled={pending}>
          {pending ? 'Сохранение…' : 'Добавить предзаказ'}
        </Button>
      </div>
    </form>
  );
}

export function ConvertPreOrderForm({
  supplyId,
  preOrderId,
  items,
}: {
  supplyId: string;
  preOrderId: string;
  items: { productId: string; label: string; quantity: number; available: number }[];
}) {
  const { state, pending, formRef, onSubmit } = useFormAction(convertPreOrderAction);
  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="supplyId" value={supplyId} />
      <input type="hidden" name="preOrderId" value={preOrderId} />
      {items.map((i) => (
        <label key={i.productId} className="flex items-center gap-2 text-sm">
          <span className="flex-1">
            {i.label} <span className="text-xs text-muted-foreground">(доступно: {i.available})</span>
          </span>
          <input
            name={`qty:${i.productId}`}
            type="number"
            min={0}
            max={i.quantity}
            defaultValue={Math.min(i.quantity, Math.max(i.available, 0))}
            className={`${inputClass} w-20 py-1 text-right font-mono`}
          />
          <span className="w-12 text-xs text-muted-foreground">из {i.quantity}</span>
        </label>
      ))}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? '…' : '✅ Создать заказ и забронировать'}
      </Button>
    </form>
  );
}
