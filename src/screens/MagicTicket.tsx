import { AnimatePresence, motion } from 'framer-motion';
import { Asset } from '../components/Asset';
import { CheckMark } from '../components/Marks';
import { NavBar } from '../components/NavBar';
import { lesson } from '../content/lesson';
import { useAutoScore, useScreenState } from '../game/GameProvider';

const SCREEN = 14;

interface TicketState {
  /** Қазір ашық тұрған билет (0–9) */
  open: number | null;
  /** Сұрағына жауап берілген билеттер */
  done: number[];
}

const spring = { type: 'spring', stiffness: 240, damping: 22 } as const;

/**
 * SCREEN 14 — Сиқырлы билет. 10 жабық билет → таңдау → айналып ашылады → Word-тағы сұрақ
 * → «Жауап берді» → билет орындалды деп белгіленеді. Жауаптар ауызша, Word-та жауап кілті жоқ:
 * балл тек мұғалім арқылы, барлығы 1 балл (қанша билет ашылса да).
 */
export function MagicTicket() {
  const [data, setData] = useScreenState<TicketState>(SCREEN, { open: null, done: [] });
  const q = data.open !== null ? lesson.ticket.questions[data.open] : null;
  // Автоматты балл: бір билеттің сұрағына жауап берілді → 1 (бірнеше билет болса да max 1)
  useAutoScore('ticket', 'answered', data.done.length > 0 ? 1 : 0);

  return (
    <div className="absolute inset-0 bg-journey">
      <motion.p className="absolute left-[380px] top-[150px] w-[1180px] text-[36px] font-extrabold leading-tight text-ink" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {lesson.ticket.task}
      </motion.p>

      <div className="absolute left-[380px] top-[270px] grid w-[1180px] grid-cols-5 gap-x-5 gap-y-8">
        {lesson.ticket.questions.map((_, i) => {
          const done = data.done.includes(i);
          return (
            <motion.button
              key={i}
              type="button"
              data-testid={`ticket-${i}`}
              data-state={done ? 'done' : 'closed'}
              className="relative h-[180px]"
              initial={{ opacity: 0, y: 40, rotate: -4 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ ...spring, delay: 0.1 + i * 0.05 }}
              whileHover={{ y: -10, scale: 1.05 }}
              onClick={() => setData({ ...data, open: i })}
            >
              <Asset id="ui.ticket" className={`pointer-events-none h-full w-full drop-shadow-[0_14px_16px_rgba(18,53,91,.28)] ${done ? 'opacity-45 grayscale' : ''}`} />
              <span className="absolute left-[38%] top-1/2 flex h-[84px] w-[84px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[48px] font-black text-sea shadow-card">
                {done ? <span className="text-ok"><CheckMark size={48} /></span> : i + 1}
              </span>
            </motion.button>
          );
        })}
      </div>

      <motion.div className="pointer-events-none absolute bottom-0 left-[20px] h-[680px]" initial={{ opacity: 0, x: -80 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.3 }}>
        <Asset id="boy.ticket" className="h-full drop-shadow-[0_20px_20px_rgba(18,53,91,.3)]" />
      </motion.div>
      <motion.div className="pointer-events-none absolute bottom-0 right-[20px] h-[640px]" initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.4 }}>
        <Asset id="girl.ticket" className="h-full drop-shadow-[0_20px_20px_rgba(18,53,91,.3)]" />
      </motion.div>

      {/* Ашылған билет */}
      <AnimatePresence>
        {data.open !== null && q && (
          <motion.div
            className="absolute inset-0 z-30 flex items-center justify-center bg-ink/45 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            data-testid="ticket-open"
          >
            <div style={{ perspective: 1800 }}>
              <motion.div
                className="relative h-[620px] w-[1120px]"
                style={{ transformStyle: 'preserve-3d' }}
                initial={{ rotateY: 0, scale: 0.4 }}
                animate={{ rotateY: 180, scale: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ rotateY: { duration: 0.8, ease: 'easeInOut', delay: 0.15 }, scale: { ...spring } }}
              >
                {/* Алдыңғы беті: жабық билет */}
                <div className="absolute inset-0 flex items-center justify-center" style={{ backfaceVisibility: 'hidden' }}>
                  <Asset id="ui.ticket" className="h-full w-full" />
                </div>
                {/* Артқы беті: сұрақ */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-10 rounded-[48px] border-[10px] border-paper-gold bg-paper px-16 shadow-lift"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <span className="flex h-[110px] w-[110px] items-center justify-center rounded-full bg-sea text-[60px] font-black text-white shadow-card">{data.open + 1}</span>
                  <p className="text-center text-[64px] font-black leading-tight text-ink" data-testid="ticket-question">
                    {q}
                  </p>
                  <div className="flex gap-6">
                    <button type="button" className="btn3d btn-white" onClick={() => setData({ ...data, open: null })}>
                      Жабу
                    </button>
                    <button
                      type="button"
                      data-testid="ticket-answered"
                      className="btn3d btn-sun"
                      onClick={() => setData({ open: null, done: data.done.includes(data.open!) ? data.done : [...data.done, data.open!] })}
                    >
                      <CheckMark size={36} /> Жауап берді
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <NavBar />
    </div>
  );
}
