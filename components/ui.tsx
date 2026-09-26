import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { clsx } from 'clsx';

// Admin panel-дің қарапайым ортақ элементтері (серверде де, клиентте де жұмыс істейді).

export function PageHeader({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 space-y-2">
      {back && (
        <Link href={back.href} className="text-sm text-muted-foreground hover:text-foreground">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Card({ className, children, title, description }: { className?: string; children: ReactNode; title?: string; description?: ReactNode }) {
  return (
    <section className={clsx('rounded-lg border bg-card p-4 md:p-5', className)}>
      {title && <h2 className="font-medium">{title}</h2>}
      {description && <p className="mb-3 mt-0.5 text-sm text-muted-foreground">{description}</p>}
      {title && !description && <div className="mb-3" />}
      {children}
    </section>
  );
}

const buttonStyles = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90',
  secondary: 'border bg-card hover:bg-muted',
  danger: 'border border-destructive/40 text-destructive hover:bg-destructive/10',
  ghost: 'hover:bg-muted',
};

type Variant = keyof typeof buttonStyles;

export function buttonClass(variant: Variant = 'primary', size: 'md' | 'sm' = 'md') {
  return clsx(
    'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
    size === 'md' ? 'px-4 py-2 text-sm' : 'px-2.5 py-1.5 text-xs',
    buttonStyles[variant],
  );
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ComponentProps<'button'> & { variant?: Variant; size?: 'md' | 'sm' }) {
  return <button className={clsx(buttonClass(variant, size), className)} {...props} />;
}

export function LinkButton({ variant = 'primary', size = 'md', className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: 'md' | 'sm' }) {
  return <Link className={clsx(buttonClass(variant, size), className)} {...props} />;
}

export const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60';

export function Field({ label, hint, error, children, className }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={clsx('block space-y-1', className)}>
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error ? <span className="block text-xs text-destructive">{error}</span> : hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function Alert({ tone = 'info', children }: { tone?: 'info' | 'error' | 'success' | 'warn'; children: ReactNode }) {
  const styles = {
    info: 'bg-secondary text-secondary-foreground',
    error: 'bg-destructive/10 text-destructive',
    success: 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]',
    warn: 'bg-[hsl(var(--warning)/0.14)] text-[hsl(var(--warning))]',
  };
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={clsx('rounded-md px-3 py-2 text-sm', styles[tone])}>
      {children}
    </div>
  );
}

export function Badge({ tone = 'muted', children }: { tone?: 'muted' | 'green' | 'yellow' | 'red' | 'blue' | 'primary'; children: ReactNode }) {
  const styles = {
    muted: 'bg-muted text-muted-foreground',
    green: 'bg-[hsl(var(--success)/0.14)] text-[hsl(var(--success))]',
    yellow: 'bg-[hsl(var(--warning)/0.16)] text-[hsl(var(--warning))]',
    red: 'bg-destructive/12 text-destructive',
    blue: 'bg-[hsl(210_80%_50%/0.12)] text-[hsl(210_70%_42%)] dark:text-[hsl(210_80%_70%)]',
    primary: 'bg-accent text-accent-foreground',
  };
  return <span className={clsx('inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium', styles[tone])}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{children}</div>;
}

export function Stat({ label, value, hint, tone, href }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'warn' | 'danger'; href?: string }) {
  const body = (
    <>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div
        className={clsx(
          'mt-1 font-mono text-2xl font-semibold',
          tone === 'warn' && 'text-[hsl(var(--warning))]',
          tone === 'danger' && 'text-destructive',
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </>
  );
  return href ? (
    <Link href={href} className="block rounded-lg border bg-card p-4 transition hover:border-primary/50">
      {body}
    </Link>
  ) : (
    <div className="rounded-lg border bg-card p-4">{body}</div>
  );
}
