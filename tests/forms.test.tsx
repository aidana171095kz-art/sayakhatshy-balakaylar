// @vitest-environment jsdom
// F2: сервер қате қайтарғанда формадағы мәндер жоғалмауы керек; сәтті болса ғана тазалану.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AnchorHTMLAttributes } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Барлық server action-дар: соңғы берілген жауапты қайтарады (әдепкіде — қате)
const { h, fake } = vi.hoisted(() => {
  const h = { next: undefined as unknown };
  const fake = () =>
    vi.fn(async () => {
      const v = h.next ?? { error: 'Проверьте поля формы' };
      return v instanceof Promise ? await v : v;
    });
  return { h, fake };
});
const reply = (value: unknown) => (h.next = value);

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/app/admin/products/actions', () => ({ saveProductAction: fake(), setProductStatusAction: fake() }));
vi.mock('@/app/admin/stock/actions', () => ({ adjustStockAction: fake() }));
vi.mock('@/app/admin/prices/actions', () => ({ updatePricesAction: fake() }));
vi.mock('@/app/admin/settings/actions', () => ({ saveSettingsAction: fake(), saveCategoryAction: fake(), toggleCategoryAction: fake() }));
vi.mock('@/app/admin/monobouquets/actions', () => ({ createMonobouquetAction: fake(), updateMonobouquetAction: fake() }));
vi.mock('@/app/admin/supplies/actions', () => ({
  createSupplyAction: fake(),
  updateSupplyAction: fake(),
  addSupplyItemAction: fake(),
  updateSupplyItemAction: fake(),
  receiveSupplyAction: fake(),
  createPreOrderAction: fake(),
  convertPreOrderAction: fake(),
}));

import { saveProductAction } from '@/app/admin/products/actions';
import { adjustStockAction } from '@/app/admin/stock/actions';
import { receiveSupplyAction } from '@/app/admin/supplies/actions';
import { AdjustStockForm } from '@/components/admin/adjust-stock-form';
import { MonobouquetCreateForm, MonobouquetUpdateForm } from '@/components/admin/monobouquet-forms';
import { PriceRow } from '@/components/admin/price-row';
import { ProductForm } from '@/components/admin/product-form';
import { CategoryForm, SettingsSection } from '@/components/admin/settings-forms';
import {
  AddSupplyItemForm,
  ArrivalForm,
  ConvertPreOrderForm,
  PreOrderForm,
  SupplyForm,
  SupplyItemEditForm,
} from '@/components/admin/supply-forms';

const val = (name: string) => (document.querySelector(`[name="${name}"]`) as HTMLInputElement).value;
const setVal = (name: string, value: string) =>
  fireEvent.change(document.querySelector(`[name="${name}"]`)!, { target: { value } });
const submit = async () => {
  await act(async () => {
    fireEvent.submit(document.querySelector('form')!);
  });
};

beforeEach(() => {
  h.next = undefined;
  vi.clearAllMocks();
});
afterEach(cleanup);

const categories = [
  { id: 'c1', name: 'Роза', nameKk: null, slug: 'rose', emoji: '🌹', sortOrder: 1, isActive: true, allowMonobouquet: true, createdAt: new Date(), updatedAt: new Date() },
];

