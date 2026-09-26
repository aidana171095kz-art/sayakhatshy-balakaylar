import { requireAdmin } from '@/server/auth/session';
import { PasswordForm } from './password-form';

export default async function AccountPage() {
  const admin = await requireAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Смена пароля</h1>
        <p className="text-sm text-muted-foreground">{admin.email}</p>
      </div>
      {admin.mustChangePassword && (
        <p className="max-w-sm rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">
          Это первый вход. Задайте свой пароль, чтобы продолжить работу.
        </p>
      )}
      <PasswordForm />
    </div>
  );
}
