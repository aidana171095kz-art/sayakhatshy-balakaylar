'use server';

import { revalidatePath } from 'next/cache';
import { type ActionState, toActionState } from '@/lib/action-state';
import { requireAdmin } from '@/server/auth/session';
import { updatePrices } from '@/server/services/products';

export async function updatePricesAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin(['OWNER']);
  try {
    await updatePrices(
      String(fd.get('productId') ?? ''),
      { pricePerUnit: fd.get('pricePerUnit'), pricePerPackage: fd.get('pricePerPackage') },
      admin.id,
    );
  } catch (e) {
    return toActionState(e);
  }
  revalidatePath('/admin', 'layout');
  return { ok: 'Сохранено' };
}
