'use client';

import { useActionState, type ReactNode } from 'react';
import { saveCategoryAction, saveSettingsAction } from '@/app/admin/settings/actions';
import { Alert, Button, Field, inputClass } from '@/components/ui';
import type { ActionState } from '@/lib/action-state';

/** Бір баптау бөлімінің формасы: өрістер children арқылы беріледі. */
export function SettingsSection({ section, children }: { section: string; children: ReactNode }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveSettingsAction, {});
  const fieldError = state.fieldErrors ? Object.values(state.fieldErrors)[0] : undefined;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="section" value={section} />
      {children}
      {state.error && <Alert tone="error">{fieldError ?? state.error}</Alert>}
      {state.ok && !pending && <Alert tone="success">✅ {state.ok}</Alert>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Сохранение…' : 'Сохранить'}
      </Button>
    </form>
  );
}

export function CategoryForm({ category }: { category?: { id: string; name: string; emoji: string | null; allowMonobouquet: boolean } }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveCategoryAction, {});
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      {category && <input type="hidden" name="id" value={category.id} />}
      <Field label="Эмодзи" error={e.emoji} className="w-16">
        <input name="emoji" defaultValue={category?.emoji ?? ''} maxLength={8} className={`${inputClass} text-center`} />
      </Field>
      <Field label="Название" error={e.name} className="min-w-40 flex-1">
        <input name="name" defaultValue={category?.name ?? ''} required maxLength={60} className={inputClass} />
      </Field>
      <label className="flex items-center gap-2 pb-2 text-sm">
        <input type="checkbox" name="allowMonobouquet" defaultChecked={category?.allowMonobouquet ?? false} />
        Монобукет
      </label>
      <Button type="submit" variant={category ? 'secondary' : 'primary'} size="sm" disabled={pending} className="mb-1">
        {category ? 'OK' : '+ Добавить'}
      </Button>
      {state.error && <span className="w-full text-xs text-destructive">{state.error}</span>}
      {state.ok && !pending && <span className="w-full text-xs text-[hsl(var(--success))]">✅ {state.ok}</span>}
    </form>
  );
}

