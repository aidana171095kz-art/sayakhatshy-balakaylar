import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { AssetId } from '../assets/manifest';
import { Asset } from '../components/Asset';
import { CityBackdrop } from '../components/CityBackdrop';
import { CheckMark } from '../components/Marks';
import { NavBar } from '../components/NavBar';
import { useStageDrag } from '../components/useStageDrag';
import { lesson } from '../content/lesson';
import { useAutoScore, useGame, useScreenState } from '../game/GameProvider';
import { RECOGNIZE_ANSWERS } from '../content/decisions';

const SCREEN = 5;

type Name = (typeof lesson.astana.landmarks)[number];

/** Суреттер Word ретімен: Бәйтерек, Ақорда, Хан Шатыр */
const PICTURES: { name: Name; asset: AssetId }[] = [
  { name: 'Бәйтерек', asset: 'landmark.baiterek' },
  { name: 'Ақорда', asset: 'landmark.akorda' },
  { name: 'Хан Шатыр', asset: 'landmark.khanShatyr' },
];

/** Атаулар суреттермен бір ретте тұрмауы үшін тұрақты аралас рет (кездейсоқ емес — экран әр ашылғанда бірдей) */
const NAME_ORDER: Name[] = ['Ақорда', 'Хан Шатыр', 'Бәйтерек'];

interface RecognizeState {
  /** Дұрыс сәйкестендірілген суреттер */
  matched: Name[];
  /** 3 сұраққа берілген дұрыс жауаптар (қате жауап сақталмайды — қайта таңдайды) */
  answers?: (string | null)[];
}

const spring = { type: 'spring', stiffness: 240, damping: 20 } as const;

/**
 * SCREEN 5 — Суретті таны. Сурет пен атауды сәйкестендіру: атауды суретке сүйреу,
 * немесе атауды басып, содан кейін суретті басу. Жауап кілті — суреттің өз атауы.
 * Балл мұғалім арқылы (2 критерий). Үлгі жауап тек Teacher Mode арқылы.
 */
