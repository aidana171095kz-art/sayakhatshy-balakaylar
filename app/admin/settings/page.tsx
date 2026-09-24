import { CategoryForm, SettingsSection } from '@/components/admin/settings-forms';
import { Badge, Card, Field, PageHeader, inputClass as ic } from '@/components/ui';
import { requireAdmin } from '@/server/auth/session';
import { whatsappConfigStatus } from '@/server/env';
import { listCategories } from '@/server/services/categories';
import { getSettings } from '@/server/services/settings';
import { isBlobConfigured } from '@/server/services/uploads';
import { toggleCategoryAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requireAdmin(['OWNER']);
  const [s, categories] = await Promise.all([getSettings(), listCategories()]);
  const b = s.business;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="⚙️ Настройки" description="Эти данные бот будет использовать в ответах клиентам." />

      <Card title="Бизнес">
        <SettingsSection section="business">
                      <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Название *">
                <input name="name" defaultValue={b.name} required maxLength={100} className={ic} />
              </Field>
              <Field label="Адрес *">
                <input name="address" defaultValue={b.address} required maxLength={200} className={ic} />
              </Field>
              <Field label="Телефон">
                <input name="phone" defaultValue={b.phone ?? ''} inputMode="tel" maxLength={40} className={ic} />
              </Field>
              <Field label="WhatsApp номер" hint="Номер бота (новая SIM)">
                <input name="whatsappNumber" defaultValue={b.whatsappNumber ?? ''} inputMode="tel" maxLength={40} className={ic} />
              </Field>
              <Field label="Instagram">
                <input name="instagram" defaultValue={b.instagram ?? ''} placeholder="@talshyn.flowers" maxLength={100} className={ic} />
              </Field>
              <Field label="Telegram">
                <input name="telegram" defaultValue={b.telegram ?? ''} placeholder="@username" maxLength={100} className={ic} />
              </Field>
              <Field label="Часы работы" className="sm:col-span-2">
                <input name="workingHours" defaultValue={b.workingHours ?? ''} placeholder="Пн–Сб 9:00–19:00" maxLength={100} className={ic} />
              </Field>
            </div>
        </SettingsSection>
      </Card>

      <Card title="Общие">
        <SettingsSection section="general">
                      <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Порог LOW STOCK" hint="Доступно ≤ порога → ⚠️">
                <input name="lowStockThreshold" type="number" min={0} defaultValue={s.general.lowStockThreshold} required className={ic} />
              </Field>
              <Field label="Валюта" hint="Пока поддерживается только тенге">
                <input value="₸ Тенге (KZT)" disabled readOnly className={ic} />
              </Field>
              <Field label="Язык бота по умолчанию" hint="Клиент может сменить язык">
                <select name="language" defaultValue={s.general.language} className={ic}>
                  <option value="RU">Русский</option>
                  <option value="KK">Қазақша</option>
                </select>
              </Field>
            </div>
        </SettingsSection>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Заказы">
          <SettingsSection section="orders">
                          <>
                <Field label="Минимальная сумма заказа, ₸" hint="0 — без ограничения">
                  <input name="minOrderAmount" type="number" min={0} defaultValue={s.orders.minOrderAmount} className={ic} />
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="requireCompanyName" defaultChecked={s.orders.requireCompanyName} />
                  Обязательно спрашивать название магазина/компании
                </label>
              </>
          </SettingsSection>
        </Card>
        <Card title="Предзаказ">
          <SettingsSection section="preorders">
                          <>
                <Field label="Максимум на одну позицию" hint="Для одного клиента. 0 — без ограничения">
                  <input name="maxQtyPerItem" type="number" min={0} defaultValue={s.preorders.maxQtyPerItem} className={ic} />
                </Field>
                <Field label="Закрывать за N часов до поставки" hint="0 — закрываете вручную. Автоматика — на этапе 6">
                  <input name="closeHoursBeforeArrival" type="number" min={0} defaultValue={s.preorders.closeHoursBeforeArrival} className={ic} />
                </Field>
              </>
          </SettingsSection>
        </Card>
      </div>

      <Card title="💐 Монобукеты" description="Варианты, которые бот предложит клиенту. По одному в строке. Пусто — клиент напишет сам.">
        <SettingsSection section="monobouquet">
                      <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Размеры">
                <textarea name="sizes" rows={4} defaultValue={s.monobouquet.sizes.join('\n')} placeholder={'S\nM\nL'} className={ic} />
              </Field>
              <Field label="Упаковка">
                <textarea name="wrappings" rows={4} defaultValue={s.monobouquet.wrappings.join('\n')} placeholder={'Крафт\nПлёнка\nБез упаковки'} className={ic} />
              </Field>
            </div>
        </SettingsSection>
      </Card>

      <Card title="Категории" description="Скрытая категория и её товары не показываются клиентам.">
        <ul className="mb-4 divide-y">
          {categories.map((c) => (
            <li key={c.id} className="flex flex-wrap items-end gap-2 py-3">
              <div className="flex-1">
                <CategoryForm category={c} />
              </div>
              <span className="pb-2 text-xs text-muted-foreground">товаров: {c._count.products}</span>
              <form action={toggleCategoryAction} className="pb-1">
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="isActive" value={String(!c.isActive)} />
                <button className="rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted">{c.isActive ? 'Скрыть' : 'Показать'}</button>
              </form>
              {!c.isActive && <Badge>скрыта</Badge>}
            </li>
          ))}
        </ul>
        <CategoryForm />
      </Card>

      <Card title="Подключения" description="Показывается только, подключено или нет. Значения ключей не отображаются.">
        <ul className="grid gap-1 font-mono text-xs sm:grid-cols-2">
          <li>{isBlobConfigured() ? '✅' : '⬜'} BLOB_READ_WRITE_TOKEN (фото)</li>
          {whatsappConfigStatus().map((w) => (
            <li key={w.key}>
              {w.present ? '✅' : '⬜'} {w.key}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
