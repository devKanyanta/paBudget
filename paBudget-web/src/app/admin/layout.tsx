'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RequireAuth } from '@/components/ui';

const NAV = [['/admin', 'Overview'], ['/admin/queue', 'Queue'], ['/admin/places', 'Places'], ['/admin/users', 'Users'], ['/admin/takedowns', 'Takedowns'], ['/admin/data', 'Areas & tags'], ['/admin/log', 'Audit log']];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <RequireAuth role="ADMIN">
      <nav className="-mx-4 mb-4 flex gap-1 overflow-x-auto px-4 text-sm font-medium">
        {NAV.map(([href, label]) => <Link key={href} href={href} className={`chip whitespace-nowrap ${path === href || (href !== '/admin' && path.startsWith(href)) ? 'chip-active' : ''}`}>{label}</Link>)}
      </nav>
      {children}
    </RequireAuth>
  );
}
