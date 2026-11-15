'use client';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useAuth } from './providers';

const nav = 'rounded-lg px-3 py-1.5 text-ink-2 transition hover:bg-sunken';

export function Header() {
  const { user, loading, signOut } = useAuth();
  const item = 'block rounded-lg px-3 py-2 text-ink-2 hover:bg-sunken';
  return (
    <header className="sticky top-0 z-30 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3.5">
        <Link href="/" className="text-lg font-extrabold tracking-tight">pa<span className="text-brand">Budget</span></Link>
        <nav className="flex items-center gap-0.5 text-sm font-medium">
          <Link href="/places" className={nav}>Explore</Link>
          <Link href="/planner" className={nav}>Planner</Link>
          {user && <Link href="/contribute/place" className={`${nav} hidden sm:block`}>Add place</Link>}
          {user?.role === 'ADMIN' && <Link href="/admin" className={nav}>Admin</Link>}
          {loading ? null : user ? (
            <details className="relative">
              <summary className={`${nav} flex cursor-pointer list-none items-center gap-1`}>{user.name.split(' ')[0]}<ChevronDown aria-hidden className="size-3.5 text-faint" /></summary>
              <div className="absolute right-0 mt-1 w-52 rounded-2xl bg-surface p-1.5 text-sm shadow-pop ring-1 ring-border">
                <Link className={item} href="/me/favourites">Favourites</Link>
                <Link className={item} href="/me/plans">Saved plans</Link>
                <Link className={item} href="/me/contributions">My contributions</Link>
                <Link className={item} href="/leaderboard">Leaderboard</Link>
                {(user.role === 'OWNER' || user.role === 'ADMIN') && <Link className={item} href="/owner">My business</Link>}
                <Link className={item} href="/me/settings">Settings</Link>
                <button className={`${item} w-full text-left`} onClick={() => void signOut()}>Log out</button>
              </div>
            </details>
          ) : (
            <Link href="/login" className="btn-primary ml-1 !py-1.5">Log in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
