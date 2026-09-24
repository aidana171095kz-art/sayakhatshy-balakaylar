'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { type ActionState, formToObject, toActionState } from '@/lib/action-state';
import { requireAdmin } from '@/server/auth/session';
import { createProduct, initialStockSchema, setProductStatus, updateProduct } from '@/server/services/products';
import { uploadProductPhoto } from '@/server/services/uploads';

export async function saveProductAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin(['OWNER']);
  let productId = String(fd.get('id') ?? '');
  try {
    const data: Record<string, unknown> = formToObject(fd);
    const photo = fd.get('photo');
    if (photo instanceof File && photo.size > 0) data.photoUrl = await uploadProductPhoto(photo);

    if (productId) {
      await updateProduct(productId, data, admin.id);
    } else {
      const initial = initialStockSchema.parse(data.initialStock);
      productId = (await createProduct(data, admin.id, initial)).id;
    }
  } catch (e) {
    return toActionState(e);
  }
  revalidatePath('/admin', 'layout');
  redirect(`/admin/products?saved=${productId}`);
}

export async function setProductStatusAction(fd: FormData) {
  const admin = await requireAdmin(['OWNER']);
  const id = String(fd.get('id') ?? '');
  const status = fd.get('status') === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
  await setProductStatus(id, status, admin.id);
  revalidatePath('/admin', 'layout');
}
