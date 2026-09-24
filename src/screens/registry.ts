import type { ComponentType } from 'react';
import { lesson } from '../content/lesson';
import { Welcome } from './Welcome';

export type Section = 'start' | 'astana' | 'burabay' | 'almaty' | 'final';

export interface ScreenDef {
  n: number;
  title: string;
  section: Section;
  /** Дайын экран компоненті. Жоқ болса — экран әлі жасалмаған. */
  component?: ComponentType;
  /** Мұғалімге ғана көрінетін Word мәтіндері (мұғалім сөзі, дескриптор) */
  teacherNotes?: readonly string[];
  /** Word-та үлгі жауап бар ма (Teacher Mode-та «Үлгіні көрсету») */
  example?: string;
}

export const SCREENS: ScreenDef[] = [
  { n: 1, title: 'Welcome', section: 'start', component: Welcome, teacherNotes: [lesson.intro.stage, lesson.intro.teacher, lesson.intro.students] },
  { n: 2, title: lesson.bag.title, section: 'start', teacherNotes: [lesson.bag.descriptor], example: lesson.bag.example },
  { n: 3, title: 'Қазақстан картасы', section: 'start', teacherNotes: [lesson.intro.teacherRoute] },
  { n: 4, title: 'Астана', section: 'astana', teacherNotes: [lesson.astana.stage, lesson.astana.teacher] },
  { n: 5, title: lesson.recognize.title, section: 'astana', teacherNotes: [lesson.recognize.descriptor], example: lesson.recognize.example },
  { n: 6, title: lesson.scrambled.title, section: 'astana', example: lesson.scrambled.answers.join(' ') },
  { n: 7, title: 'Бурабай', section: 'burabay', teacherNotes: [lesson.burabay.stage, lesson.burabay.teacher] },
  { n: 8, title: lesson.seeing.title, section: 'burabay', teacherNotes: [lesson.seeing.descriptor], example: lesson.seeing.example },
  { n: 9, title: lesson.oddWord.title, section: 'burabay', teacherNotes: [lesson.oddWord.descriptor] },
  { n: 10, title: lesson.movement.title, section: 'burabay', teacherNotes: [lesson.movement.teacher] },
  { n: 11, title: 'Алматы', section: 'almaty', teacherNotes: [lesson.almaty.stage, lesson.almaty.teacher, lesson.almaty.shown] },
  { n: 12, title: lesson.trueFalse.title, section: 'almaty', teacherNotes: [lesson.trueFalse.descriptor] },
  { n: 13, title: lesson.story.title, section: 'almaty', example: lesson.story.example },
  { n: 14, title: lesson.ticket.title, section: 'final', teacherNotes: [lesson.ticket.stage] },
  { n: 15, title: lesson.reflection.title, section: 'final' },
  { n: 16, title: 'Саяхатшы билеті', section: 'final', teacherNotes: [lesson.reflection.closing] },
];
