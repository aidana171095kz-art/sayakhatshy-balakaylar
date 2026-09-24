import { MAX_TOTAL, TASKS, TASK_ORDER, scoreKey, type TaskId } from './tasks';

export const SCREEN_COUNT = 16;
/** Ескі нұсқалар күйді осы кілтпен сақтаған — енді ештеңе сақталмайды, тек тазаланады */
export const LEGACY_STORAGE_KEY = 'sayakhatshy-balakaylar:v1';

export interface GameState {
  screen: number;
  /** `${task}.${criterion}` → мұғалім қойған балл */
  scores: Record<string, number>;
  /** Экранның ішкі интерактив күйі (таңдаулар, жауаптар) — экран нөмірі бойынша */
  screenState: Record<number, unknown>;
  /** Мұғалім ашқан үлгі жауаптар — экран нөмірі бойынша */
  revealed: Record<number, boolean>;
}

export const initialState: GameState = { screen: 1, scores: {}, screenState: {}, revealed: {} };

export type Action =
  | { type: 'go'; screen: number }
  | { type: 'setScore'; task: TaskId; criterion: string; value: number }
  | { type: 'setScreenState'; screen: number; value: unknown }
  | { type: 'reveal'; screen: number; value: boolean }
  | { type: 'resetScreen'; screen: number }
  | { type: 'resetAll' };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'go':
      return { ...state, screen: clamp(Math.round(action.screen), 1, SCREEN_COUNT) };
    case 'setScore': {
      const crit = TASKS[action.task]?.criteria.find((c) => c.id === action.criterion);
      if (!crit) return state;
      // Балл ауыстырылады (қосылмайды) және критерий максимумымен шектеледі.
      const value = clamp(Math.round(action.value), 0, crit.max);
      const key = scoreKey(action.task, action.criterion);
      if ((state.scores[key] ?? 0) === value) return state;
      return { ...state, scores: { ...state.scores, [key]: value } };
    }
    case 'setScreenState':
      return { ...state, screenState: { ...state.screenState, [action.screen]: action.value } };
    case 'reveal':
      return { ...state, revealed: { ...state.revealed, [action.screen]: action.value } };
    case 'resetScreen': {
      const scores = { ...state.scores };
      for (const t of TASK_ORDER) {
        if (TASKS[t].screen !== action.screen) continue;
        for (const c of TASKS[t].criteria) delete scores[scoreKey(t, c.id)];
      }
      const screenState = { ...state.screenState };
      delete screenState[action.screen];
      const revealed = { ...state.revealed };
      delete revealed[action.screen];
      return { ...state, scores, screenState, revealed };
    }
    case 'resetAll':
      return initialState;
  }
}

export function taskScore(state: GameState, task: TaskId): number {
  return TASKS[task].criteria.reduce(
    (s, c) => s + clamp(state.scores[scoreKey(task, c.id)] ?? 0, 0, c.max),
    0,
  );
}

/** Жалпы балл әрдайым қайта есептеледі — ешқашан жеке сақталмайды. */
export function totalScore(state: GameState): number {
  return Math.min(
    MAX_TOTAL,
    TASK_ORDER.reduce((s, t) => s + taskScore(state, t), 0),
  );
}

/**
 * Ойын күйі ешқайда сақталмайды: бетті ашқанда/жаңартқанда әрдайым таза бастайды.
 * Ескі нұсқа браузерде қалдырған деректі өшіреді.
 */
export function clearLegacyStorage(storage: Pick<Storage, 'removeItem'> | undefined) {
  try {
    storage?.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* браузер жадына қол жетпесе — ештеңе істемейміз */
  }
}

/** Мұғалімге/тексеруге арналған тікелей сілтеме: `#s5` → 5-экран (күй бәрібір таза). */
export function screenFromHash(hash: string): number {
  const m = /^#s(\d{1,2})$/.exec(hash);
  const n = m ? Number(m[1]) : 1;
  return n >= 1 && n <= SCREEN_COUNT ? n : 1;
}
