import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Asset } from '../components/Asset';
import { NavBar } from '../components/NavBar';
import { lesson } from '../content/lesson';
import { useGame, useScreenState } from '../game/GameProvider';
import { taskScore } from '../game/state';
import { MAX_TOTAL, TASK_ORDER } from '../game/tasks';

const SCREEN = 16;

const spring = { type: 'spring', stiffness: 200, damping: 18 } as const;

/**
 * SCREEN 16 — Саяхатшы билеті (финал). Word-тағы «Саяхатшы билеті»: оқушының аты, бағыт,
 * жинаған балл (орталық state-тен — ешқашан бөлек есептелмейді), менің сүйікті бағытым.
 */
export function TravelerTicket() {
  const { total, state } = useGame();
  const [sheet, setSheet] = useState(false);
  const [data, setData] = useScreenState<{ name: string; favorite: string }>(SCREEN, { name: '', favorite: '' });
  const t = lesson.travelerTicket;

  return (
    <div className="absolute inset-0 bg-journey">
      <motion.div
        className="absolute left-[340px] top-[160px] flex h-[740px] w-[1240px] overflow-hidden rounded-[48px] bg-paper"
        style={{ boxShadow: '0 22px 44px rgba(18,53,91,.25)' }}
        initial={{ opacity: 0, scale: 0.6, rotate: -6 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ ...spring, delay: 0.1 }}
        data-testid="traveler-ticket"
      >
        {/* Негізгі бөлік */}
        <div className="flex flex-1 flex-col justify-between px-16 py-14">
          <div>
            <h1 className="text-[72px] font-black leading-none tracking-tight text-sea" style={{ textShadow: '0 5px 0 #BFF1F8' }}>
              {t.title}
            </h1>
            <p className="mt-3 text-[32px] font-bold text-ink-soft">{t.subtitle}</p>
          </div>

          <label className="block">
            <span className="text-[26px] font-extrabold text-paper-gold">{t.nameLabel}</span>
            <input
              data-testid="student-name"
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              spellCheck={false}
              className="mt-1 block h-[76px] w-full border-b-4 border-dashed border-paper-gold bg-transparent text-[48px] font-black text-ink outline-none focus:border-sea"
            />
          </label>

          <div>
            <span className="text-[26px] font-extrabold text-paper-gold">{t.routeLabel}</span>
            <p className="text-[46px] font-black text-ink">{t.route}</p>
          </div>

          <div>
            <span className="text-[26px] font-extrabold text-paper-gold">{t.favoriteLabel}</span>
            <div className="mt-2 flex gap-4">
              {lesson.routeStops.map((s) => (
                <button
                  key={s}
                  type="button"
                  data-testid={`favorite-${s}`}
                  aria-pressed={data.favorite === s}
                  onClick={() => setData({ ...data, favorite: data.favorite === s ? '' : s })}
                  className={`rounded-full px-8 py-3 text-[36px] font-black shadow-card transition-colors ${data.favorite === s ? 'bg-sea text-white' : 'bg-white text-ink'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Тесік сызығы + бүйірдегі үзінді: жинаған балл */}
        <div className="relative w-[330px] border-l-[6px] border-dashed border-paper-gold/70 bg-[#FFEFC8]">
          <span className="absolute -left-[26px] -top-[26px] h-[52px] w-[52px] rounded-full bg-sky-300" />
          <span className="absolute -bottom-[26px] -left-[26px] h-[52px] w-[52px] rounded-full bg-sky-500" />
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <Asset id="ui.star" className="h-[150px] w-[150px] drop-shadow-[0_10px_20px_rgba(224,161,0,.45)]" />
            <span className="text-[28px] font-extrabold text-paper-gold">{t.scoreLabel}</span>
            <p className="text-[96px] font-black leading-none text-sea" data-testid="final-score">
              {total}
              <span className="text-[48px] text-ink-soft"> / {MAX_TOTAL}</span>
            </p>
          </div>
        </div>
        {/* Алтын жиек — бүкіл билеттің үстінен */}
        <span
          className="pointer-events-none absolute inset-0 rounded-[48px]"
          style={{ boxShadow: 'inset 0 0 0 10px #E3AE3F, inset 0 0 0 16px rgba(255,246,224,.9), inset 0 0 0 19px #E3AE3F' }}
        />
      </motion.div>

      <motion.div className="pointer-events-none absolute bottom-0 left-[10px] h-[640px]" initial={{ opacity: 0, x: -80 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.5 }}>
        <Asset id="boy.standing" className="h-full drop-shadow-[0_20px_20px_rgba(18,53,91,.3)]" />
      </motion.div>
      <motion.div className="pointer-events-none absolute bottom-0 right-[10px] h-[640px]" initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.6 }}>
        <Asset id="girl.ticket" className="h-full drop-shadow-[0_20px_20px_rgba(18,53,91,.3)]" />
      </motion.div>

      {/* Word-тағы «БАҒАЛАУ ПАРАҒЫ»: Тапсырма | Балл | Менің баллым (орталық state-тен) */}
      <AnimatePresence>
        {sheet && (
          <motion.div
            className="absolute inset-0 z-30 flex items-center justify-center bg-ink/45 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSheet(false)}
          >
            <motion.div
              className="card w-[1100px] px-14 py-10"
              data-testid="assessment-sheet"
              initial={{ scale: 0.8, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={spring}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-6 text-center text-[56px] font-black tracking-tight text-sea">{lesson.assessment.title}</h2>
              <table className="w-full text-[34px]">
                <thead>
                  <tr className="bg-sky-100 text-left">
                    {lesson.assessment.columns.map((c, i) => (
                      <th key={c} className={`whitespace-nowrap px-5 py-3 font-extrabold text-ink ${i ? 'w-[240px] text-center' : ''}`}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TASK_ORDER.map((t, i) => (
                    <tr key={t} className="border-b-2 border-line" data-testid={`sheet-row-${t}`}>
                      <td className="px-5 py-3 font-bold text-ink">{lesson.assessment.rows[i].label}</td>
                      <td className="px-5 py-3 text-center font-bold tabular-nums text-ink-soft">{lesson.assessment.rows[i].max}</td>
                      <td className="px-5 py-3 text-center font-black tabular-nums text-sea">{taskScore(state, t)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="px-5 py-4 font-black text-ink">{lesson.assessment.total}</td>
                    <td className="px-5 py-4 text-center font-black tabular-nums text-ink">{MAX_TOTAL}</td>
                    <td className="px-5 py-4 text-center text-[44px] font-black tabular-nums text-sea" data-testid="sheet-total">
                      {total}
                    </td>
                  </tr>
                </tbody>
              </table>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <NavBar
        center={
          <button type="button" data-testid="open-sheet" className="btn3d btn-sea" onClick={() => setSheet(!sheet)}>
            {sheet ? 'Жабу' : lesson.assessment.title}
          </button>
        }
      />
    </div>
  );
}
