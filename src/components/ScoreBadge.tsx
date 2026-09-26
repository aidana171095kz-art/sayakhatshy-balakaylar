import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useGame } from '../game/GameProvider';
import { MAX_TOTAL } from '../game/tasks';
import { Asset } from './Asset';

/** Жоғарғы оң жақтағы жалпы балл: орталық state-тен ғана оқиды. Балл өскенде «+N» ұшады. */
export function ScoreBadge() {
  const { total } = useGame();
  const prev = useRef(total);
  const [gain, setGain] = useState<{ n: number; key: number } | null>(null);
  const controls = useAnimationControls();
  useEffect(() => {
    if (total > prev.current) {
      setGain({ n: total - prev.current, key: Date.now() });
      controls.start({ scale: [1, 1.3, 1], rotate: [0, -14, 0], transition: { duration: 0.6 } });
    }
    prev.current = total;
  }, [total, controls]);
  useEffect(() => {
    if (!gain) return;
    const t = setTimeout(() => setGain(null), 1400);
    return () => clearTimeout(t);
  }, [gain]);
  return (
    <div className="relative flex h-[88px] items-center gap-3 rounded-full bg-white/90 pl-3 pr-8 shadow-card" data-testid="score" data-total={total}>
      <motion.div animate={controls}>
        <Asset id="ui.star" className="h-[68px] w-[68px]" />
      </motion.div>
      <span className="text-h2 font-black tabular-nums text-ink">
        {total}
        <span className="text-body font-extrabold text-ink-soft"> / {MAX_TOTAL}</span>
      </span>
      <AnimatePresence>
        {gain && (
          <motion.span
            key={gain.key}
            data-testid="score-gain"
            className="pointer-events-none absolute -bottom-2 left-4 rounded-full bg-ok px-4 py-1 text-[34px] font-black text-white shadow-card"
            initial={{ opacity: 0, y: 10, scale: 0.6 }}
            animate={{ opacity: 1, y: 56, scale: 1 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          >
            +{gain.n}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
