import Link from 'next/link';
import { ArrowRight, BadgeCheck, Beer, Check, Coffee, IceCreamCone, MapPin, Plus, ReceiptText, Search, Sandwich, ShieldCheck, Ticket, UtensilsCrossed, Wallet } from 'lucide-react';
import { publicGet } from '@/lib/api';
import type { Meta, PlaceList } from '@/lib/types';
import { PlaceCard } from '@/components/place-card';
import { MockBill, MockBudget, MockMenu } from '@/components/landing-mocks';
import { Reveal } from '@/components/reveal';
import { AnimatedStats } from '@/components/animated-stats';
import { PlannerDemo } from '@/components/demo/planner-demo';

export const dynamic = 'force-dynamic';

const BUDGETS = [100, 200, 300, 500];
const CATS: Record<string, { icon: typeof Coffee; tone: string }> = {
  cafe: { icon: Coffee, tone: 'bg-sand text-accent' },
  restaurant: { icon: UtensilsCrossed, tone: 'bg-mint text-brand' },
  lounge: { icon: Beer, tone: 'bg-sand text-accent' },
  'fast-food': { icon: Sandwich, tone: 'bg-sand text-accent' },
  activity: { icon: Ticket, tone: 'bg-mint text-brand' },
  dessert: { icon: IceCreamCone, tone: 'bg-sand text-accent' },
};

