/** Дұрыс/қате белгілері (UI белгісі, asset емес) */
export const CheckMark = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CrossMark = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" />
  </svg>
);
