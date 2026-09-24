import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { NavBar } from './components/NavBar';
import { Stage } from './components/Stage';
import { TopBar } from './components/TopBar';
import { GameProvider, useGame } from './game/GameProvider';
import { SCREEN_COUNT } from './game/state';
import { SCREENS } from './screens/registry';
import { NotBuilt } from './screens/NotBuilt';
import { TeacherPanel } from './teacher/TeacherPanel';

function isTyping(el: EventTarget | null) {
  return el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

function Game() {
  const { state, dispatch } = useGame();
  const [teacher, setTeacher] = useState(false);
  const taps = useRef<number[]>([]);
  const screen = SCREENS[state.screen - 1];
  const Screen = screen.component ?? NotBuilt;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (e.shiftKey && e.code === 'KeyT') setTeacher((v) => !v);
      // Презентация пульті: PageDown/PageUp және көрсеткілер
      if (['PageDown', 'ArrowRight'].includes(e.key)) dispatch({ type: 'go', screen: Math.min(SCREEN_COUNT, state.screen + 1) });
      if (['PageUp', 'ArrowLeft'].includes(e.key)) dispatch({ type: 'go', screen: Math.max(1, state.screen - 1) });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, state.screen]);

  const tapTrigger = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 900), now];
    if (taps.current.length >= 3) {
      taps.current = [];
      setTeacher(true);
    }
  };

  return (
    <Stage>
      <AnimatePresence mode="wait">
        <motion.div
          key={state.screen}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Screen />
          {state.screen > 1 && (
            <>
              <TopBar screen={screen} />
              {!screen.component && <NavBar />}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Мұғалім режимінің дискретті белгісі: 3 рет басу */}
      <button
        type="button"
        aria-label="Мұғалім режимі"
        data-testid="teacher-trigger"
        onClick={tapTrigger}
        className="absolute right-0 top-0 z-40 h-[36px] w-[36px] rounded-bl-[20px] bg-white/10 hover:bg-white/30"
      />
      <TeacherPanel open={teacher} onClose={() => setTeacher(false)} />
    </Stage>
  );
}

export default function App() {
  return (
    <GameProvider>
      <Game />
    </GameProvider>
  );
}