describe('F2: қате болғанда формадағы мәндер сақталады', () => {
  it('Товар: Роза / Explorer / 26000 — қатеден кейін орнында, қате көрінеді', async () => {
    reply({ error: 'Проверьте поля формы', fieldErrors: { packageQuantity: 'Укажите, сколько штук в упаковке' } });
    render(<ProductForm categories={categories} blobReady={false} globalThreshold={3} />);
    setVal('name', 'Роза');
    setVal('categoryId', 'c1');
    setVal('variety', 'Explorer');
    setVal('pricePerPackage', '26000');
    setVal('initialStock', '7');
    await submit();

    await screen.findByText('Укажите, сколько штук в упаковке');
    expect(saveProductAction).toHaveBeenCalledTimes(1);
    expect(val('name')).toBe('Роза');
    expect(val('variety')).toBe('Explorer');
    expect(val('pricePerPackage')).toBe('26000');
    expect(val('initialStock')).toBe('7');
    expect(val('categoryId')).toBe('c1');
  });

  it('Монобукет: CONFIRMED бағасыз → қате, статус NEW-ге қайтпайды', async () => {
    reply({ error: 'Перед подтверждением укажите цену' });
    render(<MonobouquetUpdateForm id="m1" status="NEW" quotedPrice={null} managerNote={null} nextStatuses={['CONTACTED', 'CONFIRMED', 'CANCELLED']} />);
    setVal('status', 'CONFIRMED');
    setVal('managerNote', 'клиент ждёт');
    await submit();

    await screen.findByText('Перед подтверждением укажите цену');
    expect(val('status')).toBe('CONFIRMED');
    expect(val('quotedPrice')).toBe('');
    expect(val('managerNote')).toBe('клиент ждёт');
  });

  it('Монобукет (жаңа сұраныс): қатеден кейін мәндер орнында', async () => {
    render(<MonobouquetCreateForm categories={[{ id: 'c1', label: 'Роза' }]} sizes={['L']} wrappings={['Крафт']} />);
    setVal('phone', '+77010000001');
    setVal('name', 'Дана');
    setVal('stemCount', '51');
    setVal('size', 'L');
    setVal('comment', 'Ақ раушан керек');
    await submit();
    await screen.findByText('Проверьте поля формы');
    expect([val('phone'), val('name'), val('stemCount'), val('size'), val('comment')]).toEqual(['+77010000001', 'Дана', '51', 'L', 'Ақ раушан керек']);
  });

  it('Склад: себеп + саны + комментарий қатеден кейін сақталады; сәтті болса тазаланады', async () => {
    reply({ error: 'Недостаточно доступного остатка для этой операции' });
    render(<AdjustStockForm productId="p1" unit="уп." />);
    setVal('reason', 'CORRECTION_MINUS');
    setVal('quantity', '100');
    setVal('note', 'важный комментарий');
    await submit();
    await screen.findByText('Недостаточно доступного остатка для этой операции');
    expect([val('reason'), val('quantity'), val('note')]).toEqual(['CORRECTION_MINUS', '100', 'важный комментарий']);

    reply({ ok: 'Остаток обновлён' });
    setVal('quantity', '1');
    await submit();
    await screen.findByText(/Остаток обновлён/);
    await waitFor(() => expect(val('quantity')).toBe(''));
    expect(val('note')).toBe('');
    expect(adjustStockAction).toHaveBeenCalledTimes(2);
  });

  it('Цены: қатеден кейін енгізілген баға қалады', async () => {
    render(<PriceRow productId="p1" label="Роза" meta="" saleUnit="PACKAGE" pricePerUnit={null} pricePerPackage={25000} />);
    setVal('pricePerPackage', '26500');
    await submit();
    await screen.findByText('Проверьте поля формы');
    expect(val('pricePerPackage')).toBe('26500');
  });

  it('Настройки: бөлім қатеден кейін мәндерді сақтайды', async () => {
    reply({ error: 'Проверьте поля формы', fieldErrors: { name: 'Укажите название' } });
    render(
      <SettingsSection section="business">
        <input name="instagram" defaultValue="" />
        <input name="phone" defaultValue="" />
      </SettingsSection>,
    );
    setVal('instagram', '@talshyn.flowers');
    setVal('phone', '+7 700 000 00 00');
    await submit();
    await screen.findByText('Укажите название');
    expect([val('instagram'), val('phone')]).toEqual(['@talshyn.flowers', '+7 700 000 00 00']);
  });

  it('Категория (жаңа): қатеде сақталады, сәттіде тазаланады', async () => {
    render(<CategoryForm />);
    setVal('name', 'Пионы');
    await submit();
    await screen.findByText('Проверьте поля формы');
    expect(val('name')).toBe('Пионы');
    reply({ ok: 'Категория добавлена' });
    await submit();
    await screen.findByText(/Категория добавлена/);
    await waitFor(() => expect(val('name')).toBe(''));
  });

  it('Поставка (жаңа): қатеден кейін атауы, күні, комментарийі қалады', async () => {
    render(<SupplyForm />);
    setVal('title', 'Поставка №2');
    setVal('expectedDate', '2026-10-12');
    setVal('notes', 'Қытайдан');
    await submit();
    await screen.findByText('Проверьте поля формы');
    expect([val('title'), val('expectedDate'), val('notes')]).toEqual(['Поставка №2', '2026-10-12', 'Қытайдан']);
  });

  it('Поставкаға тауар қосу: қатеде сақталады, сәттіде тазаланады', async () => {
    render(<AddSupplyItemForm supplyId="s1" products={[{ id: 'p1', label: 'Роза' }]} />);
    setVal('productId', 'p1');
    setVal('expectedQty', '20');
    setVal('preorderLimit', '10');
    await submit();
    await screen.findByText('Проверьте поля формы');
    expect([val('productId'), val('expectedQty'), val('preorderLimit')]).toEqual(['p1', '20', '10']);
    reply({ ok: 'Товар добавлен' });
    await submit();
    await screen.findByText(/Товар добавлен/);
    await waitFor(() => expect(val('expectedQty')).toBe(''));
  });

  it('Позицияны өзгерту: қатеден кейін сандар қалады', async () => {
    reply({ error: 'Лимит меньше уже принятых предзаказов (5)' });
    render(<SupplyItemEditForm itemId="i1" expectedQty={20} preorderLimit={10} />);
    setVal('expectedQty', '18');
    setVal('preorderLimit', '3');
    await submit();
    await screen.findByText('Лимит меньше уже принятых предзаказов (5)');
    expect([val('expectedQty'), val('preorderLimit')]).toEqual(['18', '3']);
  });

  it('Поставка пришла: қатеден кейін «Пришло» сандары қалады; растаудан бас тартса — жіберілмейді', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    render(
      <ArrivalForm
        supplyId="s1"
        items={[
          { id: 'i1', label: 'Роза 60', unit: 'уп.', expectedQty: 20, preordered: 5 },
          { id: 'i2', label: 'Роза 70', unit: 'уп.', expectedQty: 15, preordered: 0 },
        ]}
      />,
    );
    setVal('received:i1', '18');
    setVal('received:i2', '0');

    confirmSpy.mockReturnValueOnce(false);
    await submit();
    expect(receiveSupplyAction).not.toHaveBeenCalled();

    confirmSpy.mockReturnValueOnce(true);
    await submit();
    await screen.findByText('Проверьте поля формы');
    expect(receiveSupplyAction).toHaveBeenCalledTimes(1);
    expect([val('received:i1'), val('received:i2')]).toEqual(['18', '0']);
    confirmSpy.mockRestore();
  });

  it('Предзаказ (қолмен): қатеде барлық өрістер сақталады, сәттіде тазаланады', async () => {
    reply({ error: 'Роза: для предзаказа осталось 5' });
    render(<PreOrderForm supplyId="s1" products={[{ id: 'p1', label: 'Роза' }]} />);
    const fields: [string, string][] = [
      ['phone', '8 701 123 45 67'],
      ['name', 'Айдана'],
      ['companyName', 'Flower Shop'],
      ['productId', 'p1'],
      ['quantity', '6'],
      ['comment', 'срочно'],
    ];
    fields.forEach(([n, v]) => setVal(n, v));
    await submit();
    await screen.findByText('Роза: для предзаказа осталось 5');
    expect(fields.map(([n]) => val(n))).toEqual(fields.map(([, v]) => v));
    reply({ ok: 'Предзаказ добавлен' });
    await submit();
    await screen.findByText(/Предзаказ добавлен/);
    await waitFor(() => expect(val('name')).toBe(''));
  });

  it('Предзаказ → заказ: қатеден кейін түзетілген сан қалады', async () => {
    reply({ error: 'Недостаточно доступного остатка для этой операции' });
    render(<ConvertPreOrderForm supplyId="s1" preOrderId="po1" items={[{ productId: 'p1', label: 'Роза', quantity: 5, available: 3 }]} />);
    setVal('qty:p1', '2');
    await submit();
    await screen.findByText('Недостаточно доступного остатка для этой операции');
    expect(val('qty:p1')).toBe('2');
  });
});

