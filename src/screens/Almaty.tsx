import { motion } from 'framer-motion';
import type { AssetId } from '../assets/manifest';
import { Asset } from '../components/Asset';
import { CityBackdrop } from '../components/CityBackdrop';
import { IntroCard } from '../components/IntroCard';
import { NavBar } from '../components/NavBar';
import { lesson } from '../content/lesson';

const spring = { type: 'spring', stiffness: 200, damping: 18 } as const;

/** Word: «Экраннан Медеу, Көктөбе және тау көріністері көрсетіледі.» */
const PLACES: { name: (typeof lesson.almaty.places)[number]; asset: AssetId; wide?: boolean }[] = [
  { name: 'Медеу', asset: 'landmark.medeu' },
  { name: 'Көктөбе', asset: 'landmark.koktobe' },
  { name: 'тау', asset: 'scene.almaty-mountains', wide: true },
];

/** SCREEN 11 — Алматы. Алматы фоны, Медеу, Көктөбе, тау көрінісі және кейіпкер. */
export function Almaty() {
  return (
    <div className="absolute inset-0">
      <CityBackdrop id="bg.almaty" />

      <IntroCard title={lesson.routeStops[2]} lines={lesson.almaty.lines} className="left-[88px] top-[150px] w-[1560px]" />

      <div className="absolute left-[470px] top-[470px] flex gap-7">
        {PLACES.map((p, i) => (
          <motion.div
            key={p.name}
            data-testid={`place-${p.name}`}
            className={`glass flex h-[420px] flex-col items-center justify-end gap-4 px-6 pb-6 pt-4 ${p.wide ? 'w-[540px]' : 'w-[390px]'}`}
            initial={{ opacity: 0, y: 120 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.45 + i * 0.18 }}
            whileHover={{ y: -8 }}
          >
            {p.wide ? (
              <div className="flex h-[280px] w-full items-center overflow-hidden rounded-[24px]">
                <Asset id={p.asset} fit="cover" className="h-full w-full" />
              </div>
            ) : (
              <Asset id={p.asset} className="pointer-events-none h-[280px] w-full" />
            )}
            <span className="rounded-full bg-sea px-8 py-3 text-[40px] font-black leading-none text-white shadow-card">{p.name}</span>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="absolute bottom-0 left-[20px] h-[620px]"
        initial={{ opacity: 0, x: -80 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ ...spring, delay: 0.3 }}
      >
        <Asset id="boy.presenting" className="h-full drop-shadow-[0_20px_20px_rgba(18,53,91,.3)]" />
      </motion.div>

      <NavBar />
    </div>
  );
}
