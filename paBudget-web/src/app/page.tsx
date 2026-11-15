import Link from 'next/link';
import { ArrowRight, MapPin, Search, ReceiptText, Plus } from 'lucide-react';
import { publicGet } from '@/lib/api';
import type { Meta, PlaceList } from '@/lib/types';
import { PlaceCard } from '@/components/place-card';
import { PlannerDemo } from '@/components/demo/planner-demo';

export const dynamic = 'force-dynamic';

const BUDGETS = [100, 200, 300, 500];

export default async function Home() {
  const [meta, cheap, top] = await Promise.all([
    publicGet<Meta>('/meta', 300),
    publicGet<PlaceList>('/places?sort=cheapest&limit=4'),
    publicGet<PlaceList>('/places?limit=6'),
  ]).catch(() => [null, null, null] as const);

  return (
    <div className="space-y-14">
      <section className="grid items-center gap-8 pt-4 md:grid-cols-[1fr_540px] md:gap-6 md:pt-8">
        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">Know the bill<br />before you go.</h1>
            <p className="max-w-md text-base text-muted">Real menus and prices from Lusaka restaurants, cafes and outings, shared by the people who eat there.</p>
          </div>
          <form action="/places" className="flex max-w-md gap-2">
            <label className="relative flex-1">
              <span className="sr-only">Search</span>
              <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <input name="q" className="input !pl-10" placeholder="Place, dish or area" />
            </label>
            <button className="btn-primary">Search</button>
          </form>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">Per person, under</span>
            {BUDGETS.map((b) => <Link key={b} href={`/places?maxPp=${b * 100}&sort=cheapest`} className="chip num">K{b}</Link>)}
          </div>
        </div>
        <PlannerDemo />
      </section>

      {!meta ? <p className="card p-4 text-sm text-muted">Can’t reach the server right now. Please try again shortly.</p> : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-bold">Browse by area</h2>
            <div className="flex flex-wrap gap-2">{meta.areas.map((a) => <Link key={a.id} href={`/places?area=${a.slug}`} className="chip"><MapPin aria-hidden className="size-3.5 text-faint" />{a.name}</Link>)}</div>
          </section>
          {cheap && cheap.items.length > 0 && (
            <section className="space-y-4"><h2 className="text-lg font-bold">Easy on the pocket</h2><div className="grid gap-4 sm:grid-cols-2">{cheap.items.map((p) => <PlaceCard key={p.id} p={p} />)}</div></section>
          )}
          {top && top.items.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Top rated</h2><Link href="/places" className="inline-flex items-center gap-1 text-sm font-medium text-brand">See all <ArrowRight aria-hidden className="size-4" /></Link></div>
              <div className="grid gap-4 sm:grid-cols-2">{top.items.map((p) => <PlaceCard key={p.id} p={p} />)}</div>
            </section>
          )}
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="card flex flex-col items-start gap-3 p-6">
              <ReceiptText aria-hidden className="size-5 text-brand" />
              <h2 className="text-lg font-bold">Not sure where to go?</h2>
              <p className="text-sm text-muted">Give the planner a budget and a group size. It suggests places and builds the bill from real menu prices.</p>
              <Link href="/planner" className="btn-primary mt-auto">Plan my outing</Link>
            </div>
            <div className="card flex flex-col items-start gap-3 p-6">
              <Plus aria-hidden className="size-5 text-brand" />
              <h2 className="text-lg font-bold">Know a place that’s missing?</h2>
              <p className="text-sm text-muted">Add it with a photo of the menu and earn points. Everything is checked before it goes public.</p>
              <Link href="/contribute/place" className="btn-outline mt-auto">Add a place</Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
