import { motion, useAnimationControls } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useGame } from '../game/GameProvider';
import { MAX_TOTAL } from '../game/tasks';
import { Asset } from './Asset';

/** Жоғарғы оң жақтағы жалпы балл: орталық state-тен ғана оқиды. */
export function ScoreBadge() {
  const { total } = useGame();
  const prev = useRef(total);
  const controls = useAnimationControls();
  useEffect(() => {
    if (total > prev.current) controls.start({ scale: [1, 1.25, 1], rotate: [0, -12, 0], transition: { duration: 0.6 } });
    prev.current = total;
  }, [total, controls]);
  return (
    <div className="flex h-[88px] items-center gap-3 rounded-full bg-white/90 pl-3 pr-8 shadow-card" data-testid="score">
      <motion.div animate={controls}>
        <Asset id="ui.star" className="h-[68px] w-[68px]" />
      </motion.div>
      <span className="text-h2 font-black tabular-nums text-ink">
        {total}
        <span className="text-body font-extrabold text-ink-soft"> / {MAX_TOTAL}</span>
      </span>
    </div>
  );
}
