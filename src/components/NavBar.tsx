import type { ReactNode } from 'react';
import { useGame } from '../game/GameProvider';
import { SCREEN_COUNT } from '../game/state';
import { ChevronLeft, ChevronRight } from './Icons';

/** Төменгі басқару: «Артқа» • экранның өз батырмасы (мысалы «Тексеру») • «Келесі» */
export function NavBar({ center }: { center?: ReactNode }) {
  const { state, dispatch } = useGame();
  const go = (n: number) => dispatch({ type: 'go', screen: n });
  return (
    <div className="absolute inset-x-16 bottom-10 z-20 flex items-end justify-between">
      <button
        type="button"
        aria-label="Артқа"
        className="btn3d btn-white h-[88px] w-[88px] px-0"
        onClick={() => go(state.screen - 1)}
        disabled={state.screen <= 1}
      >
        <ChevronLeft size={44} />
      </button>
      <div className="flex gap-6">{center}</div>
      {state.screen < SCREEN_COUNT ? (
        <button type="button" className="btn3d btn-sun" onClick={() => go(state.screen + 1)}>
          Келесі <ChevronRight />
        </button>
      ) : (
        <span className="w-[88px]" />
      )}
    </div>
  );
}
