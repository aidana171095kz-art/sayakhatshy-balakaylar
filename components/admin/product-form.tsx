'use client';

import { useActionState, useState } from 'react';
import type { Category, Product, Stock } from '@prisma/client';
import { saveProductAction } from '@/app/admin/products/actions';
import { Alert, Button, Field, LinkButton, inputClass } from '@/components/ui';
import type { ActionState } from '@/lib/action-state';
import { PhotoInput } from './photo-input';

type P = Product & { stock: Stock | null };

export function ProductForm({
  product,
  categories,
  blobReady,
  globalThreshold,
}: {
  product?: P;
  categories: Category[];
  blobReady: boolean;
  globalThreshold: number;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProductAction, {});
  const [saleUnit, setSaleUnit] = useState(product?.saleUnit ?? 'PACKAGE');
  const e = state.fieldErrors ?? {};
  const v = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));

  return (
    <form action={action} className="space-y-6">
      {product && <input type="hidden" name="id" value={product.id} />}
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <section className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-2 md:p-5">
        <h2 className="font-medium md:col-span-2">Основное</h2>
        <Field label="Название *" error={e.name} hint="Например: Роза">
          <input name="name" defaultValue={product?.name} required maxLength={100} className={inputClass} />
        </Field>
        <Field label="Категория *" error={e.categoryId}>
          <select name="categoryId" defaultValue={product?.categoryId ?? ''} required className={inputClass}>
            <option value="" disabled>
              Выберите…
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
                {!c.isActive ? ' (скрыта)' : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Сорт" error={e.variety} hint="Например: Red Naomi">
          <input name="variety" defaultValue={product?.variety ?? ''} maxLength={100} className={inputClass} />
        </Field>
        <Field label="Цвет" error={e.color}>
          <input name="color" defaultValue={product?.color ?? ''} maxLength={50} className={inputClass} />
        </Field>
        <Field label="Длина, см" error={e.lengthCm}>
          <input name="lengthCm" type="number" min={1} max={300} inputMode="numeric" defaultValue={v(product?.lengthCm)} className={inputClass} />
        </Field>
        <Field label="Статус" error={e.status} hint="Неактивный товар не показывается клиентам в WhatsApp">
          <select name="status" defaultValue={product?.status ?? 'ACTIVE'} className={inputClass}>
            <option value="ACTIVE">Активен</option>
            <option value="INACTIVE">Неактивен</option>
          </select>
        </Field>
        <div className="md:col-span-2">
          <PhotoInput defaultUrl={product?.photoUrl ?? null} blobReady={blobReady} error={e.photoUrl} />
        </div>
        <Field label="Описание" error={e.description} className="md:col-span-2">
          <textarea name="description" defaultValue={product?.description ?? ''} rows={2} maxLength={1000} className={inputClass} />
        </Field>
      </section>

      <section className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-2 md:p-5">
        <h2 className="font-medium md:col-span-2">Продажа и цена</h2>
        <Field label="Единица продажи *" error={e.saleUnit} hint="В чём считаются остаток и заказ" className="md:col-span-2">
          <div className="flex gap-2">
            {(['PACKAGE', 'UNIT'] as const).map((u) => (
              <label
                key={u}
                className={`flex flex-1 cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm ${
                  saleUnit === u ? 'border-primary bg-accent font-medium' : ''
                }`}
              >
                <input type="radio" name="saleUnit" value={u} checked={saleUnit === u} onChange={() => setSaleUnit(u)} className="sr-only" />
                {u === 'PACKAGE' ? '📦 Упаковками' : '🌹 Поштучно'}
              </label>
            ))}
          </div>
        </Field>
        <Field
          label={`Количество в упаковке, шт${saleUnit === 'PACKAGE' ? ' *' : ''}`}
          error={e.packageQuantity}
          hint="Для каждого товара своё: роза — 20, spray rose — другое"
        >
          <input name="packageQuantity" type="number" min={1} inputMode="numeric" defaultValue={v(product?.packageQuantity)} className={inputClass} />
        </Field>
        <Field label={`Минимальный заказ, ${saleUnit === 'PACKAGE' ? 'упаковок' : 'штук'} *`} error={e.minOrderQty}>
          <input name="minOrderQty" type="number" min={1} inputMode="numeric" defaultValue={product?.minOrderQty ?? 1} required className={inputClass} />
        </Field>
        <Field label={`Цена за упаковку, ₸${saleUnit === 'PACKAGE' ? ' *' : ''}`} error={e.pricePerPackage}>
          <input name="pricePerPackage" type="number" min={0} inputMode="numeric" defaultValue={v(product?.pricePerPackage)} className={inputClass} />
        </Field>
        <Field label={`Цена за штуку, ₸${saleUnit === 'UNIT' ? ' *' : ''}`} error={e.pricePerUnit} hint="Необязательно, если продаёте упаковками">
          <input name="pricePerUnit" type="number" min={0} inputMode="numeric" defaultValue={v(product?.pricePerUnit)} className={inputClass} />
        </Field>
      </section>

      <section className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-2 md:p-5">
        <h2 className="font-medium md:col-span-2">Остаток</h2>
        {!product && (
          <Field label="Начальный остаток" error={e.initialStock} hint="Сколько уже есть на складе. Можно оставить пустым.">
            <input name="initialStock" type="number" min={0} inputMode="numeric" className={inputClass} />
          </Field>
        )}
        <Field label="Порог LOW STOCK" error={e.lowStockThreshold} hint={`Пусто — общий порог из настроек (${globalThreshold})`}>
          <input name="lowStockThreshold" type="number" min={0} inputMode="numeric" defaultValue={v(product?.stock?.lowStockThreshold)} className={inputClass} />
        </Field>
        {product && (
          <p className="text-sm text-muted-foreground md:col-span-2">
            Остаток меняется в разделе «Остатки» или при приходе поставки.
          </p>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Сохранение…' : product ? 'Сохранить' : 'Добавить товар'}
        </Button>
        <LinkButton href="/admin/products" variant="secondary">
          Отмена
        </LinkButton>
      </div>
    </form>
  );
}