function Title({ eyebrow, children, sub, action }: { eyebrow?: string; children: React.ReactNode; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{children}</h2>
        {sub && <p className="mt-2 max-w-xl text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
const SeeAll = ({ href }: { href: string }) => <Link href={href} className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-brand hover:underline sm:inline-flex">See all <ArrowRight aria-hidden className="size-4" /></Link>;

const FEATURES = [
  { icon: Wallet, title: 'Start with what you can spend', body: 'Set a budget per person or for the whole group. paBudget filters out everything that would blow it, before you ever leave the house.', mock: <MockBudget /> },
  { icon: ShieldCheck, title: 'Prices you can trust', body: 'Menus are photographed and confirmed by people who actually went, and checked before they go public. Every price shows when it was last confirmed.', mock: <MockMenu /> },
  { icon: ReceiptText, title: 'See the bill before you go', body: 'The planner builds a realistic order from real menu prices and shows your total, so the only surprise at the table is how good the food is.', mock: <MockBill /> },
];

export default async function Home() {
  const [meta, cheap, top] = await Promise.all([
    publicGet<Meta>('/meta', 300),
    publicGet<PlaceList>('/places?sort=cheapest&limit=4'),
    publicGet<PlaceList>('/places?limit=6'),
  ]).catch(() => [null, null, null] as const);

  return (
    <div className="space-y-24 pb-8">
      {/* HERO */}
      <section className="full-bleed relative -mt-6 overflow-hidden border-b border-border bg-gradient-to-b from-brand-soft/70 to-background">
        <div aria-hidden className="grid-bg absolute inset-0" />
        <div aria-hidden className="blob left-[-6%] top-[8%] size-[26rem] bg-brand/40" />
        <div aria-hidden className="blob blob-2 right-[-4%] top-[-8%] size-[30rem] bg-copper-light/40" />
        <div aria-hidden className="blob blob-3 bottom-[-18%] left-[38%] size-[24rem] bg-mint" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1fr_540px] md:py-20">
          <div className="space-y-7">
            <p className="inline-flex items-center gap-2 rounded-full bg-surface py-1 pl-1 pr-3.5 text-xs font-semibold text-ink-2 shadow-card"><span className="rounded-full bg-accent px-2 py-0.5 text-white">New</span>Budget planner for Lusaka outings</p>
            <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl">Know the bill <span className="text-accent">before</span> <span className="text-brand">you go.</span></h1>
            <p className="max-w-lg text-lg leading-relaxed text-muted">Real menus and prices from Lusaka restaurants, cafes and outings, shared and confirmed by the people who eat there.</p>
            <form action="/places" className="flex max-w-lg gap-2 rounded-xl bg-surface p-1.5 shadow-pop ring-1 ring-border">
              <label className="relative flex-1">
                <span className="sr-only">Search</span>
                <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
                <input name="q" className="w-full rounded-lg bg-transparent py-3 pl-10 pr-3 text-sm outline-none placeholder:text-faint" placeholder="Search a place, dish or area" />
              </label>
              <button className="btn-primary !px-6">Search</button>
            </form>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">Per person, under</span>
              {BUDGETS.map((b) => <Link key={b} href={`/places?maxPp=${b * 100}&sort=cheapest`} className="chip num">K{b}</Link>)}
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-1 text-sm text-ink-2">
              {['Free to use', 'Community-verified prices', 'No sign-up to browse'].map((t) => <li key={t} className="inline-flex items-center gap-1.5"><BadgeCheck aria-hidden className="size-4 text-brand" />{t}</li>)}
            </ul>
          </div>
          <div className="relative hidden sm:block">
            <PlannerDemo />
            <div className="bob-slow absolute -right-3 -top-6 hidden items-center gap-2.5 rounded-xl bg-surface p-3 pr-4 shadow-pop ring-1 ring-border md:flex">
              <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand"><Check aria-hidden className="size-5" /></span>
              <div><p className="text-sm font-semibold">K80 under budget</p><p className="text-xs text-muted">3 places match</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      {meta && top && (
        <Reveal as="section" className="-mt-12">
          <AnimatedStats items={[[top.total, 'Places listed'], [meta.areas.length, 'Areas across Lusaka'], [meta.categories.length, 'Kinds of outing']]} />
        </Reveal>
      )}

      {/* HOW IT WORKS */}
      <section className="space-y-14">
        <Reveal className="mx-auto max-w-2xl text-center"><p className="eyebrow mb-2">How it works</p><h2 className="text-3xl font-bold tracking-tight">Plan an outing in three steps</h2><p className="mt-3 text-muted">No more guessing, no more awkward bill splitting.</p></Reveal>
        {FEATURES.map((f, i) => (
          <div key={f.title} className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
            <Reveal className={i % 2 ? 'md:order-2' : ''}>
              <span className="float-y flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand"><f.icon aria-hidden className="size-5" /></span>
              <p className="mt-4 text-xs font-bold text-faint">STEP 0{i + 1}</p>
              <h3 className="mt-1 text-2xl font-bold tracking-tight">{f.title}</h3>
              <p className="mt-3 leading-relaxed text-muted">{f.body}</p>
            </Reveal>
            <Reveal delay={120} className={i % 2 ? 'md:order-1' : ''}>
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-mint/60 to-sand/50 p-6 sm:p-10">
                <div aria-hidden className="blob blob-light -right-10 -top-10 size-48 bg-brand/30" style={{ animationDelay: `${-i * 5}s` }} />
                <div aria-hidden className="blob blob-2 blob-light -bottom-12 -left-10 size-44 bg-copper-light/40" />
                <div className="relative mx-auto max-w-sm">{f.mock}</div>
              </div>
            </Reveal>
          </div>
        ))}
      </section>

      {!meta ? <p className="card p-4 text-sm text-muted">Can’t reach the server right now. Please try again shortly.</p> : (
        <>
          <Reveal as="section" className="space-y-6">
            <Title eyebrow="Browse" sub="Pick a kind of outing, or jump straight to your neighbourhood.">What are you in the mood for?</Title>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {meta.categories.slice(0, 5).map((c) => { const k = CATS[c.slug] ?? { icon: UtensilsCrossed, tone: 'bg-mint text-brand' }; const Icon = k.icon; return (
                <Link key={c.id} href={`/places?category=${c.slug}`} className="card wiggle-on-hover group flex flex-col items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-pop">
                  <span className={`flex size-12 items-center justify-center rounded-xl ${k.tone}`}><Icon aria-hidden className="wiggle size-6" /></span>
                  <span className="flex w-full items-center justify-between font-semibold">{c.name}<ArrowRight aria-hidden className="size-4 text-faint transition group-hover:translate-x-0.5 group-hover:text-brand" /></span>
                </Link>); })}
            </div>
            <div className="marquee" aria-label="Browse by area">
              <ul className="marquee-track">
                {[0, 1].map((copy) => meta.areas.map((a) => (
                  <li key={`${copy}-${a.id}`} aria-hidden={copy === 1 || undefined}><Link href={`/places?area=${a.slug}`} tabIndex={copy === 1 ? -1 : undefined} className="chip !px-4 !py-2 !text-sm"><MapPin aria-hidden className="size-3.5 text-faint" />{a.name}</Link></li>
                )))}
              </ul>
            </div>
          </Reveal>

          {cheap && cheap.items.length > 0 && (
            <Reveal as="section" className="space-y-6"><Title eyebrow="Budget picks" sub="Great places that won’t stretch your wallet." action={<SeeAll href="/places?sort=cheapest" />}>Easy on the pocket</Title><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{cheap.items.map((p, i) => <Reveal key={p.id} delay={i * 90}><PlaceCard p={p} /></Reveal>)}</div></Reveal>
          )}
          {top && top.items.length > 0 && (
            <Reveal as="section" className="space-y-6"><Title eyebrow="Popular" sub="The places people rate highest." action={<SeeAll href="/places" />}>Top rated</Title><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{top.items.map((p, i) => <Reveal key={p.id} delay={(i % 3) * 90}><PlaceCard p={p} /></Reveal>)}</div></Reveal>
          )}
        </>
      )}

      {/* CTA */}
      <section className="relative overflow-hidden rounded-3xl bg-brand-ground px-6 py-14 text-center text-white sm:px-14">
        <div aria-hidden className="dots-bg absolute inset-0 opacity-50" />
        <div aria-hidden className="blob -right-16 -top-24 size-80 bg-brand" style={{ opacity: 0.55 }} />
        <div aria-hidden className="blob blob-2 -bottom-28 -left-10 size-72 bg-copper-light" style={{ opacity: 0.28 }} />
        <div aria-hidden className="blob blob-3 left-[40%] top-[30%] size-56 bg-mint" style={{ opacity: 0.12 }} />
        <Reveal className="relative mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to plan your next outing?</h2>
          <p className="mt-3 text-lg text-white/80">Tell the planner your budget and group size. It does the maths.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/planner" className="btn-accent btn !px-6 !py-3 !text-white">Plan my outing <ArrowRight aria-hidden className="nudge-x size-4" /></Link>
            <Link href="/contribute/place" className="btn !px-6 !py-3 text-white ring-1 ring-white/40 hover:bg-white/10"><Plus aria-hidden className="size-4" />Add a missing place</Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
