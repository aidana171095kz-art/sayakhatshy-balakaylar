import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ASSETS, SCREEN_ASSETS, type AssetId } from './manifest';

const file = (id: string) => resolve(process.cwd(), 'src/assets', `${id}.webp`);

describe('asset manifest', () => {
  it.each(Object.values(ASSETS).filter((a) => a.status === 'final').map((a) => a.id))('%s файлы бар және бос емес', (id) => {
    expect(existsSync(file(id))).toBe(true);
    expect(statSync(file(id)).size).toBeGreaterThan(1024);
  });

  it('экрандағы әр asset manifest-те бар', () => {
    for (const ids of Object.values(SCREEN_ASSETS)) for (const id of ids) expect(ASSETS).toHaveProperty(id);
  });

  it('бір экранда кейіпкер стилі араласпайды', () => {
    for (const [screen, ids] of Object.entries(SCREEN_ASSETS)) {
      const styles = new Set(ids.map((id) => ASSETS[id as AssetId]).filter((a) => a.kind === 'character').map((a) => a.characterStyle));
      expect(styles.size, `screen ${screen}`).toBeLessThanOrEqual(1);
      if (styles.size) expect([...styles][0]).toBe('uniform');
    }
  });

  it('фондардың ішінде кейіпкер жоқ (кейіпкерлі фон қолданылмайды)', () => {
    for (const a of Object.values(ASSETS)) if (a.kind === 'background') expect(a.characterStyle).toBeUndefined();
  });
});
