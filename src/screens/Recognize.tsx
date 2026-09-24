import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { AssetId } from '../assets/manifest';
import { Asset } from '../components/Asset';
import { CityBackdrop } from '../components/CityBackdrop';
import { CheckMark } from '../components/Marks';
import { NavBar } from '../components/NavBar';
import { useStageDrag } from '../components/useStageDrag';
import { lesson } from '../content/lesson';
import { useGame, useScreenState } from '../game/GameProvider';

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

  // Reset кезінде таңдау да тазаланады
  useEffect(() => {
    if (data.matched.length === 0) setSelected(null);
  }, [data.matched.length]);

  const tryMatch = (name: Name, pic: Name) => {
    if (data.matched.includes(pic)) return;
    if (name === pic) {
      setData({ matched: [...data.matched, pic] });
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

      <div className="absolute left-[420px] top-[225px] flex gap-8">
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

      <div className="absolute left-[420px] top-[640px] flex h-[96px] w-[1440px] items-center justify-center gap-8" data-testid="names">
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

      <section className="card absolute left-[420px] top-[760px] w-[1440px] px-10 py-5" data-testid="questions">
        <ol className="flex justify-between gap-6 text-[34px] font-extrabold text-ink">
          {lesson.recognize.questions.map((q, i) => (
            <li key={q} className="flex items-center gap-3">
              <span className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full bg-sky-100 text-[26px] font-black text-sea">
                {i + 1}
              </span>
              {q}
            </li>
          ))}
        </ol>
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
        className={`card flex h-[400px] w-[450px] flex-col items-center justify-between px-6 pb-5 pt-4 transition-colors ${
          matched ? 'border-ok bg-[#E6F8EC]' : wrong ? 'border-no bg-[#FFE4E7] ring-4 ring-no/40' : highlight ? 'ring-4 ring-sun' : ''
        }`}
      >
        <Asset id={picture.asset} className="pointer-events-none h-[270px] w-full" />
        <div
          className={`flex h-[84px] w-full items-center justify-center rounded-chip text-[40px] font-black ${
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
