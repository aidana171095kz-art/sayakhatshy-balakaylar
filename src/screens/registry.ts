import type { ComponentType } from 'react';
import { lesson } from '../content/lesson';
import { Astana } from './Astana';
import { Bag } from './Bag';
import { MapScreen } from './MapScreen';
import { Recognize } from './Recognize';
import { Scrambled } from './Scrambled';
import { Welcome } from './Welcome';
import { Burabay } from './Burabay';
import { Seeing } from './Seeing';
import { OddWord } from './OddWord';
import { Movement } from './Movement';
import { Almaty } from './Almaty';
import { TrueFalse } from './TrueFalse';
import { Story } from './Story';
import { MagicTicket } from './MagicTicket';
import { Reflection } from './Reflection';
import { TravelerTicket } from './TravelerTicket';

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
  { n: 2, title: lesson.bag.title, section: 'start', component: Bag, teacherNotes: [lesson.bag.game, lesson.bag.descriptor], example: lesson.bag.example },
  { n: 3, title: 'Қазақстан картасы', section: 'start', component: MapScreen, teacherNotes: [lesson.intro.teacherRoute] },
  { n: 4, title: 'Астана', section: 'astana', component: Astana, teacherNotes: [lesson.astana.stage, lesson.astana.teacher] },
  { n: 5, title: lesson.recognize.title, section: 'astana', component: Recognize, teacherNotes: [lesson.recognize.heading, lesson.recognize.pictures, lesson.recognize.descriptor], example: lesson.recognize.example },
  { n: 6, title: lesson.scrambled.title, section: 'astana', component: Scrambled, teacherNotes: [lesson.scrambled.heading], example: lesson.scrambled.answers.join(' ') },
  { n: 7, title: 'Бурабай', section: 'burabay', component: Burabay, teacherNotes: [lesson.burabay.stage, lesson.burabay.teacher] },
  { n: 8, title: lesson.seeing.title, section: 'burabay', component: Seeing, teacherNotes: [lesson.seeing.heading, lesson.seeing.descriptor], example: lesson.seeing.example },
  { n: 9, title: lesson.oddWord.title, section: 'burabay', component: OddWord, teacherNotes: [lesson.oddWord.heading, lesson.oddWord.descriptor] },
  { n: 10, title: lesson.movement.title, section: 'burabay', component: Movement, teacherNotes: [lesson.movement.heading, lesson.movement.teacher] },
  { n: 11, title: 'Алматы', section: 'almaty', component: Almaty, teacherNotes: [lesson.almaty.stage, lesson.almaty.teacher, lesson.almaty.shown] },
  { n: 12, title: lesson.trueFalse.title, section: 'almaty', component: TrueFalse, teacherNotes: [lesson.trueFalse.heading, lesson.trueFalse.descriptor] },
  { n: 13, title: lesson.story.title, section: 'almaty', component: Story, teacherNotes: [lesson.story.heading], example: lesson.story.example },
  { n: 14, title: lesson.ticket.title, section: 'final', component: MagicTicket, teacherNotes: [lesson.ticket.stage] },
  { n: 15, title: lesson.reflection.title, section: 'final', component: Reflection, teacherNotes: [lesson.reflection.heading] },
  { n: 16, title: 'Саяхатшы билеті', section: 'final', component: TravelerTicket, teacherNotes: [lesson.reflection.closing] },
];
