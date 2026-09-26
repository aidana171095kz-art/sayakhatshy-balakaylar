'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

/**
 * `<form action={serverAction}>` ішіндегі батырма: жіберілгеннен бастап өшірулі,
 * жүктелу мәтінін көрсетеді, қайта басуға жол бермейді. `confirm` берілсе — алдымен сұрайды.
 */
export function SubmitButton({
  children,
  pendingText = '…',
  confirm,
  className,
  title,
}: {
  children: ReactNode;
  pendingText?: ReactNode;
  confirm?: string;
  className?: string;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      title={title}
      className={`${className ?? ''} disabled:cursor-wait disabled:opacity-60`}
      onClick={(e) => {
        if (pending || (confirm && !window.confirm(confirm))) e.preventDefault();
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}
