import { motion } from 'framer-motion';
import { Asset } from '../components/Asset';
import { IntroCard } from '../components/IntroCard';
import { NavBar } from '../components/NavBar';
import { lesson } from '../content/lesson';

const spring = { type: 'spring', stiffness: 220, damping: 18 } as const;

/** SCREEN 7 — Бурабай. Бурабай фоны, Word-тағы мұғалім сөзі және 5 жаңа сөз (аудармасымен). */
export function Burabay() {
  return (
    <div className="absolute inset-0">
      <Asset id="bg.burabay" fit="cover" className="absolute inset-0 h-full w-full" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(0deg, rgba(26,159,196,.6) 0%, rgba(26,159,196,.08) 50%, rgba(139,232,242,.2) 100%)' }}
      />

      <IntroCard title={lesson.routeStops[1]} lines={lesson.burabay.lines} className="left-[88px] top-[150px] w-[1300px]" />

      <div className="absolute left-[420px] top-[640px] w-[1440px]">
        <p className="mb-4 inline-block rounded-full bg-white/90 px-6 py-2 text-[30px] font-extrabold text-sea shadow-card">
          {lesson.burabay.newWordsLabel}
        </p>
        <div className="flex gap-5">
          {lesson.burabay.newWords.map((w, i) => (
            <motion.div
              key={w.kk}
              data-testid={`word-${w.kk}`}
              className="card flex h-[190px] flex-1 flex-col items-center justify-center gap-2"
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.4 + i * 0.1 }}
              whileHover={{ y: -6 }}
            >
              <span className="text-[52px] font-black leading-none text-ink">{w.kk}</span>
              <span className="text-[30px] font-bold text-ink-soft">{w.ru}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div
        className="absolute bottom-0 left-[20px] h-[640px]"
        initial={{ opacity: 0, x: -80 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ ...spring, delay: 0.3 }}
      >
        <Asset id="boy.pointing" className="h-full drop-shadow-[0_20px_20px_rgba(18,53,91,.3)]" />
      </motion.div>

      <NavBar />
    </div>
  );
}
