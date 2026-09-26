import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { Fragment, useEffect, useState } from 'react';
import { Asset } from '../components/Asset';
import { CityBackdrop } from '../components/CityBackdrop';
import { CheckMark } from '../components/Marks';
import { NavBar } from '../components/NavBar';
import { useStageDrag } from '../components/useStageDrag';
import { lesson } from '../content/lesson';
import { useGame, useScreenState } from '../game/GameProvider';

const SCREEN = 6;

type Part = { kind: 'slot'; word: string } | { kind: 'punct'; text: string };

/**
 * Word-тағы дұрыс нұсқадан сөйлем қалыбын құрады:
 * «Астана — әдемі қала.» → [слот Астана] [—] [слот әдемі] [слот қала] [.]
 * Сызықша мен нүкте қалыпта тұрақты тұрады — бос орын/тыныс белгі қатесі болмайды.
 */
export function sentenceTemplate(answer: string): Part[] {
  const body = answer.replace(/\.$/, '');
  const parts: Part[] = body.split(' ').map((t) => (t === '—' ? { kind: 'punct', text: t } : { kind: 'slot', word: t }));
  parts.push({ kind: 'punct', text: '.' });
  return parts;
}

const ROWS = lesson.scrambled.groups.map((group, i) => ({
  group: group as readonly string[],
  answer: lesson.scrambled.answers[i],
  parts: sentenceTemplate(lesson.scrambled.answers[i]),
}));

interface Row {
  /** Әр слотқа қойылған сөз */
  slots: (string | null)[];
  correct: boolean;
}

interface ScrambledState {
  rows: Row[];
}

const emptyState = (): ScrambledState => ({
  rows: ROWS.map((r) => ({ slots: r.parts.filter((p) => p.kind === 'slot').map(() => null), correct: false })),
});

const spring = { type: 'spring', stiffness: 260, damping: 22 } as const;

/**
 * SCREEN 6 — Адасқан сөздер. Әр жолда 3 сөзді дұрыс ретке қою (басу немесе сүйреу),
 * «Тексеру» — дұрыс жол жасыл болып бекітіледі, қате жол қызыл болып шайқалады да,
 * сөздер қайтады. Word-та бұл тапсырмаға балл жоқ. Дұрыс нұсқа тек Teacher Mode арқылы.
 */
export function Scrambled() {
  const { state } = useGame();
  const [data, setData] = useScreenState<ScrambledState>(SCREEN, emptyState());
  const [wrongRows, setWrongRows] = useState<{ rows: number[]; n: number }>({ rows: [], n: 0 });
  const [over, setOver] = useState<string | null>(null);
  const revealed = !!state.revealed[SCREEN];

  const setRow = (i: number, row: Row) => setData({ rows: data.rows.map((r, j) => (j === i ? row : r)) });

  /** Сөзді жолдың бірінші бос слотына (немесе көрсетілген слотқа) қою */
  const place = (rowIdx: number, word: string, slotIdx?: number) => {
    const row = data.rows[rowIdx];
    if (row.correct) return;
    const slots = row.slots.map((w) => (w === word ? null : w)); // бір сөз екі жерде тұрмайды
    const target = slotIdx ?? slots.findIndex((w) => w === null);
    if (target < 0) return;
    slots[target] = word;
    setRow(rowIdx, { ...row, slots });
  };
  const unplace = (rowIdx: number, slotIdx: number) => {
    const row = data.rows[rowIdx];
    if (row.correct) return;
    setRow(rowIdx, { ...row, slots: row.slots.map((w, j) => (j === slotIdx ? null : w)) });
  };

  const readyRows = data.rows.map((_, i) => i).filter((i) => !data.rows[i].correct && data.rows[i].slots.every(Boolean));

  const check = () => {
    const wrong: number[] = [];
    const rows = data.rows.map((row, i) => {
      if (row.correct || !row.slots.every(Boolean)) return row;
      const expected = ROWS[i].parts.flatMap((p) => (p.kind === 'slot' ? [p.word] : []));
      const ok = row.slots.every((w, j) => w === expected[j]);
      if (!ok) wrong.push(i);
      return ok ? { ...row, correct: true } : row;
    });
    setData({ rows });
    if (wrong.length) setWrongRows({ rows: wrong, n: Date.now() });
  };

  // Қате жолдың сөздері шайқалғаннан кейін қайта орнына оралады
  useEffect(() => {
    if (!wrongRows.rows.length) return;
    const t = setTimeout(() => {
      setData({
        rows: data.rows.map((r, i) => (wrongRows.rows.includes(i) ? { ...r, slots: r.slots.map(() => null) } : r)),
      });
      setWrongRows({ rows: [], n: 0 });
    }, 1000);
    return () => clearTimeout(t);
  }, [wrongRows.n]);

  const allDone = data.rows.every((r) => r.correct);

  return (
    <div className="absolute inset-0">
      <CityBackdrop id="bg.astana" />

      <motion.p
        className="absolute left-[380px] top-[150px] text-[40px] font-extrabold text-ink"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {lesson.scrambled.task}
      </motion.p>

      <div className="absolute left-[380px] top-[228px] flex w-[1480px] flex-col gap-6">
        {ROWS.map((r, i) => (
          <SentenceRow
            key={r.answer}
            index={i}
            def={r}
            row={data.rows[i]}
            wrongKey={wrongRows.rows.includes(i) ? wrongRows.n : 0}
            revealed={revealed}
            over={over}
            onPlace={(w, slot) => place(i, w, slot)}
            onUnplace={(slot) => unplace(i, slot)}
            onOver={setOver}
          />
        ))}
      </div>

      <motion.div
        className="absolute bottom-0 left-[10px] h-[680px]"
        initial={{ opacity: 0, x: -80 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ ...spring, delay: 0.3 }}
      >
        <Asset id="girl.thinking" className="h-full drop-shadow-[0_20px_20px_rgba(18,53,91,.3)]" />
      </motion.div>

      <NavBar
        center={
          allDone ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} transition={{ duration: 0.6 }} className="h-[96px] w-[96px]" data-testid="all-done">
              <Asset id="ui.star" className="h-full w-full" />
            </motion.div>
          ) : (
            <button type="button" data-testid="check" className="btn3d btn-sea" disabled={readyRows.length === 0} onClick={check}>
              Тексеру
            </button>
          )
        }
      />
    </div>
  );
}