describe('F2: жіберу кезінде қайта басуға болмайды', () => {
  it('жауап келгенше батырма өшірулі, екінші submit жіберілмейді', async () => {
    let resolve!: (v: unknown) => void;
    reply(new Promise((r) => (resolve = r)));
    render(<AdjustStockForm productId="p1" unit="уп." />);
    setVal('reason', 'RECEIPT');
    setVal('quantity', '3');
    await submit();
    const button = screen.getByRole('button') as HTMLButtonElement;
    await waitFor(() => expect(button.disabled).toBe(true));
    expect(button.textContent).toBe('Сохранение…');
    await submit();
    expect(adjustStockAction).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ ok: 'Остаток обновлён' }));
    await waitFor(() => expect(button.disabled).toBe(false));
  });

  it('userEvent: екі рет жылдам басу — бір ғана сұраныс', async () => {
    reply(new Promise(() => {}));
    render(<PriceRow productId="p1" label="Роза" meta="" saleUnit="PACKAGE" pricePerUnit={null} pricePerPackage={25000} />);
    const user = userEvent.setup();
    const btn = screen.getByRole('button', { name: 'Сохранить' });
    await user.dblClick(btn);
    const { updatePricesAction } = await import('@/app/admin/prices/actions');
    expect(updatePricesAction).toHaveBeenCalledTimes(1);
  });
});
