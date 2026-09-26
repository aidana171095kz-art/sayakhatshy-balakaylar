import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Asset } from '../components/Asset';
import { CityBackdrop } from '../components/CityBackdrop';
import { NavBar } from '../components/NavBar';
import { lesson } from '../content/lesson';
import { useGame, useScreenState } from '../game/GameProvider';

const SCREEN = 13;

const spring = { type: 'spring', stiffness: 260, damping: 20 } as const;

/**
 * SCREEN 13 — Саяхатшының әңгімесі. Тірек сөздер және 3 сөйлем жолы.
 * Тірек сөзді басқанда белсенді жолға қосылады. Үлгі тек Teacher Mode арқылы. Балл жоқ.
 */
export function Story() {
  const { state } = useGame();
  const [data, setData] = useScreenState<{ lines: string[] }>(SCREEN, { lines: ['', '', ''] });
  const [active, setActive] = useState(0);
  const revealed = !!state.revealed[SCREEN];

  const setLine = (i: number, v: string) => setData({ lines: data.lines.map((l, j) => (j === i ? v : l)) });
  const addWord = (w: string) => {
    const cur = data.lines[active];
    setLine(active, cur ? `${cur.replace(/\s+$/, '')} ${w}` : w);
  };

  return (
    <div className="absolute inset-0">
      <CityBackdrop id="bg.almaty" />

      <motion.p className="absolute left-[420px] top-[150px] text-[40px] font-extrabold text-ink" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {lesson.story.task}
      </motion.p>

      <div className="card absolute left-[420px] top-[230px] flex w-[1440px] items-center gap-5 px-8 py-5" data-testid="support">
        <span className="text-[30px] font-extrabold text-ink-soft">{lesson.story.supportLabel}:</span>
        {lesson.story.support.map((w, i) => (
          <motion.button
            key={w}
            type="button"
            data-testid={`support-${w}`}
            className="btn3d btn-sun min-h-[76px] px-8 text-[38px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.2 + i * 0.06 }}
            onClick={() => addWord(w)}
          >
            {w}
          </motion.button>
        ))}
      </div>

      <div className="absolute left-[420px] top-[400px] flex w-[1440px] flex-col gap-5">
        {data.lines.map((line, i) => (
          <label key={i} className={`card flex h-[136px] items-center gap-6 px-7 ${active === i ? 'ring-4 ring-sea/40' : ''}`}>
            <span className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full bg-sea text-[34px] font-black text-white">{i + 1}</span>
            <input
              data-testid={`line-${i}`}
              value={line}
              onFocus={() => setActive(i)}
              onChange={(e) => setLine(i, e.target.value)}
              spellCheck={false}
              className="h-full flex-1 bg-transparent text-[44px] font-extrabold text-ink outline-none placeholder:text-sky-300"
            />
            {line && (
              <button type="button" aria-label="Өшіру" onClick={() => setLine(i, '')} className="h-[52px] w-[52px] rounded-full bg-sky-100 text-[28px] font-black text-ink-soft hover:bg-no hover:text-white">
                ×
              </button>
            )}
          </label>
        ))}
      </div>

      <motion.div
        className="absolute bottom-0 left-[10px] h-[680px]"
        initial={{ opacity: 0, x: -80 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ ...spring, delay: 0.3 }}
      >
        <Asset id="girl.map" className="h-full drop-shadow-[0_20px_20px_rgba(18,53,91,.3)]" />
      </motion.div>

      <NavBar
        center={
          <AnimatePresence>
            {revealed && (
              <motion.div
                data-testid="example"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="rounded-full border-4 border-sun bg-white px-8 py-4 text-[28px] font-bold text-ink shadow-card"
              >
                {lesson.story.example}
              </motion.div>
            )}
          </AnimatePresence>
        }
      />
    </div>
  );
}
