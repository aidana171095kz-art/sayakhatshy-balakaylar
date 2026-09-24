import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { useState } from 'react';
import { Asset } from '../components/Asset';
import { NavBar } from '../components/NavBar';
import { useStageDrag, type StageRect } from '../components/useStageDrag';
import { BAG_NOT_NEEDED } from '../content/decisions';
import { lesson } from '../content/lesson';
import type { AssetId } from '../assets/manifest';
import { useGame, useScreenState } from '../game/GameProvider';

const SCREEN = 2;

type Word = (typeof lesson.bag.words)[number];

/** Word-тағы 8 сөз → нақты asset */
const ITEM_ASSET: Record<Word, AssetId> = {
  карта: 'item.map',
  кітап: 'item.book',
  билет: 'item.ticket',
  доп: 'item.ball',
  қалам: 'item.pencil',
  төлқұжат: 'item.passport',
  балмұздақ: 'item.icecream',
  су: 'item.water',
};

interface BagState {
  /** Оқушы сөмкеге салған заттар */
  bag: Word[];
  /** «Мен саяхатқа ___ аламын.» сөйлемдері құралған заттар */
  sentences: Word[];
  /** Қазір сөйлем жолында тұрған зат */
  current?: Word;
  /** Оқушы таңдаған, бірақ саяхатқа қажет емес заттар (қызылмен белгіленеді) */
  wrong?: Word[];
}

const EMPTY: BagState = { bag: [], sentences: [] };

const spring = { type: 'spring', stiffness: 260, damping: 22 } as const;

const isNeeded = (w: Word) => !(BAG_NOT_NEEDED as readonly string[]).includes(w);

/** Рюкзактың ашық аузы — ұшып келген зат осында түседі (сахна координаттары) */
const BAG_MOUTH = { x: 530, y: 300 };
const FLIGHT_S = 0.6;

interface Flight {
  key: number;
  word: Word;
  from: StageRect;
}

/**
 * SCREEN 2 — Саяхатшының сөмкесі.
 * Қажетті зат рюкзакқа ұшып түседі; қажет емес зат (доп, балмұздақ — автор шешімі,
 * content/decisions.ts) қызылмен белгіленіп, шайқалады және сөмкеге түспейді.
 * Балл мұғалім арқылы қойылады (Teacher Mode).
 */
