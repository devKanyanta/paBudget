import type { Metadata } from 'next';
import { Tag, UtensilsCrossed } from 'lucide-react';
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

  return (
    <article className="space-y-5">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <ViewTracker placeId={p.id} />
      <MenuViewTracker placeId={p.id} />
      {p.images.length > 0 ? (
        <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {p.images.map((i, idx) => (
            <figure key={i.id} className="relative h-56 w-80 shrink-0 snap-start overflow-hidden rounded-2xl bg-brand-soft sm:h-72 sm:w-[28rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={idx === 0 ? i.medium : i.thumb} alt={`${p.name} photo ${idx + 1}`} loading={idx === 0 ? 'eager' : 'lazy'} className="h-full w-full object-cover" />
              {i.by && <figcaption className="absolute bottom-1 left-1 rounded bg-black/55 px-2 py-0.5 text-[11px] text-white">Photo by {i.by}</figcaption>}
            </figure>
          ))}
        </div>
      ) : <div className="flex h-40 items-center justify-center rounded-2xl bg-sunken text-faint"><UtensilsCrossed aria-hidden className="size-10" /></div>}

      <header className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-extrabold">{p.name}</h1>
            <p className="text-sm text-muted">{p.category} · {p.area}{p.address ? ` · ${p.address}` : ''}</p>
          </div>
          <FavouriteButton placeId={p.id} />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {p.avgSpendPpNgwee != null && <span className="num"><strong className="text-xl font-bold tracking-tight">{kwacha(p.avgSpendPpNgwee)}</strong> <span className="text-muted">per person</span></span>}
          <Stars value={p.rating} count={p.ratingCount} />
          {p.openNow === true && <span className="font-medium text-brand">Open now</span>}
          {p.openNow === false && <span className="text-muted">Closed now</span>}
          {p.closedPermanently && <span className="chip border-danger text-danger">Permanently closed</span>}
        </div>
        <div className="flex flex-wrap gap-2">{p.tags.map((t) => <span key={t.slug} className="chip">{t.name}</span>)}</div>
        {p.description && <p className="text-sm">{p.description}</p>}
        <ContactButtons placeId={p.id} phone={p.phone} whatsapp={p.whatsapp} lat={p.lat} lng={p.lng} />
      </header>

      {p.deals && p.deals.length > 0 && (
        <section className="space-y-2" aria-label="Deals">
          {p.deals.map((d) => <div key={d.id} className="flex items-start gap-2.5 rounded-2xl bg-accent/10 p-3.5 text-sm"><Tag aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" /><div><strong>{d.title}</strong> · {kwacha(d.priceNgwee)}<span className="block text-xs text-muted">Until {new Date(d.endsAt).toLocaleDateString()}</span></div></div>)}
        </section>
      )}

      <section id="menu" className="card p-5">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">Menu & prices</h2>
          <span className="text-xs text-muted">Updated {timeAgo(p.menuUpdatedAt)}{p.menuAddedBy ? ` · added by ${p.menuAddedBy}` : ''}</span>
        </div>
        {p.menu.length === 0 ? <p className="text-sm text-muted">No menu yet. Be the first to add it!</p> : p.menu.map((s) => (
          <div key={s.id} className="mb-4 last:mb-0">
            <h3 className="mb-1 text-sm font-semibold text-brand">{s.name}</h3>
            <ul className="divide-y divide-border">
              {s.items.map((i) => (
                <li key={i.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                  <span><span className="font-medium">{i.name}</span>{i.description && <span className="block text-xs text-muted">{i.description}</span>}</span>
                  <span className="num shrink-0 font-semibold">{kwacha(i.priceNgwee)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {hours.some((h) => h.slots.length) && (
        <section className="card p-5">
          <h2 className="mb-3 text-lg font-bold">Opening hours</h2>
          {new Set(hours.map((h) => h.slots.join())).size === 1 ? <p className="text-sm"><span className="font-medium">Every day</span> <span className="text-muted">{hours[0].slots.join(', ')}</span></p> : <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">{hours.map((h) => <div key={h.day} className="contents"><dt className="font-medium">{h.day}</dt><dd className="text-muted">{h.slots.join(', ') || 'Closed'}</dd></div>)}</dl>}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Reviews</h2>
        {reviews.length === 0 && <p className="text-sm text-muted">No reviews yet.</p>}
        {reviews.map((r) => (
          <div key={r.id} className="card space-y-1.5 p-5 text-sm">
            <div className="flex items-center justify-between"><strong>{r.author}</strong><span className="text-xs text-muted">{timeAgo(r.createdAt)}</span></div>
            <Stars value={r.rating} />
            {(r.amountPaidNgwee != null) && <p className="text-xs text-muted">Paid {kwacha(r.amountPaidNgwee)}{r.groupSize ? ` for ${r.groupSize}` : ''}{r.itemsOrdered ? ` · ${r.itemsOrdered}` : ''}</p>}
            {r.body && <p>{r.body}</p>}
            {r.images.length > 0 && <div className="flex gap-2 pt-1">{r.images.map((im, k) => /* eslint-disable-next-line @next/next/no-img-element */ <img key={k} src={im.thumb} alt="" loading="lazy" className="h-16 w-16 rounded-lg object-cover" />)}</div>}
            {r.ownerReply && <p className="rounded-xl bg-sunken p-3 text-xs"><strong>Owner reply:</strong> {r.ownerReply}</p>}
          </div>
        ))}
      </section>

      <ContributeLinks slug={p.slug} placeId={p.id} />
    </article>
  );
}
