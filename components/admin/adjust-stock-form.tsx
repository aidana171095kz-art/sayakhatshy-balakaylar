'use client';

import { useActionState } from 'react';
import { adjustStockAction } from '@/app/admin/stock/actions';
import { Alert, Button, Field, inputClass } from '@/components/ui';
import type { ActionState } from '@/lib/action-state';
import { STOCK_REASON } from '@/lib/labels';

export function AdjustStockForm({ productId, unit }: { productId: string; unit: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(adjustStockAction, {});
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="productId" value={productId} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">✅ {state.ok}</Alert>}
      <Field label="Причина *" error={e.reason}>
        <select name="reason" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Выберите…
          </option>
          <optgroup label="Увеличить остаток">
            {(['RECEIPT', 'RETURN', 'CORRECTION_PLUS'] as const).map((r) => (
              <option key={r} value={r}>
                + {STOCK_REASON[r].label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Уменьшить остаток">
            {(['DAMAGE', 'WRITE_OFF', 'CORRECTION_MINUS'] as const).map((r) => (
              <option key={r} value={r}>
                − {STOCK_REASON[r].label}
              </option>
            ))}
          </optgroup>
        </select>
      </Field>
      <Field label={`Количество, ${unit} *`} error={e.quantity}>
        <input name="quantity" type="number" min={1} required inputMode="numeric" className={inputClass} />
      </Field>
      <Field label="Комментарий" error={e.note}>
        <input name="note" maxLength={500} placeholder="Например: помялись при доставке" className={inputClass} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? 'Сохранение…' : 'Сохранить'}
      </Button>
      <p className="text-xs text-muted-foreground">
        Уменьшить можно только свободный (доступный) остаток — забронированное трогать нельзя.
      </p>
    </form>
  );
}