export function Bag() {
  const { state } = useGame();
  const [data, setData] = useScreenState<BagState>(SCREEN, EMPTY);
  const [over, setOver] = useState<string | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const bagShake = useAnimationControls();
  const revealed = !!state.revealed[SCREEN];
  const wrong = data.wrong ?? [];

  /** 'ok' — сөмкеге салынды; 'wrong' — қажет емес зат; 'skip' — бұрыннан сөмкеде */
  const putInBag = (w: Word, from: StageRect): 'ok' | 'wrong' | 'skip' => {
    if (!isNeeded(w)) {
      if (!wrong.includes(w)) setData({ ...data, wrong: [...wrong, w] });
      return 'wrong';
    }
    if (data.bag.includes(w)) return 'skip';
    setData({ ...data, bag: [...data.bag, w] });
    setFlights((f) => [...f, { key: Date.now() + Math.random(), word: w, from }]);
    return 'ok';
  };
  const land = (key: number) => {
    setFlights((f) => f.filter((x) => x.key !== key));
    bagShake.start({ rotate: [0, -4, 4, -2, 0], scale: [1, 1.06, 1], transition: { duration: 0.5 } });
  };
  const takeOut = (w: Word) =>
    setData({
      ...data,
      bag: data.bag.filter((x) => x !== w),
      sentences: data.sentences.filter((x) => x !== w),
      current: data.current === w ? undefined : data.current,
    });
  const buildSentence = (w: Word) => {
    if (!data.bag.includes(w)) return;
    setData({ ...data, current: w, sentences: data.sentences.includes(w) ? data.sentences : [...data.sentences, w] });
  };
  const clearSlot = () => setData({ ...data, current: undefined });

  return (
    <div className="absolute inset-0">
      {/* Сол жақ: қыз + ашық рюкзак (drop нысанасы) + сөмкедегі заттар */}
      <motion.div
        className="absolute left-[8px] top-[330px] h-[590px]"
        initial={{ opacity: 0, x: -80 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ ...spring, delay: 0.15 }}
      >
        <Asset id="girl.openBag" className="h-full drop-shadow-[0_20px_20px_rgba(18,53,91,.25)]" />
      </motion.div>

      <div
        data-drop="bag"
        data-testid="bag-drop"
        className={`absolute left-[270px] top-[150px] flex h-[520px] w-[520px] items-center justify-center rounded-full transition-colors duration-150 ${
          over === 'bag' ? 'bg-white/45 ring-8 ring-sun' : ''
        }`}
      >
        <motion.div animate={bagShake} className="pointer-events-none h-[470px] w-[470px]">
          <Asset id="prop.backpack" className="h-full w-full drop-shadow-[0_26px_26px_rgba(18,53,91,.3)]" />
        </motion.div>
      </div>

      <div
        className={`absolute left-[250px] top-[680px] flex h-[240px] w-[560px] flex-col rounded-card px-5 py-4 transition-colors ${
          data.bag.length ? 'card' : 'border-4 border-dashed border-white/80 bg-white/30'
        }`}
      >
        <div className="flex flex-1 flex-wrap content-start items-start gap-3" data-testid="bag-contents">
          <AnimatePresence>
            {data.bag.map((w) => (
              <BagChip key={w} word={w} landing={flights.some((f) => f.word === w)} used={data.sentences.includes(w)} onUse={() => buildSentence(w)} onRemove={() => takeOut(w)} onOver={setOver} />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Оң жақ: тапсырма, 8 зат, сөйлем құрастыру */}
      <motion.p
        className="absolute left-[860px] top-[150px] w-[1000px] text-[36px] font-extrabold leading-tight text-ink"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {lesson.bag.task}
      </motion.p>

      <div className="absolute left-[860px] top-[260px] grid w-[1000px] grid-cols-4 gap-6">
        {lesson.bag.words.map((w, i) => (
          <ItemCard
            key={w}
            word={w}
            index={i}
            inBag={data.bag.includes(w)}
            wrong={wrong.includes(w)}
            onPut={(from) => putInBag(w, from)}
            onRemove={() => takeOut(w)}
            onOver={setOver}
          />
        ))}
      </div>

      <div className="card absolute left-[860px] top-[730px] h-[190px] w-[1000px] px-8 py-5">
        <div className="flex items-center gap-4 text-[44px] font-extrabold text-ink" data-testid="sentence">
          <span>{lesson.bag.sentenceStart}</span>
          <button
            type="button"
            data-drop="slot"
            data-testid="sentence-slot"
            onClick={clearSlot}
            disabled={!data.current}
            className={`inline-flex h-[76px] min-w-[240px] items-center justify-center gap-2 rounded-chip px-4 transition-colors ${
              data.current
                ? 'bg-sea pl-2 text-white shadow-card'
                : over === 'slot'
                  ? 'border-4 border-dashed border-sun bg-sun/20'
                  : 'border-4 border-dashed border-sky-300 bg-sky-100/60'
            }`}
          >
            {/* mode="wait": ескі сөз толық кеткен соң ғана жаңасы келеді — жолда екі сөз қатар тұрмайды */}
            <AnimatePresence mode="wait">
              {data.current && (
                <motion.span
                  key={data.current}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, y: -30, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: spring }}
                  exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.12 } }}
                >
                  <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-white">
                    <Asset id={ITEM_ASSET[data.current]} className="pointer-events-none h-[48px] w-[48px]" />
                  </span>
                  {data.current}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <span>{lesson.bag.sentenceEnd}</span>
        </div>
        {/* Құралған сөйлемдер: басқанда сол сөйлем қайта көрсетіледі */}
        <div className="mt-3 flex gap-3" data-testid="sentences">
          <AnimatePresence>
            {data.sentences.map((w) => (
              <motion.button
                key={w}
                type="button"
                data-testid={`sentence-${w}`}
                aria-label={`${lesson.bag.sentenceStart} ${w} ${lesson.bag.sentenceEnd}`}
                layout
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.4 }}
                transition={spring}
                onClick={() => setData({ ...data, current: w })}
                className={`flex h-[64px] w-[64px] items-center justify-center rounded-full shadow-card ${
                  data.current === w ? 'bg-sea ring-4 ring-sea/30' : 'bg-sky-100'
                }`}
              >
                <Asset id={ITEM_ASSET[w]} className="pointer-events-none h-[48px] w-[48px]" />
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Сөмкеге ұшып бара жатқан заттар */}
      {flights.map((f) => (
        <motion.div
          key={f.key}
          data-testid="flight"
          className="pointer-events-none absolute z-[70]"
          style={{ left: f.from.x, top: f.from.y, width: f.from.w, height: f.from.h }}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          animate={{
            x: [0, (BAG_MOUTH.x - f.from.x - f.from.w / 2) * 0.55, BAG_MOUTH.x - f.from.x - f.from.w / 2],
            y: [0, BAG_MOUTH.y - f.from.y - f.from.h / 2 - 160, BAG_MOUTH.y - f.from.y - f.from.h / 2],
            scale: [1, 0.8, 0.25],
            rotate: [0, -12, 8],
            opacity: [1, 1, 0.2],
          }}
          transition={{ duration: FLIGHT_S, ease: 'easeInOut', times: [0, 0.5, 1] }}
          onAnimationComplete={() => land(f.key)}
        >
          <Asset id={ITEM_ASSET[f.word]} className="h-full w-full p-4 drop-shadow-[0_16px_16px_rgba(18,53,91,.3)]" />
        </motion.div>
      ))}

      <NavBar
        center={
          <AnimatePresence>
            {revealed && (
              <motion.div
                data-testid="example"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="rounded-full border-4 border-sun bg-white px-8 py-4 text-[28px] font-bold text-ink shadow-card"
              >
                {lesson.bag.example}
              </motion.div>
            )}
          </AnimatePresence>
        }
      />
    </div>
  );
}

