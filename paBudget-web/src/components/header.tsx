'use client';
import Link from 'next/link';
import { useAuth } from './providers';

export function Header() {
  const { user, loading, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-brand">pa<span className="text-foreground">Budget</span></Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link href="/places" className="rounded-lg px-3 py-1.5 hover:bg-brand-soft">Explore</Link>
          {user && <Link href="/contribute/place" className="rounded-lg px-3 py-1.5 hover:bg-brand-soft">Add place</Link>}
          {user?.role === 'ADMIN' && <Link href="/admin" className="rounded-lg px-3 py-1.5 hover:bg-brand-soft">Admin</Link>}
          {loading ? null : user ? (
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-lg px-3 py-1.5 hover:bg-brand-soft">{user.name.split(' ')[0]} ▾</summary>
              <div className="card absolute right-0 mt-1 w-48 p-1 shadow-lg">
                <Link className="block rounded-lg px-3 py-2 hover:bg-brand-soft" href="/me/favourites">Favourites</Link>
                <Link className="block rounded-lg px-3 py-2 hover:bg-brand-soft" href="/me/contributions">My contributions</Link>
                <Link className="block rounded-lg px-3 py-2 hover:bg-brand-soft" href="/me/settings">Settings</Link>
                <button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-brand-soft" onClick={() => void signOut()}>Log out</button>
              </div>
            </details>
          ) : (
            <Link href="/login" className="btn-primary !py-1.5">Log in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
