/**
 * ASSET MANIFEST — жобадағы әр суреттің бірден-бір тізімі.
 *
 * Экрандар суретті тек <Asset id="…"/> арқылы шақырады. Файл src/assets/<id>.webp
 * ретінде табылмаса немесе status: 'missing' болса, таза placeholder көрсетіледі —
 * нақты asset келгенде файлды қосу (және status-ты 'final' ету) жеткілікті.
 *
 * source — түпнұсқа файл: Drive (UUID префиксі) немесе WhatsApp zip (W-нөмірі).
 * characterStyle — суреттегі кейіпкер стилі. Жобада тек 'uniform' (мектеп формасы)
 * қолданылады; бір экранда екі стиль араласпауы manifest.test.ts-те тексеріледі.
 */

export type AssetKind = 'character' | 'background' | 'landmark' | 'item' | 'ui';
export type CharacterStyle = 'uniform';

export interface AssetEntry {
  id: string;
  kind: AssetKind;
  /** Экранда оқылатын атау (placeholder мен alt үшін) */
  label: string;
  source: string;
  status: 'final' | 'missing';
  characterStyle?: CharacterStyle;
  note?: string;
}

const A = (e: AssetEntry) => e;

export const ASSETS = {
  // ── Кейіпкерлер (мектеп формасы) ─────────────────────────────
  'boy.pointing': A({ id: 'boy.pointing', kind: 'character', label: 'Бала', source: 'Drive 22A5220A (=W08/W33)', status: 'final', characterStyle: 'uniform' }),
  'girl.openBag': A({ id: 'girl.openBag', kind: 'character', label: 'Қыз', source: 'Drive ECC87B5E (=W16), фоны қиылды', status: 'final', characterStyle: 'uniform' }),
  'girl.walking': A({ id: 'girl.walking', kind: 'character', label: 'Қыз', source: 'Drive 4F18C84E (=W14/W22/W37)', status: 'final', characterStyle: 'uniform' }),

  // ── Фондар (ішінде кейіпкер жоқ) ─────────────────────────────
  'bg.astana': A({ id: 'bg.astana', kind: 'background', label: 'Астана', source: 'W04', status: 'final', note: 'WhatsApp көшірмесі 1280×720 — түпнұсқа PNG/JPG сұралды' }),
  'bg.almaty': A({ id: 'bg.almaty', kind: 'background', label: 'Алматы', source: '—', status: 'missing', note: 'Кейіпкерсіз Алматы фоны берілмеген' }),

  // ── Көрікті жерлер ──────────────────────────────────────────
  'landmark.baiterek': A({ id: 'landmark.baiterek', kind: 'landmark', label: 'Бәйтерек', source: 'W50 (фоны қиылды)', status: 'final' }),
  'landmark.akorda': A({ id: 'landmark.akorda', kind: 'landmark', label: 'Ақорда', source: 'W49 (фоны қиылды)', status: 'final' }),
  'landmark.khanShatyr': A({ id: 'landmark.khanShatyr', kind: 'landmark', label: 'Хан Шатыр', source: 'W48 (фоны қиылды)', status: 'final' }),

  // ── Саяхатшының сөмкесі: Word-тағы 8 зат + ашық рюкзак ─────────
  'prop.backpack': A({ id: 'prop.backpack', kind: 'item', label: 'Рюкзак', source: 'Drive D169E169 (=W63)', status: 'final' }),
  'item.map': A({ id: 'item.map', kind: 'item', label: 'карта', source: 'Drive 557540E9', status: 'final' }),
  'item.book': A({ id: 'item.book', kind: 'item', label: 'кітап', source: 'Drive 75441B17 (=W31)', status: 'final' }),
  'item.ticket': A({ id: 'item.ticket', kind: 'item', label: 'билет', source: 'W54 (фоны қиылды)', status: 'final' }),
  'item.ball': A({ id: 'item.ball', kind: 'item', label: 'доп', source: 'Drive 4E19D285 (=W17)', status: 'final' }),
  'item.pencil': A({ id: 'item.pencil', kind: 'item', label: 'қалам', source: 'Drive 31ADD202 (=W27)', status: 'final' }),
  'item.passport': A({ id: 'item.passport', kind: 'item', label: 'төлқұжат', source: 'W03 (қара фоны алынды)', status: 'final' }),
  'item.icecream': A({ id: 'item.icecream', kind: 'item', label: 'балмұздақ', source: 'Drive A4CD58AB (=W18)', status: 'final' }),
  'item.water': A({ id: 'item.water', kind: 'item', label: 'су', source: 'Drive 74EB7B97 (=W28), фоны қиылды', status: 'final' }),

  // ── UI ───────────────────────────────────────────────────────
  'ui.star': A({ id: 'ui.star', kind: 'ui', label: 'Жұлдыз', source: 'W53 (фоны қиылды)', status: 'final' }),
} satisfies Record<string, AssetEntry>;

export type AssetId = keyof typeof ASSETS;

const files = import.meta.glob('./*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export function assetUrl(id: AssetId): string | undefined {
  if (ASSETS[id].status !== 'final') return undefined;
  return files[`./${id}.webp`];
}

/** Әр экранда қолданылатын asset-тер (QA және кейіпкер стилін тексеру үшін). */
export const SCREEN_ASSETS: Record<number, AssetId[]> = {
  1: ['bg.astana', 'boy.pointing', 'girl.walking'],
  2: ['girl.openBag', 'prop.backpack', 'item.map', 'item.book', 'item.ticket', 'item.ball', 'item.pencil', 'item.passport', 'item.icecream', 'item.water', 'ui.star'],
};
