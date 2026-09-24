import { describe, expect, it } from 'vitest';
import { lesson } from '../content/lesson';
import { sentenceTemplate } from './Scrambled';

describe('Адасқан сөздер: сөйлем қалыбы Word-тағы дұрыс нұсқадан', () => {
  it.each(lesson.scrambled.answers.map((a, i) => [a, i] as const))('%s', (answer, i) => {
    const parts = sentenceTemplate(answer);
    const slots = parts.flatMap((p) => (p.kind === 'slot' ? [p.word] : []));
    // слоттағы сөздер — дәл сол жолдың 3 сөзі
    expect([...slots].sort()).toEqual([...lesson.scrambled.groups[i]].sort());
    // қалып қайта жиналғанда Word мәтінімен бірдей (нүктенің алдында бос орын жоқ)
    const rebuilt = parts.map((p, j) => (p.kind === 'punct' && p.text === '.' ? '.' : (j ? ' ' : '') + (p.kind === 'slot' ? p.word : p.text))).join('');
    expect(rebuilt).toBe(answer);
  });
});
