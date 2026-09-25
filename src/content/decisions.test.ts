import { describe, expect, it } from 'vitest';
import { BAG_NOT_NEEDED, ODD_WORD_ANSWERS, trueFalsePoints } from './decisions';
import { lesson } from './lesson';

describe('автор шешімдері Word мазмұнына сәйкес', () => {
  it('«қажет емес» заттар — Word-тағы 8 заттың ішінен, жаңа сөз қосылмаған', () => {
    for (const w of BAG_NOT_NEEDED) expect(lesson.bag.words).toContain(w);
    expect(BAG_NOT_NEEDED).toEqual(['доп', 'балмұздақ']);
  });
  it('артық сөздер — әр жолдың өз сөзі', () => {
    ODD_WORD_ANSWERS!.forEach((w, i) => expect(lesson.oddWord.groups[i]).toContain(w));
  });
  it('дұрыс/бұрыс баллы: 5→2, 3–4→1, 0–2→0', () => {
    expect([0, 1, 2, 3, 4, 5].map(trueFalsePoints)).toEqual([0, 0, 0, 1, 1, 2]);
  });
});
