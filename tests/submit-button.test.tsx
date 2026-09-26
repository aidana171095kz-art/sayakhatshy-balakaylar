// @vitest-environment jsdom
// F4: <form action={serverAction}> батырмалары — жіберілгеннен кейін өшірулі, жүктелу мәтіні, қайта басу жоқ.
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SubmitButton } from '@/components/admin/submit-button';

afterEach(cleanup);

function setup(props: { confirm?: string } = {}) {
  let resolve!: () => void;
  const action = vi.fn(() => new Promise<void>((r) => (resolve = r)));
  render(
    <form action={action}>
      <SubmitButton pendingText="Сохранение…" {...props}>
        Скрыть
      </SubmitButton>
    </form>,
  );
  const button = screen.getByRole('button') as HTMLButtonElement;
  return { action, button, finish: () => act(async () => resolve()) };
}

describe('F4: SubmitButton', () => {
  it('басылғаннан кейін өшірулі және жүктелу мәтінін көрсетеді; аяқталғанда қалпына келеді', async () => {
    const { action, button, finish } = setup();
    await userEvent.setup().click(button);
    await waitFor(() => expect(button.disabled).toBe(true));
    expect(button.textContent).toBe('Сохранение…');
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(action).toHaveBeenCalledTimes(1);
    await finish();
    await waitFor(() => expect(button.disabled).toBe(false));
    expect(button.textContent).toBe('Скрыть');
  });

  it('екі рет жылдам басу — action бір рет қана', async () => {
    const { action, button } = setup();
    await userEvent.setup().dblClick(button);
    await waitFor(() => expect(button.disabled).toBe(true));
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('confirm: бас тартса — жіберілмейді, келіссе — жіберіледі', async () => {
    const spy = vi.spyOn(window, 'confirm');
    const { action, button } = setup({ confirm: 'Отменить поставку?' });
    const user = userEvent.setup();
    spy.mockReturnValueOnce(false);
    await user.click(button);
    expect(action).not.toHaveBeenCalled();
    expect(button.disabled).toBe(false);
    spy.mockReturnValueOnce(true);
    await user.click(button);
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith('Отменить поставку?');
    spy.mockRestore();
  });
});
