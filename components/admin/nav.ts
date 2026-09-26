// Admin мәзірі. `stage` — бөлім қай кезеңде іске қосылады (әзірге белсенді емес).
export interface NavItem {
  href: string;
  label: string;
  icon: string;
  stage?: number;
  ownerOnly?: boolean;
}

export const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/products', label: 'Товары', icon: '🌷', stage: 2 },
  { href: '/admin/stock', label: 'Остатки', icon: '📊', stage: 2 },
  { href: '/admin/prices', label: 'Цены', icon: '💰', stage: 2, ownerOnly: true },
  { href: '/admin/supplies', label: 'Поставки', icon: '📦', stage: 2 },
  { href: '/admin/orders', label: 'Заказы', icon: '📋', stage: 5 },
  { href: '/admin/monobouquets', label: 'Монобукеты', icon: '💐', stage: 2 },
  { href: '/admin/customers', label: 'Клиенты', icon: '👥', stage: 5 },
  { href: '/admin/inbox', label: 'Чаты', icon: '💬', stage: 5 },
  { href: '/admin/broadcasts', label: 'Рассылки', icon: '📢', stage: 6, ownerOnly: true },
  { href: '/admin/settings', label: 'Настройки', icon: '⚙️', stage: 2, ownerOnly: true },
  { href: '/admin/simulator', label: 'Симулятор бота', icon: '🧪', stage: 3 },
];

// Қай кезеңге дейін жасалды — жаңа кезең біткенде осы санды арттырамыз.
export const CURRENT_STAGE = 2;
