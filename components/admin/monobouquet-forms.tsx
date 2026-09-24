'use client';

import { useActionState } from 'react';
import type { MonobouquetStatus } from '@prisma/client';
import { createMonobouquetAction, updateMonobouquetAction } from '@/app/admin/monobouquets/actions';
import { Alert, Button, Field, inputClass } from '@/components/ui';
import type { ActionState } from '@/lib/action-state';
import { MONO_STATUS } from '@/lib/labels';

export function MonobouquetCreateForm({
  categories,
  sizes,
  wrappings,
}: {
  categories: { id: string; label: string }[];
  sizes: string[];
  wrappings: string[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createMonobouquetAction, {});
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <Field label="Телефон WhatsApp *" error={e.phone}>
        <input name="phone" required inputMode="tel" placeholder="+7 701 123 45 67" className={inputClass} />
      </Field>
      <Field label="Имя *" error={e.name}>
        <input name="name" required maxLength={100} className={inputClass} />
      </Field>
      <Field label="Цветок" error={e.categoryId}>
        <select name="categoryId" defaultValue="" className={inputClass}>
          <option value="">—</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Уточнение" error={e.flowerNote} hint="Например: красные розы 60 см">
        <input name="flowerNote" maxLength={200} className={inputClass} />
      </Field>
      <Field label="Количество, шт" error={e.stemCount}>
        <input name="stemCount" type="number" min={1} inputMode="numeric" className={inputClass} />
      </Field>
      <Field label="Размер" error={e.size}>
        {sizes.length ? (
          <select name="size" defaultValue="" className={inputClass}>
            <option value="">—</option>
            {sizes.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        ) : (
          <input name="size" maxLength={40} className={inputClass} />
        )}
      </Field>
      <Field label="Упаковка" error={e.wrapping}>
        {wrappings.length ? (
          <select name="wrapping" defaultValue="" className={inputClass}>
            <option value="">—</option>
            {wrappings.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        ) : (
          <input name="wrapping" maxLength={40} className={inputClass} />
        )}
      </Field>
      <Field label="К какой дате" error={e.neededBy}>
        <input name="neededBy" type="date" className={inputClass} />
      </Field>
      <Field label="Магазин / компания" error={e.companyName}>
        <input name="companyName" maxLength={100} className={inputClass} />
      </Field>
      <Field label="Комментарий" error={e.comment}>
        <input name="comment" maxLength={1000} className={inputClass} />
      </Field>
      <div className="space-y-2 sm:col-span-2">
        {state.error && <Alert tone="error">{state.error}</Alert>}
        <Button type="submit" disabled={pending}>
          {pending ? 'Сохранение…' : 'Создать запрос'}
        </Button>
      </div>
    </form>
  );
}

export function MonobouquetUpdateForm({
  id,
  status,
  quotedPrice,
  comment,
  nextStatuses,
}: {
  id: string;
  status: MonobouquetStatus;
  quotedPrice: number | null;
  comment: string | null;
  nextStatuses: MonobouquetStatus[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateMonobouquetAction, {});
  const e = state.fieldErrors ?? {};
  const closed = nextStatuses.length === 0;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && !pending && <Alert tone="success">✅ {state.ok}</Alert>}
      <Field label="Статус" error={e.status}>
        <select name="status" defaultValue={status} disabled={closed} className={inputClass}>
          {[status, ...nextStatuses].map((s) => (
            <option key={s} value={s}>
              {MONO_STATUS[s].label}
            </option>
          ))}
        </select>
      </Field>
      {closed && <input type="hidden" name="status" value={status} />}
      <Field label="Цена, ₸" error={e.quotedPrice} hint="Клиент увидит цену только после того, как вы её укажете">
        <input name="quotedPrice" type="number" min={0} inputMode="numeric" defaultValue={quotedPrice ?? ''} disabled={closed} className={inputClass} />
      </Field>
      {closed && <input type="hidden" name="quotedPrice" value={quotedPrice ?? ''} />}
      <Field label="Комментарий менеджера" error={e.comment}>
        <textarea name="comment" rows={2} maxLength={1000} defaultValue={comment ?? ''} className={inputClass} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? 'Сохранение…' : 'Сохранить'}
      </Button>
    </form>
  );
}
