import { motion } from 'framer-motion';
import { Asset } from '../components/Asset';
import { ChevronRight } from '../components/Icons';
import { lesson } from '../content/lesson';
import { useGame } from '../game/GameProvider';

// Маршрут нүктелерінің түстері карта asset-індегі (2006CD51) белгілерге сәйкес
const STOP_COLORS = ['#2F80ED', '#34C56A', '#FF5A6A'];

const spring = { type: 'spring', stiffness: 170, damping: 18 } as const;

/** SCREEN 1 — WELCOME: Астана фоны (Бәйтерек фонның өзінде), екі кейіпкер, атауы, «Саяхатты бастау». */
export function Welcome() {
  const { dispatch } = useGame();
  return (
    <div className="absolute inset-0">
      {/* Фон: Астана (ортасында — Бәйтерек, Ақорда, Хан Шатыр) */}
      <Asset id="bg.astana" fit="cover" className="absolute inset-0 h-full w-full" />
      {/* Мәтін оқылуы үшін сол жақ пен төменгі жақта жұмсақ көгілдір тұман */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(139,232,242,.55) 0%, rgba(139,232,242,.15) 42%, transparent 60%), linear-gradient(0deg, rgba(26,159,196,.35) 0%, transparent 28%)',
        }}
      />

      {/* Атау карточкасы */}
      <motion.section
        initial={{ opacity: 0, x: -60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ ...spring, delay: 0.1 }}
        className="glass absolute left-[88px] top-[96px] w-[900px] px-16 pb-14 pt-12"
      >
        <span className="inline-block rounded-full bg-sky-100 px-6 py-2 text-caption font-extrabold text-sea">
          {lesson.meta}
        </span>

        <h1
          className="mt-6 text-hero font-black tracking-tight text-sea"
          style={{ textShadow: '0 6px 0 #BFF1F8, 0 14px 28px rgba(18,53,91,.18)' }}
        >
          {lesson.title.split(' ').map((w) => (
            <span key={w} className="block">
              {w}
            </span>
          ))}
        </h1>

        <p className="mt-6 text-[38px] font-bold leading-tight text-ink">{lesson.subtitle}</p>

        <div className="mt-8 flex items-center gap-4 rounded-[28px] bg-sky-100/80 px-6 py-4">
          <span className="text-caption font-extrabold text-ink-soft">{lesson.routeLabel}:</span>
          <span className="sr-only">{lesson.route}</span>
          <div className="flex items-center gap-3" aria-hidden>
            {lesson.routeStops.map((stop, i) => (
              <motion.div
                key={stop}
                className="flex items-center gap-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.5 + i * 0.15 }}
              >
                {i > 0 && <span className="text-body font-black text-ink-soft">–</span>}
                <span className="flex items-center gap-2 rounded-full bg-white px-5 py-2 text-body font-extrabold shadow-card">
                  <span className="h-4 w-4 rounded-full" style={{ background: STOP_COLORS[i] }} />
                  {stop}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.button
          type="button"
          data-testid="start"
          className="btn3d btn-sun mt-10 min-h-[112px] px-16 text-[44px]"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...spring, delay: 0.9 }}
          whileHover={{ scale: 1.04 }}
          onClick={() => dispatch({ type: 'go', screen: 2 })}
        >
          Саяхатты бастау <ChevronRight size={52} />
        </motion.button>
      </motion.section>

      {/* Кейіпкерлер: бала Бәйтеректі нұсқайды, қыз саяхатқа шақырады */}
      <motion.div
        className="absolute bottom-[-12px] left-[930px] h-[760px]"
        initial={{ opacity: 0, y: 120 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.35 }}
      >
        <Asset id="boy.pointing" className="h-full drop-shadow-[0_24px_24px_rgba(18,53,91,.28)]" />
      </motion.div>
      <motion.div
        className="absolute bottom-[-12px] right-[110px] h-[730px]"
        initial={{ opacity: 0, y: 120 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.5 }}
      >
        <Asset id="girl.walking" className="h-full drop-shadow-[0_24px_24px_rgba(18,53,91,.28)]" />
      </motion.div>
    </div>
  );
}
