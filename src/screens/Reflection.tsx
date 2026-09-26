import { motion } from 'framer-motion';
import { Asset } from '../components/Asset';
import { CityBackdrop } from '../components/CityBackdrop';
import { NavBar } from '../components/NavBar';
import { lesson } from '../content/lesson';
import { useScreenState } from '../game/GameProvider';

const SCREEN = 15;

/**
 * 1-сөйлемге («Маған ___ ұнады.») дайын таңдаулар — сабақтағы бағыттар мен орындар (Word-тан).
 * 2 және 3-сөйлемге дайын таңдау берілмейді: олар септік жалғауын қажет етеді
 * (мысалы, «Алматыны көргім келеді»), қате грамматика ұсынбау үшін оқушы өзі жазады.
 */
const CHOICES_FIRST = [...lesson.routeStops, ...lesson.astana.landmarks, 'Медеу', 'Көктөбе'] as const;

const spring = { type: 'spring', stiffness: 240, damping: 20 } as const;

/** SCREEN 15 — Менің саяхатым (рефлексия). Word-тағы 3 сөйлемді аяқтау. Балл жоқ. */
export function Reflection() {
  const [data, setData] = useScreenState<{ answers: string[] }>(SCREEN, { answers: ['', '', ''] });
  const set = (i: number, v: string) => setData({ answers: data.answers.map((a, j) => (j === i ? v : a)) });

  return (
    <div className="absolute inset-0">
      <CityBackdrop id="bg.burabay-meadow" />

      <motion.p className="absolute left-[420px] top-[150px] text-[40px] font-extrabold text-ink" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {lesson.reflection.task}
      </motion.p>

      <div className="absolute left-[420px] top-[230px] flex w-[1440px] flex-col gap-6">
        {lesson.reflection.sentences.map((s, i) => (
          <motion.div
            key={i}
            className="card px-8 py-6"
            data-testid={`reflection-${i}`}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...spring, delay: 0.1 + i * 0.1 }}
          >
            <div className="flex items-center gap-4 text-[48px] font-extrabold text-ink">
              <span className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full bg-sea text-[34px] font-black text-white">{i + 1}</span>
              <span>{s.before}</span>
              <input
                data-testid={`reflection-input-${i}`}
                value={data.answers[i]}
                onChange={(e) => set(i, e.target.value)}
                spellCheck={false}
                className="h-[84px] min-w-0 flex-1 rounded-chip border-4 border-dashed border-sky-300 bg-sky-100/60 px-5 text-[44px] font-extrabold text-sea outline-none focus:border-sea focus:bg-white"
              />
              <span>{s.after}</span>
            </div>
            {i === 0 && (
              <div className="mt-4 flex flex-wrap gap-3 pl-[80px]">
                {CHOICES_FIRST.map((c) => (
                  <button
                    key={c}
                    type="button"
                    data-testid={`choice-${c}`}
                    onClick={() => set(0, c)}
                    className={`rounded-full px-6 py-2 text-[30px] font-extrabold shadow-card ${data.answers[0] === c ? 'bg-sea text-white' : 'bg-white text-ink hover:bg-sky-100'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <motion.div className="absolute bottom-0 left-[10px] h-[680px]" initial={{ opacity: 0, x: -80 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.3 }}>
        <Asset id="girl.thinking" className="h-full drop-shadow-[0_20px_20px_rgba(18,53,91,.3)]" />
      </motion.div>

      <NavBar />
    </div>
  );
}
