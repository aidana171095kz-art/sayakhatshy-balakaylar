import { SupplyForm } from '@/components/admin/supply-forms';
import { Card, PageHeader } from '@/components/ui';
import { requireAdmin } from '@/server/auth/session';

export default async function NewSupplyPage() {
  await requireAdmin();
  return (
    <div className="max-w-xl">
      <PageHeader title="📦 Новая поставка" back={{ href: '/admin/supplies', label: 'Поставки' }} description="Шаг 1 из 4 — основные данные" />
      <Card>
        <SupplyForm />
      </Card>
    </div>
  );
}
