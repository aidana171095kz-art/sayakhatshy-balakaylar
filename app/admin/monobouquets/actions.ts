'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { type ActionState, toActionState } from '@/lib/action-state';
import { requireAdmin } from '@/server/auth/session';
import { createMonobouquetRequest, updateMonobouquet } from '@/server/services/monobouquets';

export async function createMonobouquetAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  let id: string;
  try {
    id = (
      await createMonobouquetRequest(
        {
          customer: { phone: fd.get('phone'), name: fd.get('name'), companyName: fd.get('companyName') },
          categoryId: fd.get('categoryId'),
          flowerNote: fd.get('flowerNote'),
          stemCount: fd.get('stemCount'),
          size: fd.get('size'),
          wrapping: fd.get('wrapping'),
          neededBy: fd.get('neededBy'),
          comment: fd.get('comment'),
        },
        { adminId: admin.id },
      )
    ).id;
  } catch (e) {
    const s = toActionState(e);
    if (s.fieldErrors) {
      s.fieldErrors = Object.fromEntries(Object.entries(s.fieldErrors).map(([k, v]) => [k.replace(/^customer\./, ''), v]));
    }
    return s;
  }
  revalidatePath('/admin', 'layout');
  redirect(`/admin/monobouquets/${id}`);
}

export async function updateMonobouquetAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    await updateMonobouquet(
      String(fd.get('id') ?? ''),
      { status: fd.get('status'), quotedPrice: fd.get('quotedPrice'), managerNote: fd.get('managerNote') },
      admin.id,
    );
  } catch (e) {
    return toActionState(e);
  }
  revalidatePath('/admin', 'layout');
  return { ok: 'Сохранено' };
}
