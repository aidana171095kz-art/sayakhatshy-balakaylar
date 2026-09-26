import { motion, type TargetAndTransition } from 'framer-motion';
import type { AssetId } from '../assets/manifest';
import { Asset } from '../components/Asset';
import { CityBackdrop } from '../components/CityBackdrop';
import { NavBar } from '../components/NavBar';
import { lesson } from '../content/lesson';
import { useScreenState } from '../game/GameProvider';

const SCREEN = 10;

type MoveKey = (typeof lesson.movement.moves)[number]['key'];

/**
 * Әр қимылдың бейнесі. Бар кейіпкер позалары қолданылады; жүзу мен ұшуға жеке поза
 * берілмегендіктен, қимыл анимациямен көрсетіледі (жаңа кейіпкер салынбайды).
 */
const MOVES: Record<MoveKey, { asset: AssetId; loop: TargetAndTransition }> = {
  // тау → қолды жоғары көтеру: қолын көтерген бала, жоғары-төмен созылу
  mountain: { asset: 'boy.cheer', loop: { y: [0, -30, 0], transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' } } },
  // көл → жүзу: көл толқындай тербеледі
  lake: { asset: 'landmark.lake', loop: { rotate: [-5, 5, -5], x: [-14, 14, -14], transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } } },
  // орман → жүру: жүріп бара жатқан қыз, адым ырғағы
  forest: { asset: 'girl.walking', loop: { y: [0, -14, 0, -14, 0], rotate: [0, 2, 0, -2, 0], transition: { duration: 1.2, repeat: Infinity } } },
  // құстар → ұшу: қолын көтерген қыз, ұшқандай көтеріліп-түседі
  birds: { asset: 'girl.cheer', loop: { y: [0, -50, -20, -60, 0], rotate: [0, -6, 4, -4, 0], transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } } },
};

const spring = { type: 'spring', stiffness: 220, damping: 18 } as const;

/** SCREEN 10 — Қимылмен саяхат (сергіту сәті). Карточканы басқанда қимыл анимациясы басталады. Балл жоқ. */
export function Movement() {
  const [data, setData] = useScreenState<{ active: MoveKey | null }>(SCREEN, { active: null });

  return (
    <div className="absolute inset-0">
      <CityBackdrop id="bg.burabay" />

      <div className="absolute left-[64px] top-[150px] flex w-[1792px] gap-6">
        {lesson.movement.moves.map((m, i) => {
          const active = data.active === m.key;
          const dim = data.active !== null && !active;
          return (
            <motion.button
              key={m.key}
              type="button"
              data-testid={`move-${m.key}`}
              data-state={active ? 'active' : 'idle'}
              onClick={() => setData({ active: active ? null : m.key })}
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: dim ? 0.55 : 1, y: 0, scale: active ? 1.04 : 1 }}
              transition={{ ...spring, delay: data.active === null ? 0.15 + i * 0.1 : 0 }}
              className={`card flex h-[760px] flex-1 flex-col items-center justify-between overflow-hidden px-6 pb-8 pt-6 ${active ? 'ring-8 ring-sun' : ''}`}
            >
              <div className="flex h-[520px] w-full items-end justify-center">
                <motion.div className="h-full w-full" animate={active ? MOVES[m.key].loop : { y: 0, x: 0, rotate: 0 }}>
                  <Asset id={MOVES[m.key].asset} className="pointer-events-none h-full w-full" />
                </motion.div>
              </div>
              <p className="text-center text-[34px] font-extrabold leading-tight text-ink">{m.text}</p>
            </motion.button>
          );
        })}
      </div>

      <NavBar />
    </div>
  );
}
