'use client';

import { useActionState } from 'react';
import { changePasswordAction, type ChangePasswordState } from '../actions';

const input =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';

export function PasswordForm() {
  const [state, action, pending] = useActionState<ChangePasswordState, FormData>(changePasswordAction, {});
  return (
    <form action={action} className="max-w-sm space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-medium">Текущий пароль</span>
        <input name="current" type="password" autoComplete="current-password" required className={input} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Новый пароль</span>
        <input name="next" type="password" autoComplete="new-password" required minLength={10} className={input} />
        <span className="text-xs text-muted-foreground">Минимум 10 символов, буквы и цифры.</span>
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Повторите новый пароль</span>
        <input name="confirm" type="password" autoComplete="new-password" required className={input} />
      </label>
      {state.error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {pending ? 'Сохранение…' : 'Сменить пароль'}
      </button>
    </form>
  );
}
