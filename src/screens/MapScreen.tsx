import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { Asset } from '../components/Asset';
import { NavBar } from '../components/NavBar';
import { lesson } from '../content/lesson';
import { useScreenState } from '../game/GameProvider';

const SCREEN = 3;

/** Карта asset-інің өлшемі (2006CD51) — барлық координаттар осы жүйеде */
const MAP_W = 1536;
const MAP_H = 1024;
/** Сахнадағы карта: 0.93 масштаб, ортада, жоғарғы жолақтың астында */
const SCALE = 0.93;
const BOX = { x: (1920 - MAP_W * SCALE) / 2, y: 128, w: MAP_W * SCALE, h: MAP_H * SCALE };

/** Суреттегі дайын белгілердің (pin) орны: head — дөңгелек басы, label — атау орны */
const STOPS = [
  { name: lesson.routeStops[0], head: { x: 638, y: 200 }, color: '#2F80ED', label: { x: 560, y: 22 } },
  { name: lesson.routeStops[1], head: { x: 1022, y: 186 }, color: '#34C56A', label: { x: 1022, y: 50 } },
  { name: lesson.routeStops[2], head: { x: 1225, y: 552 }, color: '#FF5A6A', label: { x: 1395, y: 420 } },
] as const;

/** Суреттегі пунктир жолдың үстінен сызылатын маршрут бөліктері */
const SEGMENTS = ['M 640 282 C 760 300, 900 322, 1020 268', 'M 1022 268 C 1070 360, 1095 470, 1222 630'];

interface MapState {
  /** Нешінші аялдамаға дейін көрсетілді (0–3) */
  reached: number;
}

const spring = { type: 'spring', stiffness: 240, damping: 18 } as const;

/**
 * SCREEN 3 — Қазақстан картасы.
 * Word: «Біздің бағытымыз: Астана – Бурабай – Алматы. Картадан осы үш бағытты көрсетейік.»
 * Оқушы картадан үш аялдаманы ретімен басады; әр қадамда маршрут сызылады. Балл жоқ.
 */
export function MapScreen() {
  const [data, setData] = useScreenState<MapState>(SCREEN, { reached: 0 });
  const done = data.reached >= STOPS.length;

  return (
    <div className="absolute inset-0">
      <motion.div
        className="absolute overflow-hidden rounded-[48px] border-4 border-white/80 shadow-lift"
        style={{ left: BOX.x, top: BOX.y, width: BOX.w, height: BOX.h }}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Asset id="map.kazakhstan" fit="cover" className="absolute inset-0 h-full w-full" />

        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="absolute inset-0 h-full w-full" aria-hidden>
          {SEGMENTS.map((d, i) => (
            <g key={d}>
              <motion.path
                d={d}
                fill="none"
                stroke="#FFC93C"
                strokeWidth={22}
                strokeLinecap="round"
                opacity={0.55}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: data.reached > i + 1 ? 1 : 0 }}
                transition={{ duration: 1.1, ease: 'easeInOut' }}
              />
              <motion.path
                d={d}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={9}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: data.reached > i + 1 ? 1 : 0 }}
                transition={{ duration: 1.1, ease: 'easeInOut' }}
              />
            </g>
          ))}
        </svg>

        {STOPS.map((stop, i) => (
          <Stop
            key={stop.name}
            index={i}
            reached={data.reached > i}
            next={data.reached === i}
            onTap={() => {
              if (data.reached === i) setData({ reached: i + 1 });
            }}
          />
        ))}
      </motion.div>

      {/* Кейіпкер: картаны ұстаған бала */}
      <motion.div
        className="absolute bottom-0 left-[6px] h-[640px]"
        initial={{ opacity: 0, x: -80 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ ...spring, delay: 0.3 }}
      >
        <Asset id="boy.map" className="h-full drop-shadow-[0_20px_20px_rgba(18,53,91,.3)]" />
      </motion.div>

      <AnimatePresence>
        {done && (
          <motion.div
            className="pointer-events-none absolute right-[70px] top-[150px] h-[150px] w-[150px]"
            initial={{ scale: 0, rotate: -40 }}
            animate={{ scale: [0, 1.25, 1], rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.7 }}
          >
            <Asset id="ui.star" className="h-full w-full drop-shadow-[0_10px_20px_rgba(224,161,0,.5)]" />
          </motion.div>
        )}
      </AnimatePresence>

      <NavBar
        center={
          <div
            data-testid="route-sentence"
            className="rounded-full bg-white px-10 py-5 text-[36px] font-extrabold text-ink shadow-card"
          >
            {lesson.intro.routeSentence}
          </div>
        }
      />
    </div>
  );
}

/** Картадағы бір аялдама: белгінің үстіндегі басылатын аймақ + атауы */
function Stop({ index, reached, next, onTap }: { index: number; reached: boolean; next: boolean; onTap: () => void }) {
  const stop = STOPS[index];
  const shake = useAnimationControls();
  const pct = (v: number, total: number) => `${(v / total) * 100}%`;
  return (
    <>
      <div
        className="absolute h-[150px] w-[150px] -translate-x-1/2 -translate-y-1/2"
        style={{ left: pct(stop.head.x, MAP_W), top: pct(stop.head.y + 20, MAP_H) }}
      >
      <motion.button
        type="button"
        data-testid={`stop-${index}`}
        data-state={reached ? 'reached' : next ? 'next' : 'locked'}
        aria-label={stop.name}
        animate={shake}
        onClick={() => {
          if (!reached && !next) shake.start({ x: [0, -12, 12, -8, 8, 0], transition: { duration: 0.4 } });
          onTap();
        }}
        className="relative flex h-full w-full items-center justify-center rounded-full"
      >
        {/* Келесі аялдаманы нұсқайтын толқын */}
        {next && (
          <motion.span
            className="absolute inset-4 rounded-full border-[6px]"
            style={{ borderColor: stop.color }}
            animate={{ scale: [0.7, 1.25], opacity: [0.9, 0] }}
            transition={{ duration: 1.3, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        {reached && (
          <motion.span
            className="absolute inset-6 rounded-full"
            style={{ boxShadow: `0 0 0 8px ${stop.color}55, 0 0 40px 10px ${stop.color}88` }}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={spring}
          />
        )}
      </motion.button>
      </div>

      <div
        className="pointer-events-none absolute -translate-x-1/2"
        style={{ left: pct(stop.label.x, MAP_W), top: pct(stop.label.y, MAP_H) }}
      >
      <motion.div
        initial={false}
        animate={reached ? { scale: [0.6, 1.15, 1], opacity: 1 } : { scale: 1, opacity: 0.92 }}
        transition={{ duration: 0.5 }}
      >
        <span
          data-testid={`stop-label-${index}`}
          className={`flex items-center gap-3 whitespace-nowrap rounded-full px-6 py-3 text-[38px] font-black shadow-card ${
            reached ? 'text-white' : 'bg-white text-ink'
          }`}
          style={reached ? { background: stop.color } : undefined}
        >
          <span className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-white text-[26px] font-black" style={{ color: stop.color }}>
            {index + 1}
          </span>
          {stop.name}
        </span>
      </motion.div>
      </div>
    </>
  );
}