function SentenceRow({
  index,
  def,
  row,
  wrongKey,
  revealed,
  over,
  onPlace,
  onUnplace,
  onOver,
}: {
  index: number;
  def: (typeof ROWS)[number];
  row: Row;
  wrongKey: number;
  revealed: boolean;
  over: string | null;
  onPlace: (word: string, slot?: number) => void;
  onUnplace: (slot: number) => void;
  onOver: (id: string | null) => void;
}) {
  const shake = useAnimationControls();
  const wrong = wrongKey > 0;
  useEffect(() => {
    if (wrongKey) shake.start({ x: [0, -16, 16, -12, 12, -6, 0], transition: { duration: 0.45 } });
  }, [wrongKey, shake]);

  let slotIdx = -1;
  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...spring, delay: 0.15 + index * 0.12 }}
    >
      <motion.div
        animate={shake}
        data-testid={`row-${index}`}
        data-state={row.correct ? 'correct' : wrong ? 'wrong' : 'idle'}
        className={`card flex h-[180px] items-center gap-6 px-6 transition-colors ${
          row.correct ? 'border-ok bg-[#E6F8EC]' : wrong ? 'border-no bg-[#FFE4E7] ring-4 ring-no/40' : ''
        }`}
      >
        <span
          className={`flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full text-[34px] font-black text-white ${
            row.correct ? 'bg-ok' : 'bg-sea'
          }`}
        >
          {row.correct ? <CheckMark size={36} /> : index + 1}
        </span>

        {/* Сөздер (Word-тағы ретімен) */}
        <div className="flex shrink-0 gap-3" data-testid={`bank-${index}`}>
          <AnimatePresence initial={false}>
            {def.group
              .filter((w) => !row.slots.includes(w))
              .map((w) => (
                <motion.div key={w} layout initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.12 } }} transition={spring}>
                  <WordChip word={w} rowIndex={index} locked={row.correct} onTap={() => onPlace(w)} onDrop={(slot) => onPlace(w, slot)} onOver={onOver} />
                </motion.div>
              ))}
          </AnimatePresence>
        </div>

        {/* Сөйлем қалыбы */}
        <div className="ml-auto flex flex-col items-end gap-1">
          {/* Кәдімгі мәтін ағыны: бөліктер арасында нақты бос орын, нүктенің алдында бос орын жоқ */}
          <div className="whitespace-nowrap text-[40px] font-extrabold leading-[80px] text-ink" data-testid={`sentence-${index}`}>
            {def.parts.map((p, j) => {
              const sep = j > 0 && !(p.kind === 'punct' && p.text === '.') ? ' ' : '';
              if (p.kind === 'punct')
                return (
                  <Fragment key={`p${j}`}>
                    {sep}
                    <span>{p.text}</span>
                  </Fragment>
                );
              slotIdx += 1;
              const s = slotIdx;
              const w = row.slots[s];
              const dropId = `slot-${index}-${s}`;
              return (
                <Fragment key={`s${s}`}>
                {sep}
                <button
                  type="button"
                  data-drop={row.correct ? undefined : dropId}
                  data-testid={dropId}
                  onClick={() => w && onUnplace(s)}
                  className={`inline-flex h-[72px] min-w-[150px] items-center justify-center rounded-chip px-4 align-middle transition-colors ${
                    w
                      ? row.correct
                        ? 'bg-ok text-white'
                        : wrong
                          ? 'bg-no text-white'
                          : 'bg-sea text-white shadow-card'
                      : over === dropId
                        ? 'border-4 border-dashed border-sun bg-sun/20'
                        : 'border-4 border-dashed border-sky-300 bg-sky-100/60'
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {w && (
                      <motion.span key={w} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: spring }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
                        {w}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
                </Fragment>
              );
            })}
          </div>
          {revealed && !row.correct && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-full bg-sun/25 px-4 py-1 text-[26px] font-bold text-sun-ink" data-testid={`example-${index}`}>
              {def.answer}
            </motion.p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function WordChip({
  word,
  rowIndex,
  locked,
  onTap,
  onDrop,
  onOver,
}: {
  word: string;
  rowIndex: number;
  locked: boolean;
  onTap: () => void;
  onDrop: (slot: number) => void;
  onOver: (id: string | null) => void;
}) {
  const { handlers, style } = useStageDrag({
    onTap,
    onDrop: (t) => {
      const m = t.match(/^slot-(\d+)-(\d+)$/);
      if (m && Number(m[1]) === rowIndex) onDrop(Number(m[2]));
    },
    onOver,
    disabled: locked,
  });
  return (
    <button
      type="button"
      data-testid={`word-${rowIndex}-${word}`}
      disabled={locked}
      {...handlers}
      style={{ touchAction: 'none', ...style }}
      className={`btn3d min-h-[76px] px-6 text-[34px] ${locked ? 'btn-white opacity-30' : 'btn-white cursor-grab'}`}
    >
      {word}
    </button>
  );
}