export function Recognize() {
  const { state } = useGame();
  const [data, setData] = useScreenState<RecognizeState>(SCREEN, { matched: [] });
  const [selected, setSelected] = useState<Name | null>(null);
  const [wrongAt, setWrongAt] = useState<{ pic: Name; n: number } | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const revealed = !!state.revealed[SCREEN];
  const allDone = data.matched.length === PICTURES.length;
  // Автоматты балл: үш сурет те дұрыс сәйкестендірілді → «көрікті орынды атайды» 1
  useAutoScore('recognize', 'named', allDone ? 1 : 0);
  // Үш сұраққа да дұрыс жауап → «сұраққа толық жауап береді» 1
  const answers = data.answers ?? [null, null, null];
  const [wrongAnswer, setWrongAnswer] = useState<{ q: number; opt: string; n: number } | null>(null);
  useAutoScore('recognize', 'answer', answers.every((a, i) => a === RECOGNIZE_ANSWERS[i].correct) ? 1 : 0);
  useEffect(() => {
    if (!wrongAnswer) return;
    const t = setTimeout(() => setWrongAnswer(null), 900);
    return () => clearTimeout(t);
  }, [wrongAnswer]);
  const choose = (q: number, opt: string) => {
    if (answers[q]) return;
    if (opt === RECOGNIZE_ANSWERS[q].correct) setData({ ...data, answers: answers.map((a, i) => (i === q ? opt : a)) });
    else setWrongAnswer({ q, opt, n: Date.now() });
  };

  // Reset кезінде таңдау да тазаланады
  useEffect(() => {
    if (data.matched.length === 0) setSelected(null);
  }, [data.matched.length]);

  const tryMatch = (name: Name, pic: Name) => {
    if (data.matched.includes(pic)) return;
    if (name === pic) {
      setData({ ...data, matched: [...data.matched, pic] });
      setSelected(null);
    } else {
      setWrongAt({ pic, n: Date.now() });
      setSelected(null);
    }
  };

  return (
    <div className="absolute inset-0">
      <CityBackdrop id="bg.astana" />

      <motion.p
        className="absolute left-[420px] top-[150px] text-[40px] font-extrabold text-ink"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {lesson.recognize.task}
      </motion.p>

      <div className="absolute left-[420px] top-[215px] flex gap-8">
        {PICTURES.map((p, i) => (
          <PictureCard
            key={p.name}
            index={i}
            picture={p}
            matched={data.matched.includes(p.name)}
            wrongKey={wrongAt?.pic === p.name ? wrongAt.n : 0}
            highlight={over === `pic-${p.name}` || (!!selected && !data.matched.includes(p.name))}
            onTap={() => selected && tryMatch(selected, p.name)}
          />
        ))}
      </div>

      <div className="absolute left-[420px] top-[562px] flex h-[96px] w-[1440px] items-center justify-center gap-8" data-testid="names">
        <AnimatePresence>
          {NAME_ORDER.filter((n) => !data.matched.includes(n)).map((n) => (
            <NameChip
              key={n}
              name={n}
              selected={selected === n}
              onSelect={() => setSelected(selected === n ? null : n)}
              onDrop={(pic) => tryMatch(n, pic)}
              onOver={setOver}
            />
          ))}
        </AnimatePresence>
        {allDone && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} transition={{ duration: 0.6 }} className="h-[96px] w-[96px]">
            <Asset id="ui.star" className="h-full w-full" />
          </motion.div>
        )}
      </div>

      <section className="card absolute left-[420px] top-[680px] flex w-[1440px] flex-col gap-3 px-8 py-4" data-testid="questions">
        {lesson.recognize.questions.map((q, i) => (
          <div key={q} className="flex items-center justify-between gap-6" data-testid={`question-${i}`}>
            <p className="flex items-center gap-3 whitespace-nowrap text-[32px] font-extrabold leading-tight text-ink">
              <span className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-sky-100 text-[24px] font-black text-sea">{i + 1}</span>
              {q}
              {i === 0 && <Asset id="landmark.baiterek" className="h-[54px] w-[54px]" />}
            </p>
            <div className="flex shrink-0 gap-3">
              {RECOGNIZE_ANSWERS[i].options.map((opt) => {
                const done = answers[i] === opt;
                const wrong = wrongAnswer?.q === i && wrongAnswer.opt === opt;
                return (
                  <motion.button
                    key={`${opt}-${wrong ? wrongAnswer!.n : 0}`}
                    type="button"
                    data-testid={`answer-${i}-${opt}`}
                    data-state={done ? 'correct' : wrong ? 'wrong' : 'idle'}
                    disabled={!!answers[i] && !done}
                    animate={wrong ? { x: [0, -10, 10, -6, 6, 0] } : undefined}
                    transition={{ duration: 0.4 }}
                    onClick={() => choose(i, opt)}
                    className={`min-w-[150px] rounded-full px-6 py-2 text-[30px] font-extrabold shadow-card transition-colors disabled:opacity-40 ${
                      done ? 'bg-ok text-white' : wrong ? 'bg-no text-white' : 'bg-sky-100 text-ink hover:bg-sky-200'
                    }`}
                  >
                    {opt}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <motion.div
        className="absolute bottom-0 left-[20px] h-[700px]"
        initial={{ opacity: 0, x: -80 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ ...spring, delay: 0.3 }}
      >
        <Asset id="boy.thinking" className="h-full drop-shadow-[0_20px_20px_rgba(18,53,91,.3)]" />
      </motion.div>

      <NavBar
        center={
          <AnimatePresence>
            {revealed && (
              <motion.div
                data-testid="example"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="max-w-[1340px] rounded-full border-4 border-sun bg-white px-8 py-4 text-[26px] font-bold text-ink shadow-card"
              >
                {lesson.recognize.example}
              </motion.div>
            )}
          </AnimatePresence>
        }
      />
    </div>
  );
}

function PictureCard({
  picture,
  index,
  matched,
  wrongKey,
  highlight,
  onTap,
}: {
  picture: { name: Name; asset: AssetId };
  index: number;
  matched: boolean;
  wrongKey: number;
  highlight: boolean;
  onTap: () => void;
}) {
  const shake = useAnimationControls();
  const [wrong, setWrong] = useState(false);
  useEffect(() => {
    if (!wrongKey) return;
    setWrong(true);
    shake.start({ x: [0, -16, 16, -12, 12, -6, 0], transition: { duration: 0.45 } });
    const t = setTimeout(() => setWrong(false), 900);
    return () => clearTimeout(t);
  }, [wrongKey, shake]);

  return (
    <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.15 + index * 0.12 }}>
      <motion.button
        type="button"
        data-drop={matched ? undefined : `pic-${picture.name}`}
        data-testid={`pic-${index}`}
        data-state={matched ? 'matched' : wrong ? 'wrong' : 'idle'}
        animate={shake}
        onClick={onTap}
        className={`card flex h-[330px] w-[450px] flex-col items-center justify-between px-6 pb-4 pt-3 transition-colors ${
          matched ? 'border-ok bg-[#E6F8EC]' : wrong ? 'border-no bg-[#FFE4E7] ring-4 ring-no/40' : highlight ? 'ring-4 ring-sun' : ''
        }`}
      >
        <Asset id={picture.asset} className="pointer-events-none h-[215px] w-full" />
        <div
          className={`flex h-[76px] w-full items-center justify-center rounded-chip text-[38px] font-black ${
            matched ? 'bg-ok text-white' : 'border-4 border-dashed border-sky-300 bg-sky-100/60 text-transparent'
          }`}
        >
          {matched && (
            <motion.span className="flex items-center gap-3" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring}>
              <CheckMark size={36} />
              {picture.name}
            </motion.span>
          )}
        </div>
      </motion.button>
    </motion.div>
  );
}

function NameChip({
  name,
  selected,
  onSelect,
  onDrop,
  onOver,
}: {
  name: Name;
  selected: boolean;
  onSelect: () => void;
  onDrop: (pic: Name) => void;
  onOver: (id: string | null) => void;
}) {
  const { handlers, style } = useStageDrag({
    onTap: onSelect,
    onDrop: (t) => {
      if (t.startsWith('pic-')) onDrop(t.slice(4) as Name);
    },
    onOver,
  });
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: selected ? -8 : 0 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={spring}
    >
      <button
        type="button"
        data-testid={`name-${name}`}
        aria-pressed={selected}
        {...handlers}
        style={{ touchAction: 'none', ...style }}
        className={`btn3d cursor-grab text-[40px] ${selected ? 'btn-sea' : 'btn-white'}`}
      >
        {name}
      </button>
    </motion.div>
  );
}
