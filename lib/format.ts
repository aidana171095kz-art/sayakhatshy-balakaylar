// Күн/уақыт форматы — Астана уақытымен (UTC+5), серверде де, браузерде де бірдей нәтиже.
// Etc/GMT-5 = UTC+5 (Қазақстан, 2024 жылдан). Asia/Almaty ескі tzdata-да +6 болуы мүмкін.
const TZ = 'Etc/GMT-5';

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d));
}

/** @db.Date өрістері UTC түн ортасы ретінде сақталады — оларды UTC бойынша көрсетеміз. */
export function formatDay(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat('ru-RU', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d));
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
}

/** <input type="date"> үшін: 2026-10-05 */
export function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}
