'use client';

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from 'react';
import type { ActionState } from '@/lib/action-state';

// React 19 `<form action={...}>` action аяқталған соң форманы АВТОМАТТЫ тазалайды —
// сервер қате қайтарса да. Сондықтан форманы onSubmit + startTransition арқылы жібереміз:
// қате болса енгізілген мәндер сақталады, тек сәтті болғанда (resetOnSuccess) тазаланады.
export function useFormAction(
  action: (state: ActionState, formData: FormData) => Promise<ActionState>,
  opts: { resetOnSuccess?: boolean; confirm?: string } = {},
) {
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const { resetOnSuccess, confirm } = opts;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return; // қайта басуға жол жоқ
    if (confirm && !window.confirm(confirm)) return;
    const formData = new FormData(e.currentTarget);
    startTransition(() => dispatch(formData));
  }

  useEffect(() => {
    if (resetOnSuccess && state.ok) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  return { state, pending, formRef, onSubmit };
}
