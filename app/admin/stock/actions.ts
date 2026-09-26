'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { type ActionState, toActionState } from '@/lib/action-state';
import { requireAdmin } from '@/server/auth/session';
import { adjustStock } from '@/server/services/stock';

const schema = z.object({
  productId: z.string().min(1),
  reason: z.enum(['RECEIPT', 'DAMAGE', 'WRITE_OFF', 'RETURN', 'CORRECTION_PLUS', 'CORRECTION_MINUS'], {
    message: 'Выберите причину',
  }),
  quantity: z.coerce
    .number({ invalid_type_error: 'Укажите количество' })
    .int('Целое число')
    .min(1, 'Количество — больше 0')
    .max(100000),
  note: z.preprocess((v) => (v == null || v === '' ? null : v), z.string().trim().max(500).nullable()),
});

export async function adjustStockAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    const input = schema.parse({
      productId: fd.get('productId'),
      reason: fd.get('reason'),
      quantity: fd.get('quantity'),
      note: fd.get('note'),
    });
    await adjustStock({ ...input, adminId: admin.id });
  } catch (e) {
    return toActionState(e);
  }
  revalidatePath('/admin', 'layout');
  return { ok: 'Остаток обновлён' };
}
