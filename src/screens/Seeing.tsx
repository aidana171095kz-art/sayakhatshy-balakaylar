import { AnimatePresence, motion } from 'framer-motion';
import { Asset } from '../components/Asset';
import { NavBar } from '../components/NavBar';
import { lesson } from '../content/lesson';
import { useGame, useScreenState } from '../game/GameProvider';

const SCREEN = 8;

type Obj = (typeof lesson.seeing.objects)[number];

/** Бурабай суретіндегі нысандардың орны (суреттің % координаттары, bg.burabay W57) */
const SPOTS: Record<Obj, { x: number; y: number; r: number }> = {
  көл: { x: 52, y: 64, r: 13 },
  тау: { x: 67, y: 18, r: 11 },
  орман: { x: 31, y: 40, r: 10 },
};

interface SeeingState {
  /** Суреттен табылған нысандар */
  found: Obj[];
  /** «Мен ___ көріп тұрмын.» сөйлемдері құралған нысандар */
  sentences: Obj[];
  current?: Obj;
}

const spring = { type: 'spring', stiffness: 260, damping: 20 } as const;

/**
 * SCREEN 8 — Не көріп тұрсың? Бурабай суретінен көлді, тауды, орманды басып табу,
 * одан кейін «Мен ___ көріп тұрмын.» сөйлемін құрау. Балл мұғалім арқылы (2).
 */
export function Seeing() {
  const { state } = useGame();
  const [data, setData] = useScreenState<SeeingState>(SCREEN, { found: [], sentences: [] });
  const revealed = !!state.revealed[SCREEN];

  const find = (o: Obj) => {
    if (!data.found.includes(o)) setData({ ...data, found: [...data.found, o] });
  };
  const build = (o: Obj) =>
    setData({ ...data, current: o, sentences: data.sentences.includes(o) ? data.sentences : [...data.sentences, o] });

  return (
    <div className="absolute inset-0 bg-journey">
      <motion.p className="absolute left-[88px] top-[150px] text-[40px] font-extrabold text-ink" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {lesson.seeing.task}
      </motion.p>

      {/* Сурет: нысандарды басу */}
      <motion.div
        className="absolute left-[88px] top-[225px] h-[700px] w-[1050px] overflow-hidden rounded-[40px] border-4 border-white shadow-lift"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Asset id="bg.burabay" fit="cover" className="absolute inset-0 h-full w-full" />
        {lesson.seeing.objects.map((o) => {
          const spot = SPOTS[o];
          const found = data.found.includes(o);
          return (
            <button
              key={o}
              type="button"
              data-testid={`spot-${o}`}
              data-state={found ? 'found' : 'hidden'}
              aria-label={o}
              onClick={() => find(o)}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ left: `${spot.x}%`, top: `${spot.y}%`, width: `${spot.r * 2}%`, aspectRatio: '1' }}
            >
              <AnimatePresence>
                {found && (
                  <motion.span
                    className="absolute inset-0 flex items-center justify-center rounded-full border-[6px] border-sun bg-white/15"
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={spring}
                  >
                    <span className="rounded-full bg-sun px-5 py-2 text-[36px] font-black text-sun-ink shadow-card">{o}</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </motion.div>

      {/* Оң жақ: табылған нысандар + сөйлем */}
      <div className="card absolute left-[1180px] top-[225px] flex h-[700px] w-[680px] flex-col gap-6 p-8">
        <div className="flex min-h-[96px] flex-wrap gap-4" data-testid="found">
          <AnimatePresence>
            {data.found.map((o) => (
              <motion.button
                key={o}
                type="button"
                data-testid={`found-${o}`}
                layout
                initial={{ opacity: 0, scale: 0.4, y: -30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.4 }}
                transition={spring}
                onClick={() => build(o)}
                className={`btn3d text-[40px] ${data.current === o ? 'btn-sea' : 'btn-white'}`}
              >
                {o}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        <div className="rounded-[28px] bg-sky-100/70 p-6">
          <p className="whitespace-nowrap text-[38px] font-extrabold leading-tight text-ink" data-testid="sentence">
            {lesson.seeing.sentenceStart}{' '}
            <span
              className={`inline-flex min-w-[150px] items-center justify-center rounded-chip px-4 align-middle ${
                data.current ? 'bg-sea text-white' : 'h-[64px] border-4 border-dashed border-sky-300 bg-white/70'
              }`}
            >
              <AnimatePresence mode="wait">
                {data.current && (
                  <motion.span key={data.current} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0, transition: spring }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
                    {data.current}
                  </motion.span>
                )}
              </AnimatePresence>
            </span>{' '}
            {lesson.seeing.sentenceEnd}
          </p>
        </div>

        <ul className="space-y-2 text-[30px] font-bold text-ink" data-testid="sentences">
          {data.sentences.map((o) => (
            <motion.li key={o} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-sea" />
              {`${lesson.seeing.sentenceStart} ${o} ${lesson.seeing.sentenceEnd}`}
            </motion.li>
          ))}
        </ul>
      </div>

      <motion.div
        className="pointer-events-none absolute bottom-0 right-[40px] h-[380px]"
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.4 }}
      >
        <Asset id="girl.pointing" className="h-full drop-shadow-[0_20px_20px_rgba(18,53,91,.3)]" />
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
                className="rounded-full border-4 border-sun bg-white px-8 py-4 text-[26px] font-bold text-ink shadow-card"
              >
                {lesson.seeing.example}
              </motion.div>
            )}
          </AnimatePresence>
        }
      />
    </div>
  );
}
