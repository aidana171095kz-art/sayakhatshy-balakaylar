import { motion, useAnimationControls } from 'framer-motion';
import type { AssetId } from '../assets/manifest';
import { Asset } from '../components/Asset';
import { NavBar } from '../components/NavBar';
import { lesson } from '../content/lesson';

const spring = { type: 'spring', stiffness: 200, damping: 18 } as const;

/** Word-тағы үш көрікті орын → нақты asset. Экранда реті: Ақорда • Бәйтерек (ортада) • Хан Шатыр */
const LANDMARKS: { name: (typeof lesson.astana.landmarks)[number]; asset: AssetId; tall?: boolean }[] = [
  { name: 'Ақорда', asset: 'landmark.akorda' },
  { name: 'Бәйтерек', asset: 'landmark.baiterek', tall: true },
  { name: 'Хан Шатыр', asset: 'landmark.khanShatyr' },
];

/**
 * SCREEN 4 — Астана. Астана фоны, Бәйтерек, Ақорда, Хан Шатыр және кейіпкер.
 * Экрандағы мәтін — Word-тағы мұғалім сөзінен; толық сөзі Teacher Mode-та.
 */
export function Astana() {
  return (
    <div className="absolute inset-0">
      <Asset id="bg.astana" fit="cover" className="absolute inset-0 h-full w-full" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(0deg, rgba(26,159,196,.55) 0%, rgba(26,159,196,.1) 45%, rgba(139,232,242,.25) 100%)' }}
      />

      <motion.section
        className="glass absolute left-[88px] top-[150px] flex w-[1340px] items-center gap-10 px-12 py-8"
        initial={{ opacity: 0, x: -60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ ...spring, delay: 0.1 }}
      >
        <h1 className="text-[104px] font-black leading-none tracking-tight text-sea" style={{ textShadow: '0 6px 0 #BFF1F8' }}>
          {lesson.routeStops[0]}
        </h1>
        <div>
          <p className="text-[36px] font-bold leading-snug text-ink">{lesson.astana.intro}</p>
          <p className="mt-2 text-[36px] font-bold leading-snug text-ink">{lesson.astana.lead}</p>
        </div>
      </motion.section>

      <div className="absolute left-[520px] top-[430px] flex gap-8">
        {LANDMARKS.map((l, i) => (
          <LandmarkCard key={l.name} {...l} index={i} />
        ))}
      </div>

      <motion.div
        className="absolute bottom-0 left-[10px] h-[600px]"
        initial={{ opacity: 0, x: -80 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ ...spring, delay: 0.35 }}
      >
        <Asset id="girl.pointing" className="h-full drop-shadow-[0_20px_20px_rgba(18,53,91,.3)]" />
      </motion.div>

      <NavBar />
    </div>
  );
}

function LandmarkCard({ name, asset, tall, index }: { name: string; asset: AssetId; tall?: boolean; index: number }) {
  const pop = useAnimationControls();
  return (
    <motion.div
      initial={{ opacity: 0, y: 120 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.45 + index * 0.18 }}
    >
      <motion.button
        type="button"
        data-testid={`landmark-${name}`}
        animate={pop}
        whileHover={{ y: -8 }}
        onClick={() => pop.start({ scale: [1, 1.06, 1], transition: { duration: 0.4 } })}
        className="glass flex h-[420px] w-[400px] flex-col items-center justify-end gap-4 px-6 pb-6 pt-4"
      >
        <Asset id={asset as AssetId} className={`pointer-events-none w-full ${tall ? 'h-[300px]' : 'h-[260px]'}`} />
        <span className="rounded-full bg-sea px-8 py-3 text-[40px] font-black leading-none text-white shadow-card">{name}</span>
      </motion.button>
    </motion.div>
  );
}
