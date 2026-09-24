/** Интерфейс белгілері (көрсеткі т.б.) — asset емес, тек навигация UI. */
export const ChevronRight = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronLeft = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
