import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Clock, MapPin, Tag, UtensilsCrossed } from 'lucide-react';
import { notFound } from 'next/navigation';
import { ApiError, publicGet } from '@/lib/api';
import type { PlaceDetail, Review } from '@/lib/types';
import { groupHours, kwacha, priceLevelLabel, timeAgo } from '@/lib/format';
import { Stars } from '@/components/place-card';
import { ContactButtons, ContributeLinks, FavouriteButton, MenuViewTracker, ViewTracker } from '@/components/place-actions';

export const dynamic = 'force-dynamic';

async function load(slug: string) {
  try { return await publicGet<PlaceDetail>(`/places/${encodeURIComponent(slug)}`, 30); }
  catch (e) { if (e instanceof ApiError && e.status === 404) notFound(); throw e; }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await load(slug);
  const title = `${p.name} — menu & prices, ${p.area}`;
  const description = p.avgSpendPpNgwee ? `${p.category} in ${p.area}. About ${kwacha(p.avgSpendPpNgwee)} per person. See the menu, photos and reviews.` : `${p.category} in ${p.area}. Photos, hours and reviews.`;
  return { title, description, openGraph: { title, description, images: p.images[0] ? [p.images[0].medium] : undefined }, alternates: { canonical: `/places/${p.slug}` } };
}

