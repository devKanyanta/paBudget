'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Database, History, LayoutDashboard, ListChecks, MapPin, ShieldAlert, Users } from 'lucide-react';
import { RequireAuth } from '@/components/ui';

const NAV = [
  ['/admin', 'Overview', LayoutDashboard], ['/admin/queue', 'Moderation queue', ListChecks], ['/admin/places', 'Places', MapPin], ['/admin/users', 'Users', Users],
  ['/admin/takedowns', 'Takedowns', ShieldAlert], ['/admin/data', 'Areas & tags', Database], ['/admin/log', 'Audit log', History],
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <RequireAuth role="ADMIN">
      <div className="grid items-start gap-6 md:grid-cols-[220px_1fr]">
        <nav aria-label="Admin" className="-mx-4 flex gap-1 overflow-x-auto px-4 md:sticky md:top-20 md:mx-0 md:flex-col md:px-0">
          <p className="hidden px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted md:block">Admin</p>
          {NAV.map(([href, label, Icon]) => {
            const on = path === href || (href !== '/admin' && path.startsWith(href));
            return <Link key={href} href={href} className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${on ? 'bg-brand-soft text-brand' : 'text-ink-2 hover:bg-sunken'}`}><Icon aria-hidden className="size-4" />{label}</Link>;
          })}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </RequireAuth>
  );
}
