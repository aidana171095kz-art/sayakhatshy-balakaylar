import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lesson } from './lesson';

const word = readFileSync(resolve(process.cwd(), 'content/word-source.txt'), 'utf8');

function strings(v: unknown, path = 'lesson'): [string, string][] {
  if (typeof v === 'string') return [[path, v]];
  if (typeof v === 'boolean' || typeof v === 'number') return [];
  if (Array.isArray(v)) return v.flatMap((x, i) => strings(x, `${path}[${i}]`));
  return Object.entries(v as object)
    .filter(([k]) => k !== 'key') // ішкі идентификатор, экранда көрсетілмейді
    .flatMap(([k, x]) => strings(x, `${path}.${k}`));
}

describe('оқу мазмұны Word құжатымен сәйкес', () => {
  it.each(strings(lesson))('%s Word-та дәл бар', (_path, text) => {
    expect(word).toContain(text);
  });

  it('10 сұрақ, 5 мәлімдеме, 3 сөйлем, 8 зат', () => {
    expect(lesson.ticket.questions).toHaveLength(10);
    expect(lesson.trueFalse.statements).toHaveLength(5);
    expect(lesson.scrambled.answers).toHaveLength(3);
    expect(lesson.bag.words).toHaveLength(8);
  });

  it('Адасқан сөздер: әр сөйлем тек өз тобындағы сөздерден тұрады', () => {
    lesson.scrambled.answers.forEach((answer, i) => {
      const words = answer.replace(/[—.]/g, ' ').split(/\s+/).filter(Boolean).sort();
      expect(words).toEqual([...lesson.scrambled.groups[i]].sort());
    });
  });

  it('Дұрыс/бұрыс жауаптары Word-тағыдай', () => {
    for (const s of lesson.trueFalse.statements) {
      expect(word).toContain(`${s.text} — ${s.answer ? 'Дұрыс' : 'Бұрыс'}.`);
    }
  });

  it('мәтінде қос бос орын не тыныс белгі алдында бос орын жоқ', () => {
    for (const [path, t] of strings(lesson)) {
      expect(t, path).not.toMatch(/ {2}| [.,!?:;»]|« /);
      expect(t, path).toBe(t.trim());
    }
  });
});
