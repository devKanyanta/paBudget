import Link from 'next/link';
import { publicGet } from '@/lib/api';
import type { Meta, PlaceList } from '@/lib/types';
import { PlaceCard } from '@/components/place-card';

export const dynamic = 'force-dynamic';

const BUDGETS = [100, 200, 300, 500];

export default async function Home() {
  const [meta, cheap, top] = await Promise.all([
    publicGet<Meta>('/meta', 300),
    publicGet<PlaceList>('/places?sort=cheapest&limit=4'),
    publicGet<PlaceList>('/places?limit=6'),
  ]).catch(() => [null, null, null] as const);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-brand px-5 py-8 text-white">
        <h1 className="text-3xl font-extrabold leading-tight">Know the bill<br />before you go.</h1>
        <p className="mt-2 max-w-md text-sm text-white/85">Real menus and prices from Lusaka restaurants, cafes and outings — shared by people like you.</p>
        <form action="/places" className="mt-5 flex gap-2">
          <input name="q" className="input !border-transparent text-foreground" placeholder="Search place, dish or area" />
          <button className="btn bg-accent text-black hover:brightness-95">Search</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="opacity-80">Budget per person:</span>
          {BUDGETS.map((b) => <Link key={b} href={`/places?maxPp=${b * 100}&sort=cheapest`} className="rounded-full bg-white/15 px-3 py-1 font-semibold hover:bg-white/25">under K{b}</Link>)}
        </div>
      </section>

      {!meta ? <p className="card p-4 text-sm text-muted">Can’t reach the server right now. Please try again shortly.</p> : (
        <>
          <section>
            <h2 className="mb-3 text-lg font-bold">Browse by area</h2>
            <div className="flex flex-wrap gap-2">{meta.areas.map((a) => <Link key={a.id} href={`/places?area=${a.slug}`} className="chip hover:border-brand">{a.name}</Link>)}</div>
          </section>
          {cheap && cheap.items.length > 0 && (
            <section><h2 className="mb-3 text-lg font-bold">Easy on the pocket</h2><div className="grid gap-3 sm:grid-cols-2">{cheap.items.map((p) => <PlaceCard key={p.id} p={p} />)}</div></section>
          )}
          {top && top.items.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Top rated</h2><Link href="/places" className="text-sm font-medium text-brand">See all →</Link></div>
              <div className="grid gap-3 sm:grid-cols-2">{top.items.map((p) => <PlaceCard key={p.id} p={p} />)}</div>
            </section>
          )}
          <section className="card flex flex-col items-start gap-2 p-5">
            <h2 className="text-lg font-bold">Know a place that’s missing?</h2>
            <p className="text-sm text-muted">Add it with a photo of the menu and earn points. Everything is checked before it goes public.</p>
            <Link href="/contribute/place" className="btn-primary">Add a place</Link>
          </section>
        </>
      )}
    </div>
  );
}
