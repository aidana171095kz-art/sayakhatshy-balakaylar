'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CURRENT_STAGE, type NavItem } from './nav';

export function SideNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:overflow-visible">
      {items.map((item) => {
        const ready = !item.stage || item.stage <= CURRENT_STAGE;
        if (!ready) {
          return (
            <span
              key={item.href}
              title={`Появится на этапе ${item.stage}`}
              className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground/60"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              <span className="ml-auto hidden rounded bg-muted px-1.5 text-[10px] md:inline">этап {item.stage}</span>
            </span>
          );
        }
        const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm ${
              active ? 'bg-accent font-medium text-accent-foreground' : 'hover:bg-muted'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
