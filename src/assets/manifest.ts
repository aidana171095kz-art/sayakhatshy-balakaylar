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
  'boy.map': A({ id: 'boy.map', kind: 'character', label: 'Бала', source: 'Drive 5589E269', status: 'final', characterStyle: 'uniform' }),
  'boy.cheer': A({ id: 'boy.cheer', kind: 'character', label: 'Бала', source: 'Drive DC4E18A3 (=W24)', status: 'final', characterStyle: 'uniform' }),
  'boy.presenting': A({ id: 'boy.presenting', kind: 'character', label: 'Бала', source: 'W06 (=W35), фоны қиылды', status: 'final', characterStyle: 'uniform' }),
  'boy.standing': A({ id: 'boy.standing', kind: 'character', label: 'Бала', source: 'Drive 8993A584 (=W38)', status: 'final', characterStyle: 'uniform' }),
  'boy.ticket': A({ id: 'boy.ticket', kind: 'character', label: 'Бала', source: 'Drive 0E2E5B03 (=W13), фоны қиылды', status: 'final', characterStyle: 'uniform' }),
  'girl.cheer': A({ id: 'girl.cheer', kind: 'character', label: 'Қыз', source: 'W10 (=F8399533), фоны қиылды', status: 'final', characterStyle: 'uniform' }),
  'girl.map': A({ id: 'girl.map', kind: 'character', label: 'Қыз', source: 'W11, фоны қиылды', status: 'final', characterStyle: 'uniform' }),
  'girl.presenting': A({ id: 'girl.presenting', kind: 'character', label: 'Қыз', source: 'W09 (=W42), фоны қиылды', status: 'final', characterStyle: 'uniform' }),
  'girl.ticket': A({ id: 'girl.ticket', kind: 'character', label: 'Қыз', source: 'Drive A87A7B53 (=W25)', status: 'final', characterStyle: 'uniform' }),
  'boy.thinking': A({ id: 'boy.thinking', kind: 'character', label: 'Бала', source: 'Drive 27A65AFF (=W23)', status: 'final', characterStyle: 'uniform' }),
  'girl.pointing': A({ id: 'girl.pointing', kind: 'character', label: 'Қыз', source: 'W07 (=W34), фоны қиылды', status: 'final', characterStyle: 'uniform' }),
  'girl.thinking': A({ id: 'girl.thinking', kind: 'character', label: 'Қыз', source: 'W12, фоны қиылды', status: 'final', characterStyle: 'uniform' }),
  'girl.openBag': A({ id: 'girl.openBag', kind: 'character', label: 'Қыз', source: 'Drive ECC87B5E (=W16), фоны қиылды', status: 'final', characterStyle: 'uniform' }),
  'girl.walking': A({ id: 'girl.walking', kind: 'character', label: 'Қыз', source: 'Drive 4F18C84E (=W14/W22/W37)', status: 'final', characterStyle: 'uniform' }),

  // ── Фондар (ішінде кейіпкер жоқ) ─────────────────────────────
  'bg.astana': A({ id: 'bg.astana', kind: 'background', label: 'Астана', source: 'W04', status: 'final', note: 'WhatsApp көшірмесі 1280×720 — түпнұсқа PNG/JPG сұралды' }),
  'bg.burabay': A({ id: 'bg.burabay', kind: 'background', label: 'Бурабай', source: 'W57', status: 'final' }),
  'bg.burabay-meadow': A({ id: 'bg.burabay-meadow', kind: 'background', label: 'Бурабай', source: 'Drive 1D6687EE (=W26)', status: 'final' }),
  'bg.almaty': A({ id: 'bg.almaty', kind: 'background', label: 'Алматы', source: 'Drive 8C514EB0 — кейіпкерсіз оң жақ бөлігі (x 710–1536)', status: 'final', note: 'Кейіпкерсіз толық Алматы фоны берілмеген; түпнұсқа келсе ауыстырылады' }),
  'scene.almaty-mountains': A({ id: 'scene.almaty-mountains', kind: 'landmark', label: 'тау', source: 'Drive 8C514EB0 — жоғарғы тау панорамасы (y 95–300), кейіпкерсіз', status: 'final' }),

  // ── Карта ────────────────────────────────────────────────────
  'map.kazakhstan': A({ id: 'map.kazakhstan', kind: 'background', label: 'Қазақстан картасы', source: 'Drive 2006CD51 (=W29)', status: 'final', note: 'Белгілер (pin) суретте: көк — Астана, жасыл — Бурабай, қызыл — Алматы' }),

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

  // ── Бурабай мен Алматы нысандары (Drive 473217D9 спрайтынан кесілді) ──
  'landmark.mountain': A({ id: 'landmark.mountain', kind: 'landmark', label: 'тау', source: 'Drive 473217D9 (спрайт, 4)', status: 'final' }),
  'landmark.lake': A({ id: 'landmark.lake', kind: 'landmark', label: 'көл', source: 'Drive 473217D9 (спрайт, 5)', status: 'final' }),
  'landmark.forest': A({ id: 'landmark.forest', kind: 'landmark', label: 'орман', source: 'Drive 473217D9 (спрайт, 6)', status: 'final' }),
  'landmark.medeu': A({ id: 'landmark.medeu', kind: 'landmark', label: 'Медеу', source: 'Drive 473217D9 (спрайт, 7)', status: 'final' }),
  'landmark.koktobe': A({ id: 'landmark.koktobe', kind: 'landmark', label: 'Көктөбе', source: 'Drive 473217D9 (спрайт, 8)', status: 'final' }),

  // ── UI ───────────────────────────────────────────────────────
  'ui.ticket': A({ id: 'ui.ticket', kind: 'ui', label: 'Билет', source: 'W05 (фоны қиылды)', status: 'final', note: 'Бос билет — мәтін HTML арқылы' }),
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
  3: ['map.kazakhstan', 'boy.map', 'ui.star'],
  4: ['bg.astana', 'girl.pointing', 'landmark.akorda', 'landmark.baiterek', 'landmark.khanShatyr'],
  5: ['bg.astana', 'boy.thinking', 'landmark.baiterek', 'landmark.akorda', 'landmark.khanShatyr', 'ui.star'],
  6: ['bg.astana', 'girl.thinking', 'ui.star'],
  7: ['bg.burabay', 'boy.pointing'],
  8: ['bg.burabay', 'girl.pointing'],
  9: ['bg.burabay', 'boy.thinking'],
  10: ['bg.burabay', 'boy.cheer', 'landmark.lake', 'girl.walking', 'girl.cheer'],
  11: ['bg.almaty', 'boy.presenting', 'landmark.medeu', 'landmark.koktobe', 'scene.almaty-mountains'],
  12: ['bg.almaty', 'girl.presenting'],
  13: ['bg.almaty', 'girl.map'],
  14: ['ui.ticket', 'boy.ticket', 'girl.ticket', 'ui.star'],
  15: ['bg.burabay-meadow', 'girl.thinking'],
  16: ['boy.standing', 'girl.ticket', 'ui.star'],
  2: ['girl.openBag', 'prop.backpack', 'item.map', 'item.book', 'item.ticket', 'item.ball', 'item.pencil', 'item.passport', 'item.icecream', 'item.water', 'ui.star'],
};
