import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/server/auth/session';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await getCurrentAdmin()) redirect('/admin');
  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-3xl">🌷</div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">TALSHYN FLOWERS</h1>
          <p className="text-sm text-muted-foreground">Панель администратора</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
