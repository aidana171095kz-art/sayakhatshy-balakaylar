import { motion } from 'framer-motion';
import { Asset } from '../components/Asset';
import { CityBackdrop } from '../components/CityBackdrop';
import { CheckMark, CrossMark } from '../components/Marks';
import { NavBar } from '../components/NavBar';
import { lesson } from '../content/lesson';
import { useScreenState } from '../game/GameProvider';

const SCREEN = 12;

interface TFState {
  /** Әр мәлімдемеге оқушы жауабы: true — Дұрыс, false — Бұрыс */
  answers: (boolean | null)[];
  /** «Тексеру» басылды — жауаптар бекітілді (бір рет қана) */
  checked: boolean;
}

const spring = { type: 'spring', stiffness: 260, damping: 20 } as const;

/**
 * SCREEN 12 — Дұрыс па, бұрыс па? Word-тағы 5 мәлімдеме мен жауаптары.
 * «Тексеру» бір рет басылады, әр жолға түсті белгі шығады. Балл тек мұғалім арқылы (0/1/2).
 */
export function TrueFalse() {
  const [data, setData] = useScreenState<TFState>(SCREEN, { answers: lesson.trueFalse.statements.map(() => null), checked: false });
  const allAnswered = data.answers.every((a) => a !== null);

  const answer = (i: number, v: boolean) => {
    if (data.checked) return;
    setData({ ...data, answers: data.answers.map((a, j) => (j === i ? v : a)) });
  };

  return (
    <div className="absolute inset-0">
      <CityBackdrop id="bg.almaty" />

      <div className="absolute left-[380px] top-[150px] flex w-[1480px] flex-col gap-4">
        {lesson.trueFalse.statements.map((s, i) => {
          const a = data.answers[i];
          const ok = data.checked && a === s.answer;
          const bad = data.checked && a !== s.answer;
          return (
            <motion.div
              key={s.text}
              data-testid={`tf-row-${i}`}
              data-state={ok ? 'correct' : bad ? 'wrong' : a === null ? 'empty' : 'answered'}
              className={`card flex h-[138px] items-center gap-6 px-7 ${ok ? 'border-ok bg-[#E6F8EC]' : bad ? 'border-no bg-[#FFE4E7]' : ''}`}
              initial={{ opacity: 0, x: 60 }}
              animate={bad ? { opacity: 1, x: [0, -14, 14, -8, 8, 0] } : { opacity: 1, x: 0 }}
              transition={bad ? { duration: 0.45 } : { ...spring, delay: 0.1 + i * 0.08 }}
            >
              <span className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full bg-sea text-[34px] font-black text-white">{i + 1}</span>
              <p className="flex-1 text-[40px] font-extrabold text-ink">{s.text}</p>
              {[true, false].map((v) => {
                const chosen = a === v;
                return (
                  <button
                    key={String(v)}
                    type="button"
                    data-testid={`tf-${i}-${v ? 'true' : 'false'}`}
                    aria-pressed={chosen}
                    aria-disabled={data.checked}
                    onClick={() => answer(i, v)}
                    className={`btn3d min-h-[84px] w-[200px] px-4 text-[34px] ${
                      chosen ? (v ? 'bg-ok text-white shadow-[0_8px_0_#23994F]' : 'bg-no text-white shadow-[0_8px_0_#D94A5A]') : 'btn-white'
                    } ${data.checked ? 'pointer-events-none' : ''} ${data.checked && !chosen ? 'opacity-40' : ''}`}
                  >
                    {v ? lesson.trueFalse.trueLabel : lesson.trueFalse.falseLabel}
                  </button>
                );
              })}
              <span className="flex h-[56px] w-[56px] shrink-0 items-center justify-center">
                {ok && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-ok text-white">
                    <CheckMark size={32} />
                  </motion.span>
                )}
                {bad && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-no text-white">
                    <CrossMark size={32} />
                  </motion.span>
                )}
              </span>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        className="absolute bottom-0 left-[10px] h-[640px]"
        initial={{ opacity: 0, x: -80 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ ...spring, delay: 0.3 }}
      >
        <Asset id="girl.presenting" className="h-full drop-shadow-[0_20px_20px_rgba(18,53,91,.3)]" />
      </motion.div>

      <NavBar
        center={
          data.checked ? null : (
            <button type="button" data-testid="check" className="btn3d btn-sea" disabled={!allAnswered} onClick={() => setData({ ...data, checked: true })}>
              Тексеру
            </button>
          )
        }
      />
    </div>
  );
}
