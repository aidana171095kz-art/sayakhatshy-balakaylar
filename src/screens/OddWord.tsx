import { motion, useAnimationControls } from 'framer-motion';
import { Asset } from '../components/Asset';
import { CityBackdrop } from '../components/CityBackdrop';
import { CheckMark, CrossMark } from '../components/Marks';
import { NavBar } from '../components/NavBar';
import { ODD_WORD_ANSWERS } from '../content/decisions';
import { lesson } from '../content/lesson';
import { useScreenState } from '../game/GameProvider';

const SCREEN = 9;

interface OddState {
  /** Әр жолда оқушы таңдаған сөз */
  picked: (string | null)[];
}

const spring = { type: 'spring', stiffness: 260, damping: 20 } as const;

/**
 * SCREEN 9 — Артық сөзді тап. Word-тағы 3 сөз тобы, әр жолда бір сөзді таңдау.
 * Word-та жауап кілті жоқ: ODD_WORD_ANSWERS (decisions.ts) бос болса, таңдау тек белгіленеді,
 * бағаны мұғалім қояды (1 балл). Автор кілтті растаса — дұрыс/қате белгісі қосылады.
 */
export function OddWord() {
  const [data, setData] = useScreenState<OddState>(SCREEN, { picked: lesson.oddWord.groups.map(() => null) });
  const pick = (row: number, w: string) => setData({ picked: data.picked.map((p, i) => (i === row ? (p === w ? null : w) : p)) });

  return (
    <div className="absolute inset-0">
      <CityBackdrop id="bg.burabay" />

      <div className="absolute left-[400px] top-[170px] flex w-[1460px] flex-col gap-8">
        {lesson.oddWord.groups.map((group, row) => (
          <motion.div
            key={row}
            className="card flex h-[200px] items-center gap-8 px-8"
            data-testid={`odd-row-${row}`}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...spring, delay: 0.15 + row * 0.12 }}
          >
            <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-sea text-[38px] font-black text-white">{row + 1}</span>
            <div className="grid flex-1 grid-cols-4 gap-6">
              {group.map((w) => (
                <WordCard key={w} word={w} row={row} picked={data.picked[row] === w} onPick={() => pick(row, w)} />
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="absolute bottom-0 left-[20px] h-[700px]"
        initial={{ opacity: 0, x: -80 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ ...spring, delay: 0.3 }}
      >
        <Asset id="boy.thinking" className="h-full drop-shadow-[0_20px_20px_rgba(18,53,91,.3)]" />
      </motion.div>

      <NavBar />
    </div>
  );
}

function WordCard({ word, row, picked, onPick }: { word: string; row: number; picked: boolean; onPick: () => void }) {
  const shake = useAnimationControls();
  const key = ODD_WORD_ANSWERS?.[row];
  const verdict = picked && key ? (key === word ? 'correct' : 'wrong') : null;
  return (
    <motion.button
      type="button"
      data-testid={`odd-${row}-${word}`}
      data-state={verdict ?? (picked ? 'picked' : 'idle')}
      animate={shake}
      whileHover={{ y: -6 }}
      onClick={() => {
        onPick();
        if (key && key !== word && !picked) shake.start({ x: [0, -14, 14, -8, 8, 0], transition: { duration: 0.4 } });
      }}
      className={`relative flex h-[130px] items-center justify-center rounded-[28px] text-[46px] font-black shadow-card transition-colors ${
        verdict === 'correct'
          ? 'bg-ok text-white'
          : verdict === 'wrong'
            ? 'bg-no text-white'
            : picked
              ? 'bg-sea text-white ring-8 ring-sea/25'
              : 'bg-sky-100 text-ink hover:bg-sky-200'
      }`}
    >
      {word}
      {verdict && (
        <span className="absolute right-3 top-3 flex h-[40px] w-[40px] items-center justify-center rounded-full bg-white/30">
          {verdict === 'correct' ? <CheckMark size={26} /> : <CrossMark size={26} />}
        </span>
      )}
    </motion.button>
  );
}
