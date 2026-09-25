import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { TaskId } from './tasks';
import { clearLegacyStorage, initialState, reducer, screenFromHash, totalScore, type Action, type GameState } from './state';

interface GameContextValue {
  state: GameState;
  dispatch: (a: Action) => void;
  total: number;
}

const GameContext = createContext<GameContextValue | null>(null);

const storage = (): Storage | undefined => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

export function GameProvider({ children }: { children: ReactNode }) {
  // Әр ашылғанда таза күй: таңдаулар, жауаптар, балл — бәрі бастапқы қалпында
  const [state, dispatch] = useReducer(reducer, initialState, (s) => ({ ...s, screen: screenFromHash(window.location.hash) }));
  useEffect(() => clearLegacyStorage(storage()), []);
  const value = useMemo(() => ({ state, dispatch, total: totalScore(state) }), [state]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}

/** Экранның ішкі күйін оқу/жазу (reset кезінде орталықтан тазаланады). */
export function useScreenState<T>(screen: number, fallback: T): [T, (v: T) => void] {
  const { state, dispatch } = useGame();
  const value = (state.screenState[screen] as T | undefined) ?? fallback;
  return [value, (v: T) => dispatch({ type: 'setScreenState', screen, value: v })];
}

/**
 * Автоматты балл: шарт орындалғанда критерийге балл береді (бір рет, тек өседі).
 * Мұғалім Teacher Mode-та бәрібір өзгерте алады.
 */
export function useAutoScore(task: TaskId, criterion: string, value: number) {
  const { dispatch } = useGame();
  useEffect(() => {
    if (value > 0) dispatch({ type: 'awardScore', task, criterion, value });
  }, [dispatch, task, criterion, value]);
}
