import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { lesson } from '../content/lesson';
import { useGame } from '../game/GameProvider';
import { taskScore } from '../game/state';
import { MAX_TOTAL, TASKS, TASK_ORDER, scoreKey, taskForScreen } from '../game/tasks';
import { SCREENS } from '../screens/registry';

/**
 * Мұғалім режимі. Shift+T немесе жоғарғы оң бұрыштағы белгіні 3 рет басу арқылы ашылады.
 * Оқушы экранының үстінен сырғып шығады, экранды бұзбайды.
 */
export function TeacherPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch, total } = useGame();
  const [confirmAll, setConfirmAll] = useState(false);
  const screen = SCREENS[state.screen - 1];
  const task = taskForScreen(state.screen);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="teacher"
          data-testid="teacher-panel"
          initial={{ x: 700 }}
          animate={{ x: 0 }}
          exit={{ x: 700 }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          className="absolute bottom-0 right-0 top-0 z-50 flex w-[640px] flex-col gap-6 overflow-y-auto border-l-4 border-sea/30 bg-white p-8 text-caption text-ink shadow-lift"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-h2 font-black">Мұғалім режимі</h2>
            <button type="button" className="btn3d btn-white min-h-[64px] px-8 text-caption" onClick={onClose}>
              Жабу
            </button>
          </div>

          <section>
            <h3 className="mb-3 font-extrabold text-ink-soft">Экрандар</h3>
            <div className="grid grid-cols-4 gap-3">
              {SCREENS.map((s) => (
                <button
                  key={s.n}
                  type="button"
                  title={s.title}
                  onClick={() => dispatch({ type: 'go', screen: s.n })}
                  className={`relative rounded-chip px-2 py-3 text-left font-bold leading-tight ${
                    s.n === state.screen ? 'bg-sea text-white' : 'bg-sky-100 text-ink hover:bg-sky-200'
                  }`}
                >
                  <span className="block font-black">{s.n}</span>
                  <span className="block truncate text-[18px]">{s.title}</span>
                  {!s.component && <span className="absolute right-2 top-2 h-3 w-3 rounded-full bg-no" title="Әлі жасалмаған" />}
                </button>
              ))}
            </div>
          </section>

          {screen.teacherNotes && (
            <section>
              <h3 className="mb-3 font-extrabold text-ink-soft">Сабақ жоспарынан</h3>
              <div className="space-y-2 rounded-chip bg-sky-100 p-4 text-[22px] leading-snug">
                {screen.teacherNotes.map((t) => (
                  <p key={t}>{t}</p>
                ))}
              </div>
            </section>
          )}

          {screen.example && (
            <section>
              <button
                type="button"
                className="btn3d btn-sea w-full text-caption"
                onClick={() => dispatch({ type: 'reveal', screen: state.screen, value: !state.revealed[state.screen] })}
              >
                {state.revealed[state.screen] ? 'Үлгіні жасыру' : 'Үлгіні көрсету'}
              </button>
            </section>
          )}

          {task && (
            <section data-testid="teacher-scoring">
              <h3 className="mb-3 font-extrabold text-ink-soft">
                Бағалау: {task.label} — {taskScore(state, task.id)} / {task.criteria.reduce((s, c) => s + c.max, 0)}
              </h3>
              <div className="space-y-3">
                {task.criteria.map((c) => {
                  const value = state.scores[scoreKey(task.id, c.id)] ?? 0;
                  return (
                    <div key={c.id} className="flex items-center justify-between gap-4 rounded-chip bg-sky-100 p-3">
                      <span className="font-bold">{c.text}</span>
                      <div className="flex gap-2">
                        {Array.from({ length: c.max + 1 }, (_, v) => (
                          <button
                            key={v}
                            type="button"
                            data-testid={`score-${task.id}-${c.id}-${v}`}
                            onClick={() => dispatch({ type: 'setScore', task: task.id, criterion: c.id, value: v })}
                            className={`h-[56px] w-[56px] rounded-full font-black ${
                              value === v ? (v > 0 ? 'bg-ok text-white' : 'bg-ink-soft text-white') : 'bg-white text-ink'
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="flex gap-3">
            <button
              type="button"
              className="btn3d btn-white flex-1 min-h-[64px] px-4 text-caption"
              onClick={() => dispatch({ type: 'resetScreen', screen: state.screen })}
            >
              Тапсырманы reset
            </button>
            <button
              type="button"
              className={`btn3d flex-1 min-h-[64px] px-4 text-caption ${confirmAll ? 'bg-no text-white' : 'btn-white'}`}
              onClick={() => {
                if (!confirmAll) return setConfirmAll(true);
                dispatch({ type: 'resetAll' });
                setConfirmAll(false);
              }}
              onBlur={() => setConfirmAll(false)}
            >
              {confirmAll ? 'Растау: бәрін өшіру' : 'Толық reset'}
            </button>
          </section>

          <section>
            <h3 className="mb-3 font-extrabold text-ink-soft">{lesson.assessment.title}</h3>
            <table className="w-full text-[22px]">
              <tbody>
                {TASK_ORDER.map((t) => (
                  <tr key={t} className="border-b border-line">
                    <td className="py-2">{TASKS[t].label}</td>
                    <td className="py-2 text-right font-black tabular-nums">
                      {taskScore(state, t)} / {TASKS[t].criteria.reduce((s, c) => s + c.max, 0)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2 font-black">{lesson.assessment.total}</td>
                  <td className="py-2 text-right font-black tabular-nums" data-testid="teacher-total">
                    {total} / {MAX_TOTAL}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