/**
 * 8 заттың бірі. Басу немесе рюкзакқа сүйреу → қажетті зат сөмкеге ұшады,
 * қажет емес зат қызыл болып шайқалады. Сөмкедегі затты қайта басу → алып шығу.
 */
function ItemCard({
  word,
  index,
  inBag,
  wrong,
  onPut,
  onRemove,
  onOver,
}: {
  word: Word;
  index: number;
  inBag: boolean;
  wrong: boolean;
  onPut: (from: StageRect) => 'ok' | 'wrong' | 'skip';
  onRemove: () => void;
  onOver: (id: string | null) => void;
}) {
  const shake = useAnimationControls();
  const put = (from: StageRect) => {
    if (onPut(from) === 'wrong') shake.start({ x: [0, -16, 16, -12, 12, -6, 0], transition: { duration: 0.45 } });
  };
  const { handlers, style, dragging } = useStageDrag({
    onTap: (from) => (inBag ? onRemove() : put(from)),
    onDrop: (t, from) => {
      if (t === 'bag') put(from);
    },
    onOver,
    noDrag: inBag,
  });
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.2 + index * 0.05 }}
    >
      <motion.button
        type="button"
        data-testid={`item-${word}`}
        data-state={inBag ? 'in-bag' : wrong ? 'wrong' : 'idle'}
        aria-pressed={inBag}
        animate={shake}
        whileHover={inBag || dragging ? undefined : { y: -6 }}
        {...handlers}
        style={{ touchAction: 'none', ...style }}
        className={`card relative flex h-[215px] w-full flex-col items-center justify-between px-3 pb-3 pt-4 ${
          inBag ? 'border-ok/60 bg-[#E6F8EC]' : wrong ? 'border-no bg-[#FFE4E7] ring-4 ring-no/40' : 'cursor-grab'
        }`}
      >
        <Asset id={ITEM_ASSET[word]} className={`pointer-events-none h-[128px] w-[180px] ${inBag ? 'opacity-35' : ''}`} />
        <span className={`text-[34px] font-extrabold leading-none ${wrong ? 'text-no-shade' : 'text-ink'}`}>{word}</span>
        {(inBag || wrong) && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={spring}
            className={`absolute right-3 top-3 flex h-[48px] w-[48px] items-center justify-center rounded-full text-white shadow-card ${
              inBag ? 'bg-ok' : 'bg-no'
            }`}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
              {inBag ? (
                <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" />
              )}
            </svg>
          </motion.span>
        )}
      </motion.button>
    </motion.div>
  );
}

/** Сөмкедегі зат: басу немесе сөйлем орнына сүйреу → сөйлем құру; × → сөмкеден алу */
function BagChip({
  word,
  landing,
  used,
  onUse,
  onRemove,
  onOver,
}: {
  word: Word;
  landing: boolean;
  used: boolean;
  onUse: () => void;
  onRemove: () => void;
  onOver: (id: string | null) => void;
}) {
  const { handlers, style } = useStageDrag({
    onTap: () => onUse(),
    onDrop: (t) => {
      if (t === 'slot') onUse();
    },
    onOver,
  });
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.4, y: -60 }}
      animate={landing ? { opacity: 0, scale: 0.4, y: -60 } : { opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.4 }}
      transition={spring}
      className="relative"
    >
      <button
        type="button"
        data-testid={`bag-${word}`}
        {...handlers}
        style={{ touchAction: 'none', ...style }}
        className={`flex h-[62px] cursor-grab items-center gap-2 rounded-full pl-2 pr-4 text-[26px] font-extrabold shadow-card ${
          used ? 'bg-sky-100 text-ink' : 'bg-white text-ink ring-2 ring-sea/30'
        }`}
      >
        <Asset id={ITEM_ASSET[word]} className="pointer-events-none h-[46px] w-[46px]" />
        {word}
      </button>
      <button
        type="button"
        aria-label={`${word} — сөмкеден алу`}
        onClick={onRemove}
        className="absolute -right-2 -top-2 flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white text-ink-soft shadow-card hover:bg-no hover:text-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" />
        </svg>
      </button>
    </motion.div>
  );
}
