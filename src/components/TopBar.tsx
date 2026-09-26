import { lesson } from '../content/lesson';
import type { ScreenDef, Section } from '../screens/registry';
import { ScoreBadge } from './ScoreBadge';

const STOP_SECTION: Section[] = ['astana', 'burabay', 'almaty'];
const ORDER: Section[] = ['start', 'astana', 'burabay', 'almaty', 'final'];

/** Экран атауы • маршрут прогресі (Астана – Бурабай – Алматы) • жалпы балл */
export function TopBar({ screen }: { screen: ScreenDef }) {
  const current = ORDER.indexOf(screen.section);
  return (
    <div className="absolute inset-x-16 top-8 z-20 flex items-center justify-between">
      <div className="flex h-[88px] items-center gap-4 rounded-full bg-white/90 pl-3 pr-8 shadow-card">
        <span className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-sea text-h2 font-black text-white">
          {screen.n}
        </span>
        <span className="text-h2 font-extrabold text-ink">{screen.title}</span>
      </div>

      <div className="flex h-[72px] items-center gap-3 rounded-full bg-white/70 px-6 shadow-card" aria-label={lesson.route}>
        {lesson.routeStops.map((stop, i) => {
          const idx = ORDER.indexOf(STOP_SECTION[i]);
          const done = current > idx;
          const here = current === idx;
          return (
            <div key={stop} className="flex items-center gap-3">
              {i > 0 && <span className={`h-[6px] w-10 rounded-full ${done || here ? 'bg-sea' : 'bg-sky-200'}`} />}
              <span
                className={`rounded-full px-5 py-2 text-caption font-extrabold transition-colors ${
                  here ? 'bg-sea text-white' : done ? 'bg-sky-100 text-sea' : 'text-ink-soft'
                }`}
              >
                {stop}
              </span>
            </div>
          );
        })}
      </div>

      <ScoreBadge />
    </div>
  );
}
