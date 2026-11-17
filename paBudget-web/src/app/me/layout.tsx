'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, ListChecks, Settings, UserCircle } from 'lucide-react';
import { RequireAuth } from '@/components/ui';

const NAV = [
  ['/me/favourites', 'Saved places', Heart], ['/me/plans', 'Saved plans', ListChecks],
  ['/me/contributions', 'Contributions', UserCircle], ['/me/settings', 'Settings', Settings],
] as const;

export default function MeLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <RequireAuth>
      <div className="grid items-start gap-6 md:grid-cols-[220px_1fr]">
        <nav aria-label="Account" className="-mx-4 flex gap-1 overflow-x-auto px-4 md:sticky md:top-20 md:mx-0 md:flex-col md:px-0">
          {NAV.map(([href, label, Icon]) => {
            const on = path.startsWith(href);
            return <Link key={href} href={href} className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${on ? 'bg-brand-soft text-brand' : 'text-ink-2 hover:bg-sunken'}`}><Icon aria-hidden className="size-4" />{label}</Link>;
          })}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </RequireAuth>
  );
}
