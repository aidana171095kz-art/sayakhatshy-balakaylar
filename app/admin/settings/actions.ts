'use server';

import { revalidatePath } from 'next/cache';
import { type ActionState, toActionState } from '@/lib/action-state';
import { requireAdmin } from '@/server/auth/session';
import { createCategory, setCategoryActive, updateCategory } from '@/server/services/categories';
import { type SettingsKey, updateSetting } from '@/server/services/settings';

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

function readSection(key: SettingsKey, fd: FormData): unknown {
  switch (key) {
    case 'business':
      return {
        name: fd.get('name'),
        phone: fd.get('phone'),
        whatsappNumber: fd.get('whatsappNumber'),
        address: fd.get('address'),
        instagram: fd.get('instagram'),
        telegram: fd.get('telegram'),
        workingHours: fd.get('workingHours'),
      };
    case 'general':
      return { lowStockThreshold: fd.get('lowStockThreshold'), currency: 'KZT', language: fd.get('language') };
    case 'orders':
      return { minOrderAmount: fd.get('minOrderAmount') || 0, requireCompanyName: fd.get('requireCompanyName') === 'on' };
    case 'preorders':
      return { closeHoursBeforeArrival: fd.get('closeHoursBeforeArrival') || 0, maxQtyPerItem: fd.get('maxQtyPerItem') || 0 };
    case 'monobouquet':
      return { sizes: lines(fd.get('sizes')), wrappings: lines(fd.get('wrappings')) };
  }
}

export async function saveSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin(['OWNER']);
  const key = String(fd.get('section') ?? '') as SettingsKey;
  if (!['business', 'general', 'orders', 'preorders', 'monobouquet'].includes(key)) return { error: 'Неизвестный раздел' };
  try {
    await updateSetting(key, readSection(key, fd), admin.id);
  } catch (e) {
    return toActionState(e);
  }
  revalidatePath('/admin', 'layout');
  return { ok: 'Сохранено' };
}

export async function saveCategoryAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin(['OWNER']);
  const id = String(fd.get('id') ?? '');
  const data = { name: fd.get('name'), emoji: fd.get('emoji'), allowMonobouquet: fd.get('allowMonobouquet') === 'on' };
  try {
    if (id) await updateCategory(id, data, admin.id);
    else await createCategory(data, admin.id);
  } catch (e) {
    return toActionState(e);
  }
  revalidatePath('/admin', 'layout');
  return { ok: id ? 'Сохранено' : 'Категория добавлена' };
}

export async function toggleCategoryAction(fd: FormData) {
  const admin = await requireAdmin(['OWNER']);
  await setCategoryActive(String(fd.get('id') ?? ''), fd.get('isActive') === 'true', admin.id);
  revalidatePath('/admin', 'layout');
}
