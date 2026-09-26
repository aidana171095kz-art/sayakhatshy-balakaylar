/**
 * Бағалау құрылымы — Word құжатындағы «БАҒАЛАУ ПАРАҒЫ» мен дескрипторлар.
 * Критерий мәтіндері дескрипторлардың өзі. Балл тек мұғалім арқылы қойылады
 * (Word-та автоматты ереже жоқ), сондықтан бұл жерде ешқандай авто-ереже жоқ.
 */

export type TaskId = 'bag' | 'recognize' | 'seeing' | 'oddWord' | 'trueFalse' | 'ticket';

export interface Criterion {
  id: string;
  /** Word дескрипторының мәтіні */
  text: string;
  max: number;
}

export interface TaskDef {
  id: TaskId;
  /** Бағалау парағындағы жол атауы */
  label: string;
  screen: number;
  criteria: Criterion[];
}

export const TASKS: Record<TaskId, TaskDef> = {
  bag: {
    id: 'bag',
    label: 'Саяхатшының сөмкесі',
    screen: 2,
    criteria: [
      { id: 'named', text: 'қажетті затты дұрыс атайды', max: 1 },
      { id: 'sentence', text: 'сөйлем құрайды', max: 1 },
    ],
  },
  recognize: {
    id: 'recognize',
    label: 'Астана: Суретті таны',
    screen: 5,
    criteria: [
      { id: 'named', text: 'көрікті орынды атайды', max: 1 },
      { id: 'answer', text: 'сұраққа толық жауап береді', max: 1 },
    ],
  },
  seeing: {
    id: 'seeing',
    label: 'Бурабай: Не көріп тұрсың?',
    screen: 8,
    criteria: [
      { id: 'objects', text: 'суреттен 2 нысанды атайды', max: 1 },
      { id: 'sentence', text: 'бір дұрыс сөйлем құрайды', max: 1 },
    ],
  },
  oddWord: {
    id: 'oddWord',
    label: 'Артық сөзді тап',
    screen: 9,
    criteria: [{ id: 'found', text: 'артық сөзді дұрыс табады', max: 1 }],
  },
  trueFalse: {
    id: 'trueFalse',
    label: 'Алматы: Дұрыс/бұрыс',
    screen: 12,
    criteria: [{ id: 'distinguish', text: 'дұрыс және бұрыс ақпаратты ажыратады', max: 2 }],
  },
  ticket: {
    id: 'ticket',
    label: 'Сиқырлы билет',
    screen: 14,
    criteria: [{ id: 'answered', text: 'Сиқырлы билет', max: 1 }],
  },
};

export const TASK_ORDER: TaskId[] = ['bag', 'recognize', 'seeing', 'oddWord', 'trueFalse', 'ticket'];

export const MAX_TOTAL = 10;

export const scoreKey = (task: TaskId, criterion: string) => `${task}.${criterion}`;

export function taskMax(task: TaskId): number {
  return TASKS[task].criteria.reduce((s, c) => s + c.max, 0);
}

export function taskForScreen(screen: number): TaskDef | undefined {
  return TASK_ORDER.map((t) => TASKS[t]).find((t) => t.screen === screen);
}
