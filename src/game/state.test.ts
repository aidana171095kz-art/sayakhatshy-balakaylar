import { describe, expect, it } from 'vitest';
import { clearLegacyStorage, initialState, LEGACY_STORAGE_KEY, reducer, screenFromHash, taskScore, totalScore, type Action, type GameState } from './state';
import { MAX_TOTAL, TASKS, TASK_ORDER, taskMax } from './tasks';

const run = (actions: Action[], from: GameState = initialState) => actions.reduce(reducer, from);
const maxAll = (): Action[] =>
  TASK_ORDER.flatMap((t) => TASKS[t].criteria.map((c) => ({ type: 'setScore', task: t, criterion: c.id, value: c.max }) as Action));

describe('бағалау құрылымы', () => {
  it('Word бағалау парағы: 2+2+2+1+2+1 = 10', () => {
    expect(TASK_ORDER.map(taskMax)).toEqual([2, 2, 2, 1, 2, 1]);
    expect(TASK_ORDER.reduce((s, t) => s + taskMax(t), 0)).toBe(MAX_TOTAL);
  });

  it('бір әрекетті қайталау балл қоспайды', () => {
    const once = run([{ type: 'setScore', task: 'bag', criterion: 'named', value: 1 }]);
    const many = run(Array(10).fill({ type: 'setScore', task: 'bag', criterion: 'named', value: 1 }));
    expect(totalScore(once)).toBe(1);
    expect(totalScore(many)).toBe(1);
  });

  it('критерий өз максимумынан аспайды', () => {
    const s = run([
      { type: 'setScore', task: 'oddWord', criterion: 'found', value: 5 },
      { type: 'setScore', task: 'trueFalse', criterion: 'distinguish', value: 99 },
      { type: 'setScore', task: 'ticket', criterion: 'answered', value: 3 },
    ]);
    expect(taskScore(s, 'oddWord')).toBe(1);
    expect(taskScore(s, 'trueFalse')).toBe(2);
    expect(taskScore(s, 'ticket')).toBe(1);
  });

  it('дұрыс/бұрыс: мұғалім 0 / 1 / 2 қоя алады, екі рет есептелмейді', () => {
    for (const v of [0, 1, 2]) {
      const s = run([
        { type: 'setScore', task: 'trueFalse', criterion: 'distinguish', value: v },
        { type: 'setScore', task: 'trueFalse', criterion: 'distinguish', value: v },
      ]);
      expect(totalScore(s)).toBe(v);
    }
  });

  it('жалпы балл 10-нан аспайды', () => {
    const s = run([...maxAll(), ...maxAll()]);
    expect(totalScore(s)).toBe(10);
  });

  it('теріс және белгісіз мәндер қабылданбайды', () => {
    const s = run([
      { type: 'setScore', task: 'bag', criterion: 'named', value: -3 },
      { type: 'setScore', task: 'bag', criterion: 'nope', value: 1 },
    ]);
    expect(totalScore(s)).toBe(0);
    expect(s.scores).not.toHaveProperty('bag.nope');
  });

  it('тапсырманы reset — тек сол экранның балы мен күйі тазаланады', () => {
    let s = run([...maxAll(), { type: 'setScreenState', screen: 2, value: { picked: ['карта'] } }, { type: 'reveal', screen: 2, value: true }]);
    s = reducer(s, { type: 'resetScreen', screen: 2 });
    expect(taskScore(s, 'bag')).toBe(0);
    expect(s.screenState[2]).toBeUndefined();
    expect(s.revealed[2]).toBeUndefined();
    expect(totalScore(s)).toBe(8);
  });

  it('толық reset бәрін тазалайды', () => {
    const s = run([...maxAll(), { type: 'go', screen: 9 }, { type: 'resetAll' }]);
    expect(s).toEqual(initialState);
    expect(totalScore(s)).toBe(0);
  });

  it('экран нөмірі 1..16 аралығында', () => {
    expect(run([{ type: 'go', screen: 0 }]).screen).toBe(1);
    expect(run([{ type: 'go', screen: 99 }]).screen).toBe(16);
  });

  it('күй сақталмайды: ескі жад тазаланады, қатесі ойынды тоқтатпайды', () => {
    const removed: string[] = [];
    clearLegacyStorage({ removeItem: (k: string) => removed.push(k) });
    expect(removed).toEqual([LEGACY_STORAGE_KEY]);
    expect(() => clearLegacyStorage({ removeItem: () => { throw new Error('blocked'); } })).not.toThrow();
    expect(() => clearLegacyStorage(undefined)).not.toThrow();
  });

  it('тікелей сілтеме #sN тек экранды таңдайды, қате мән → 1-экран', () => {
    expect(screenFromHash('#s5')).toBe(5);
    expect(screenFromHash('#s16')).toBe(16);
    expect(screenFromHash('')).toBe(1);
    expect(screenFromHash('#s0')).toBe(1);
    expect(screenFromHash('#s99')).toBe(1);
    expect(screenFromHash('#x')).toBe(1);
  });
});
