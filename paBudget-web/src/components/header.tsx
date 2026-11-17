'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { ChevronDown, Heart, LayoutDashboard, ListChecks, LogOut, Plus, Settings, Store, Trophy, UserCircle } from 'lucide-react';
import { useAuth } from './providers';
import { Logo } from './logo';

export function Header() {
  const { user, loading, signOut } = useAuth();
  const path = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => { menu.current?.removeAttribute('open'); }, [path]);
  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  const nav = (href: string) => `relative rounded-md px-3 py-2 text-sm font-medium transition ${active(href) ? 'text-brand' : 'text-ink-2 hover:text-foreground'}`;
  const bar = (href: string) => active(href) && <span aria-hidden className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-brand" />;
  const item = 'flex items-center gap-2.5 rounded-md px-3 py-2 text-ink-2 hover:bg-sunken hover:text-foreground';
  const icon = 'size-4 text-faint';
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" aria-label="paBudget home" className="flex items-center"><Logo className="h-6" /></Link>
          <nav className="flex items-center" aria-label="Main">
            <Link href="/places" className={nav('/places')}>Explore{bar('/places')}</Link>
            <Link href="/planner" className={nav('/planner')}>Planner{bar('/planner')}</Link>
            <Link href="/leaderboard" className={`${nav('/leaderboard')} hidden md:block`}>Leaderboard{bar('/leaderboard')}</Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {user && <Link href="/contribute/place" className="btn-outline btn-sm hidden sm:inline-flex"><Plus aria-hidden className="size-3.5" />Add place</Link>}
          {loading ? <span className="skeleton h-8 w-20" /> : user ? (
            <details ref={menu} className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg py-1 pl-1 pr-2 text-sm font-medium transition hover:bg-sunken">
                <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">{user.name.trim().charAt(0).toUpperCase()}</span>
                <span className="hidden sm:inline">{user.name.split(' ')[0]}</span><ChevronDown aria-hidden className="size-3.5 text-faint" />
              </summary>
              <div className="absolute right-0 mt-2 w-60 rounded-xl bg-surface p-1.5 text-sm shadow-pop ring-1 ring-border">
                <div className="border-b border-border px-3 pb-2.5 pt-1.5"><p className="truncate font-semibold">{user.name}</p><p className="truncate text-xs text-muted">{user.email ?? user.phone}</p></div>
                <div className="py-1.5">
                  <Link className={`${item} sm:hidden`} href="/contribute/place"><Plus aria-hidden className={icon} />Add a place</Link>
                  <Link className={item} href="/me/favourites"><Heart aria-hidden className={icon} />Saved places</Link>
                  <Link className={item} href="/me/plans"><ListChecks aria-hidden className={icon} />Saved plans</Link>
                  <Link className={item} href="/me/contributions"><UserCircle aria-hidden className={icon} />My contributions</Link>
                  <Link className={`${item} md:hidden`} href="/leaderboard"><Trophy aria-hidden className={icon} />Leaderboard</Link>
                  {(user.role === 'OWNER' || user.role === 'ADMIN') && <Link className={item} href="/owner"><Store aria-hidden className={icon} />My business</Link>}
                  {user.role === 'ADMIN' && <Link className={item} href="/admin"><LayoutDashboard aria-hidden className={icon} />Admin</Link>}
                  <Link className={item} href="/me/settings"><Settings aria-hidden className={icon} />Settings</Link>
                </div>
                <div className="border-t border-border pt-1.5"><button className={`${item} w-full`} onClick={() => void signOut()}><LogOut aria-hidden className={icon} />Log out</button></div>
              </div>
            </details>
          ) : (
            <><Link href="/login" className="btn-ghost btn-sm hidden sm:inline-flex">Log in</Link><Link href="/register" className="btn-primary btn-sm whitespace-nowrap">Sign up</Link></>
          )}
        </div>
      </div>
    </header>
  );
}
