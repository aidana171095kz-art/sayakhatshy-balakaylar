import Link from 'next/link';
import type { MonobouquetStatus } from '@prisma/client';
import { MonobouquetCreateForm } from '@/components/admin/monobouquet-forms';
import { Badge, Empty, PageHeader } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { MONO_STATUS } from '@/lib/labels';
import { formatPhone } from '@/lib/phone';
import { formatTenge } from '@/lib/pricing';
import { requireAdmin } from '@/server/auth/session';
import { prisma } from '@/server/db';
import { listMonobouquets } from '@/server/services/monobouquets';
import { getSetting } from '@/server/services/settings';

export const dynamic = 'force-dynamic';

const STATUSES = Object.keys(MONO_STATUS) as MonobouquetStatus[];

export default async function MonobouquetsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const filter = STATUSES.includes(status as MonobouquetStatus) ? (status as MonobouquetStatus) : undefined;
  const [rows, categories, mono] = await Promise.all([
    listMonobouquets(filter),
    prisma.category.findMany({ where: { isActive: true, allowMonobouquet: true }, orderBy: { sortOrder: 'asc' } }),
    getSetting('monobouquet'),
  ]);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="💐 Монобукеты"
        description="Монобукет делается под заказ: менеджер связывается с клиентом и указывает цену. Склад автоматически не меняется."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/monobouquets" className={`rounded-full border px-3 py-1 text-sm ${!filter ? 'border-primary bg-accent font-medium' : 'hover:bg-muted'}`}>
          Все
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/monobouquets?status=${s}`}
            className={`rounded-full border px-3 py-1 text-sm ${filter === s ? 'border-primary bg-accent font-medium' : 'hover:bg-muted'}`}
          >
            {MONO_STATUS[s].label}
          </Link>
        ))}
      </div>

      <details className="mb-6 rounded-lg border bg-card p-4">
        <summary className="cursor-pointer text-sm font-medium">+ Новый запрос (звонок, Instagram)</summary>
        <div className="mt-4">
          <MonobouquetCreateForm
            categories={categories.map((c) => ({ id: c.id, label: `${c.emoji ?? ''} ${c.name}` }))}
            sizes={mono.sizes}
            wrappings={mono.wrappings}
          />
        </div>
      </details>

      {rows.length === 0 ? (
        <Empty>Запросов нет. Позже они будут приходить из WhatsApp-бота.</Empty>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/admin/monobouquets/${r.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-muted/50">
                <div className="min-w-0 flex-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{r.number}</span>
                    <span className="font-medium">{r.customer.name ?? r.customer.profileName ?? formatPhone(r.customer.waId)}</span>
                    <Badge tone={MONO_STATUS[r.status].tone}>{MONO_STATUS[r.status].label}</Badge>
                  </div>
                  <div className="text-muted-foreground">
                    {[r.category?.name, r.flowerNote, r.stemCount && `${r.stemCount} шт`, r.size, r.wrapping].filter(Boolean).join(' · ') || '—'}
                  </div>
                  <div className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</div>
                </div>
                <div className="font-mono">{r.quotedPrice !== null ? formatTenge(r.quotedPrice) : <span className="text-sm text-muted-foreground">цена не указана</span>}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
