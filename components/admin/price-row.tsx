'use client';

import { useActionState } from 'react';
import { updatePricesAction } from '@/app/admin/prices/actions';
import { Button, inputClass } from '@/components/ui';
import type { ActionState } from '@/lib/action-state';

export function PriceRow({
  productId,
  label,
  meta,
  saleUnit,
  pricePerUnit,
  pricePerPackage,
}: {
  productId: string;
  label: string;
  meta: string;
  saleUnit: 'PACKAGE' | 'UNIT';
  pricePerUnit: number | null;
  pricePerPackage: number | null;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updatePricesAction, {});
  return (
    <form action={action} className="grid gap-2 px-4 py-3 md:grid-cols-[1fr_9rem_9rem_7rem] md:items-center">
      <input type="hidden" name="productId" value={productId} />
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{meta}</div>
        {state.error && <div className="text-xs text-destructive">{state.fieldErrors ? Object.values(state.fieldErrors)[0] : state.error}</div>}
        {state.ok && !pending && <div className="text-xs text-[hsl(var(--success))]">✅ {state.ok}</div>}
      </div>
      <label className="block">
        <span className="text-xs text-muted-foreground md:hidden">За упаковку, ₸{saleUnit === 'PACKAGE' && ' *'}</span>
        <input
          name="pricePerPackage"
          type="number"
          min={0}
          inputMode="numeric"
          defaultValue={pricePerPackage ?? ''}
          required={saleUnit === 'PACKAGE'}
          aria-label="Цена за упаковку"
          className={`${inputClass} text-right font-mono`}
        />
      </label>
      <label className="block">
        <span className="text-xs text-muted-foreground md:hidden">За штуку, ₸{saleUnit === 'UNIT' && ' *'}</span>
        <input
          name="pricePerUnit"
          type="number"
          min={0}
          inputMode="numeric"
          defaultValue={pricePerUnit ?? ''}
          required={saleUnit === 'UNIT'}
          aria-label="Цена за штуку"
          className={`${inputClass} text-right font-mono`}
        />
      </label>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? '…' : 'Сохранить'}
      </Button>
    </form>
  );
}