export default async function PlacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await load(slug);
  const reviews = await publicGet<Review[]>(`/places/${p.id}/reviews?limit=20`, 30).catch(() => []);
  const hours = groupHours(p.hours);
  const jsonLd = {
    '@context': 'https://schema.org', '@type': p.category === 'Cafe' ? 'CafeOrCoffeeShop' : 'Restaurant', name: p.name,
    address: p.address ?? p.area, telephone: p.phone ?? undefined, image: p.images.map((i) => i.medium),
    geo: { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lng }, priceRange: priceLevelLabel(p.priceLevel),
    ...(p.rating ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.ratingCount } } : {}),
  };

  const spots = p.images.length;
  const ratingBars = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => Math.round(r.rating) === n).length }));
  return (
    <article className="space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <ViewTracker placeId={p.id} />
      <MenuViewTracker placeId={p.id} />

      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted">
        <Link href="/places" className="hover:text-brand">Explore</Link><ChevronRight aria-hidden className="size-3.5" />
        <Link href={`/places?area=${p.areaSlug}`} className="hover:text-brand">{p.area}</Link><ChevronRight aria-hidden className="size-3.5" />
        <span className="truncate text-foreground">{p.name}</span>
      </nav>

      {spots > 0 ? (
        <div className={`grid gap-2 overflow-hidden rounded-2xl md:h-[26rem] ${spots > 1 ? 'md:grid-cols-[2fr_1fr] md:grid-rows-2' : ''}`}>
          {p.images.slice(0, 3).map((i, idx) => (
            <figure key={i.id} className={`relative overflow-hidden bg-sunken ${idx === 0 ? `aspect-[16/10] ${spots > 1 ? 'md:row-span-2 md:aspect-auto' : 'md:aspect-auto'}` : `hidden aspect-[16/10] md:block md:aspect-auto ${spots === 2 ? 'md:row-span-2' : ''}`}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={idx === 0 ? i.medium : i.thumb} alt={`${p.name} photo ${idx + 1}`} loading={idx === 0 ? 'eager' : 'lazy'} className="size-full object-cover" />
              {i.by && idx === 0 && <figcaption className="absolute bottom-2 left-2 rounded-md bg-black/55 px-2 py-0.5 text-[11px] text-white">Photo by {i.by}</figcaption>}
            </figure>
          ))}
        </div>
      ) : <div className="flex h-48 items-center justify-center rounded-2xl bg-sunken text-faint"><UtensilsCrossed aria-hidden className="size-10" /></div>}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-gray">{p.category}</span>
            {p.openNow === true && <span className="badge badge-green">Open now</span>}
            {p.openNow === false && <span className="badge badge-gray">Closed now</span>}
            {p.closedPermanently && <span className="badge badge-red">Permanently closed</span>}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{p.name}</h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1"><MapPin aria-hidden className="size-4" />{p.address ?? p.area}</span>
            <Stars value={p.rating} count={p.ratingCount} />
          </p>
        </div>
        <FavouriteButton placeId={p.id} />
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {(p.description || p.tags.length > 0) && (
            <section className="card space-y-3 p-5">
              {p.description && <p className="leading-relaxed text-ink-2">{p.description}</p>}
              {p.tags.length > 0 && <div className="flex flex-wrap gap-2">{p.tags.map((t) => <span key={t.slug} className="badge badge-gray">{t.name}</span>)}</div>}
            </section>
          )}

          {p.deals && p.deals.length > 0 && (
            <section className="space-y-2" aria-label="Deals">
              {p.deals.map((d) => <div key={d.id} className="flex items-start gap-3 rounded-xl border border-accent/25 bg-accent-soft p-4 text-sm"><Tag aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" /><div><strong>{d.title}</strong> · {kwacha(d.priceNgwee)}<span className="block text-xs text-muted">Until {new Date(d.endsAt).toLocaleDateString()}</span></div></div>)}
            </section>
          )}

          <section id="menu" className="card scroll-mt-20 p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-semibold">Menu & prices</h2>
              <span className="text-xs text-muted">Updated {timeAgo(p.menuUpdatedAt)}{p.menuAddedBy ? ` · added by ${p.menuAddedBy}` : ''}</span>
            </div>
            {p.menu.length === 0 ? (
              <div className="rounded-lg bg-sunken p-6 text-center"><p className="font-medium">No menu yet</p><p className="mt-1 text-sm text-muted">Be the first to add it and earn points.</p><Link href={`/contribute/${p.slug}/menu`} className="btn-primary btn-sm mt-3">Add the menu</Link></div>
            ) : (<>
              {p.menu.length > 1 && <div className="mb-4 flex flex-wrap gap-2">{p.menu.map((s) => <a key={s.id} href={`#sec-${s.id}`} className="chip">{s.name}</a>)}</div>}
              {p.menu.map((s) => (
                <div key={s.id} id={`sec-${s.id}`} className="mb-6 scroll-mt-20 last:mb-0">
                  <h3 className="mb-1 border-b border-border pb-2 text-xs font-semibold uppercase tracking-wider text-brand">{s.name}</h3>
                  <ul className="divide-y divide-border">
                    {s.items.map((i) => (
                      <li key={i.id} className="flex items-baseline justify-between gap-4 py-3 text-sm">
                        <span><span className="font-medium">{i.name}</span>{i.description && <span className="mt-0.5 block text-xs text-muted">{i.description}</span>}</span>
                        <span className="num shrink-0 font-semibold">{kwacha(i.priceNgwee)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>)}
          </section>

          <section className="space-y-4" id="reviews">
            <div className="flex items-end justify-between"><h2 className="text-xl font-semibold">Reviews {reviews.length > 0 && <span className="text-base font-normal text-muted">({reviews.length})</span>}</h2><Link href={`/contribute/${p.slug}/review`} className="btn-outline btn-sm">Write a review</Link></div>
            {reviews.length > 0 && p.rating != null && (
              <div className="card flex flex-wrap items-center gap-6 p-5">
                <div className="text-center"><div className="num text-4xl font-bold">{p.rating.toFixed(1)}</div><Stars value={p.rating} /><p className="mt-1 text-xs text-muted">{p.ratingCount} ratings</p></div>
                <div className="min-w-48 flex-1 space-y-1.5">{ratingBars.map((b) => <div key={b.n} className="flex items-center gap-2 text-xs"><span className="w-3 text-muted">{b.n}</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken"><div className="h-full rounded-full bg-accent" style={{ width: `${(b.c / reviews.length) * 100}%` }} /></div></div>)}</div>
              </div>
            )}
            {reviews.length === 0 && <div className="card p-6 text-center text-sm text-muted">No reviews yet. Been here? Share what it cost and how it was.</div>}
            {reviews.map((r) => (
              <div key={r.id} className="card space-y-2 p-5 text-sm">
                <div className="flex items-center gap-3">
                  <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">{r.author.charAt(0).toUpperCase()}</span>
                  <div className="flex-1"><strong className="block">{r.author}</strong><span className="text-xs text-muted">{timeAgo(r.createdAt)}</span></div>
                  <Stars value={r.rating} />
                </div>
                {(r.amountPaidNgwee != null) && <p className="inline-flex rounded-md bg-sunken px-2 py-1 text-xs text-ink-2">Paid {kwacha(r.amountPaidNgwee)}{r.groupSize ? ` for ${r.groupSize}` : ''}{r.itemsOrdered ? ` · ${r.itemsOrdered}` : ''}</p>}
                {r.body && <p className="leading-relaxed text-ink-2">{r.body}</p>}
                {r.images.length > 0 && <div className="flex gap-2 pt-1">{r.images.map((im, k) => /* eslint-disable-next-line @next/next/no-img-element */ <img key={k} src={im.thumb} alt="" loading="lazy" className="size-16 rounded-lg object-cover" />)}</div>}
                {r.ownerReply && <p className="rounded-lg border-l-2 border-brand bg-sunken p-3 text-xs"><strong>Owner reply:</strong> {r.ownerReply}</p>}
              </div>
            ))}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <div className="card space-y-4 p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted">Typical spend</p>
              {p.avgSpendPpNgwee != null ? <p className="num mt-1"><span className="text-3xl font-bold tracking-tight">{kwacha(p.avgSpendPpNgwee)}</span> <span className="text-sm text-muted">per person</span></p> : <p className="mt-1 text-sm text-muted">Add a menu to see the estimate.</p>}
            </div>
            <ContactButtons placeId={p.id} phone={p.phone} whatsapp={p.whatsapp} lat={p.lat} lng={p.lng} />
          </div>
          {hours.some((h) => h.slots.length) && (
            <div className="card p-5">
              <h2 className="mb-3 flex items-center gap-2 font-semibold"><Clock aria-hidden className="size-4 text-faint" />Opening hours</h2>
              {new Set(hours.map((h) => h.slots.join())).size === 1 ? <p className="text-sm"><span className="font-medium">Every day</span> <span className="text-muted">{hours[0].slots.join(', ')}</span></p> : <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">{hours.map((h) => <div key={h.day} className="contents"><dt className="font-medium">{h.day}</dt><dd className="text-muted">{h.slots.join(', ') || 'Closed'}</dd></div>)}</dl>}
            </div>
          )}
          <ContributeLinks slug={p.slug} placeId={p.id} />
        </aside>
      </div>
    </article>
  );
}
