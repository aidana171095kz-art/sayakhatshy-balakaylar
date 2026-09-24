import { notFound } from 'next/navigation';
import { MonobouquetUpdateForm } from '@/components/admin/monobouquet-forms';
import { Badge, Card, PageHeader } from '@/components/ui';
import { formatDateTime, formatDay } from '@/lib/format';
import { MONO_STATUS } from '@/lib/labels';
import { formatPhone } from '@/lib/phone';
import { requireAdmin } from '@/server/auth/session';
import { prisma } from '@/server/db';
import { MONO_TRANSITIONS } from '@/server/services/monobouquets';

export const dynamic = 'force-dynamic';

export default async function MonobouquetPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const r = await prisma.monobouquetRequest.findUnique({
    where: { id },
    include: { customer: true, category: true, quotedBy: { select: { email: true } } },
  });
  if (!r) notFound();

  const rows: [string, React.ReactNode][] = [
    ['Клиент', r.customer.name ?? r.customer.profileName ?? '—'],
    ['Телефон', <a key="p" href={`https://wa.me/${r.customer.waId}`} className="underline" target="_blank" rel="noreferrer">{formatPhone(r.customer.waId)}</a>],
    ['Компания', r.customer.companyName ?? '—'],
    ['Цветок', [r.category?.name, r.flowerNote].filter(Boolean).join(' — ') || '—'],
    ['Количество', r.stemCount ? `${r.stemCount} шт` : '—'],
    ['Размер', r.size ?? '—'],
    ['Упаковка', r.wrapping ?? '—'],
    ['К дате', formatDay(r.neededBy)],
    ['Создан', formatDateTime(r.createdAt)],
    ['Цену указал', r.quotedBy ? `${r.quotedBy.email}, ${formatDateTime(r.quotedAt)}` : '—'],
  ];

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={`💐 ${r.number}`}
        back={{ href: '/admin/monobouquets', label: 'Монобукеты' }}
        description={<Badge tone={MONO_STATUS[r.status].tone}>{MONO_STATUS[r.status].label}</Badge>}
      />
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Запрос">
          <dl className="space-y-2 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[7rem_1fr] gap-2">
                <dt className="text-muted-foreground">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card title="Обработка">
          <MonobouquetUpdateForm id={r.id} status={r.status} quotedPrice={r.quotedPrice} comment={r.comment} nextStatuses={MONO_TRANSITIONS[r.status]} />
        </Card>
      </div>
    </div>
  );
}
