import { describe, expect, it } from 'vitest';
import { BAG_NOT_NEEDED } from './decisions';
import { lesson } from './lesson';

describe('автор шешімдері Word мазмұнына сәйкес', () => {
  it('«қажет емес» заттар — Word-тағы 8 заттың ішінен, жаңа сөз қосылмаған', () => {
    for (const w of BAG_NOT_NEEDED) expect(lesson.bag.words).toContain(w);
    expect(BAG_NOT_NEEDED).toEqual(['доп', 'балмұздақ']);
  });
});
