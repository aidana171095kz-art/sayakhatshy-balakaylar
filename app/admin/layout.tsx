import Link from 'next/link';
import { requireAdmin } from '@/server/auth/session';
import { NAV } from '@/components/admin/nav';
import { SideNav } from '@/components/admin/side-nav';
import { logoutAction } from './actions';
import { SubmitButton } from '@/components/admin/submit-button';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const items = NAV.filter((i) => !i.ownerOnly || admin.role === 'OWNER');

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b bg-card md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="px-4 py-4">
          <Link href="/admin" className="text-lg font-semibold tracking-tight">
            🌷 TALSHYN
          </Link>
          <p className="text-xs text-muted-foreground">{admin.email} · {admin.role === 'OWNER' ? 'Владелец' : 'Менеджер'}</p>
        </div>
        <SideNav items={items} />
        <div className="flex gap-2 border-t px-4 py-3 text-sm md:flex-col">
          <Link href="/admin/account" className="text-muted-foreground hover:text-foreground">
            🔑 Сменить пароль
          </Link>
          <form action={logoutAction}>
            <SubmitButton pendingText="↩ Выход…" className="text-muted-foreground hover:text-foreground">
              ↩ Выйти
            </SubmitButton>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
