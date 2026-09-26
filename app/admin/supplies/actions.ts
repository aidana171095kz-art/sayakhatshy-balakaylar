'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { type ActionState, formToObject, toActionState } from '@/lib/action-state';
import { requireAdmin } from '@/server/auth/session';
import {
  cancelPreOrder,
  confirmPreOrder,
  convertPreOrderToOrder,
  createPreOrder,
} from '@/server/services/preorders';
import {
  addSupplyItem,
  cancelSupply,
  closePreorder,
  completeSupply,
  createSupply,
  markInTransit,
  openPreorder,
  receiveSupply,
  removeSupplyItem,
  updateSupply,
  updateSupplyItem,
} from '@/server/services/supplies';

const back = (id: string, params = '') => `/admin/supplies/${id}${params}`;
const errParam = (e: unknown) => `?error=${encodeURIComponent(toActionState(e).error ?? 'Ошибка')}`;

function done(path: string): never {
  revalidatePath('/admin', 'layout');
  redirect(path);
}

// ───────── Поставка ─────────

export async function createSupplyAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  let id: string;
  try {
    id = (await createSupply(formToObject(fd), admin.id)).id;
  } catch (e) {
    return toActionState(e);
  }
  done(back(id, '?created=1'));
}

export async function updateSupplyAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = String(fd.get('id') ?? '');
  try {
    await updateSupply(id, formToObject(fd), admin.id);
  } catch (e) {
    return toActionState(e);
  }
  done(back(id));
}

const STATUS_ACTIONS = {
  OPEN_PREORDER: openPreorder,
  CLOSE_PREORDER: closePreorder,
  IN_TRANSIT: markInTransit,
  COMPLETE: completeSupply,
  CANCEL: cancelSupply,
} as const;

export async function supplyStatusAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get('id') ?? '');
  const key = String(fd.get('action') ?? '') as keyof typeof STATUS_ACTIONS;
  const fn = STATUS_ACTIONS[key];
  if (!fn) done(back(id, '?error=' + encodeURIComponent('Неизвестное действие')));
  try {
    await fn(id, admin.id);
  } catch (e) {
    done(back(id, errParam(e)));
  }
  done(back(id));
}

// ───────── Позициялар ─────────

export async function addSupplyItemAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const supplyId = String(fd.get('supplyId') ?? '');
  try {
    await addSupplyItem(supplyId, formToObject(fd), admin.id);
  } catch (e) {
    return toActionState(e);
  }
  revalidatePath('/admin', 'layout');
  return { ok: 'Товар добавлен' };
}

export async function updateSupplyItemAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    await updateSupplyItem(String(fd.get('itemId') ?? ''), formToObject(fd), admin.id);
  } catch (e) {
    return toActionState(e);
  }
  revalidatePath('/admin', 'layout');
  return { ok: 'Сохранено' };
}

export async function removeSupplyItemAction(fd: FormData) {
  const admin = await requireAdmin();
  const supplyId = String(fd.get('supplyId') ?? '');
  try {
    await removeSupplyItem(String(fd.get('itemId') ?? ''), admin.id);
  } catch (e) {
    done(back(supplyId, errParam(e)));
  }
  done(back(supplyId));
}

// ───────── Поставка пришла ─────────

export async function receiveSupplyAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = String(fd.get('supplyId') ?? '');
  const received: { itemId: string; receivedQty: string }[] = [];
  for (const [k, v] of fd.entries()) {
    if (k.startsWith('received:') && typeof v === 'string') {
      if (v.trim() === '') return { error: 'Заполните «Пришло» для каждой позиции (0, если не пришло)' };
      received.push({ itemId: k.slice('received:'.length), receivedQty: v });
    }
  }
  try {
    await receiveSupply(id, received, admin.id);
  } catch (e) {
    return toActionState(e);
  }
  done(back(id, '?arrived=1'));
}

// ───────── Предзаказ ─────────

export async function createPreOrderAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const supplyId = String(fd.get('supplyId') ?? '');
  try {
    await createPreOrder(
      {
        supplyId,
        customer: { phone: fd.get('phone'), name: fd.get('name'), companyName: fd.get('companyName') },
        items: [{ productId: fd.get('productId'), quantity: fd.get('quantity') }],
        neededBy: fd.get('neededBy'),
        comment: fd.get('comment'),
      },
      { adminId: admin.id },
    );
  } catch (e) {
    const s = toActionState(e);
    if (s.fieldErrors) {
      s.fieldErrors = Object.fromEntries(
        Object.entries(s.fieldErrors).map(([k, v]) => [k.replace(/^customer\./, '').replace(/^items\.0\./, ''), v]),
      );
    }
    return s;
  }
  revalidatePath('/admin', 'layout');
  return { ok: 'Предзаказ добавлен' };
}

export async function preOrderStatusAction(fd: FormData) {
  const admin = await requireAdmin();
  const supplyId = String(fd.get('supplyId') ?? '');
  const id = String(fd.get('preOrderId') ?? '');
  try {
    if (fd.get('action') === 'CONFIRM') await confirmPreOrder(id, admin.id);
    else if (fd.get('action') === 'CANCEL') await cancelPreOrder(id, admin.id);
  } catch (e) {
    done(back(supplyId, errParam(e)));
  }
  done(back(supplyId));
}

export async function convertPreOrderAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const quantities: { productId: string; quantity: string }[] = [];
  for (const [k, v] of fd.entries()) {
    if (k.startsWith('qty:') && typeof v === 'string') quantities.push({ productId: k.slice(4), quantity: v || '0' });
  }
  let number: string;
  try {
    number = (await convertPreOrderToOrder(String(fd.get('preOrderId') ?? ''), quantities, admin.id)).number;
  } catch (e) {
    return toActionState(e);
  }
  done(back(String(fd.get('supplyId') ?? ''), `?converted=${encodeURIComponent(number)}`));
}
