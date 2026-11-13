import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ApiError, publicGet } from '@/lib/api';
import type { PlaceDetail, Review } from '@/lib/types';
import { groupHours, kwacha, priceLevelLabel, timeAgo } from '@/lib/format';
import { Stars } from '@/components/place-card';
import { ContactButtons, ContributeLinks, FavouriteButton, ViewTracker } from '@/components/place-actions';

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
      ) : <div className="flex h-40 items-center justify-center rounded-2xl bg-brand-soft text-5xl">🍽️</div>}

      <header className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-extrabold">{p.name}</h1>
            <p className="text-sm text-muted">{p.category} · {p.area}{p.address ? ` · ${p.address}` : ''}</p>
          </div>
          <FavouriteButton placeId={p.id} />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-bold text-brand">{priceLevelLabel(p.priceLevel)}</span>
          {p.avgSpendPpNgwee != null && <span>~{kwacha(p.avgSpendPpNgwee)} per person</span>}
          <Stars value={p.rating} count={p.ratingCount} />
          {p.openNow === true && <span className="font-medium text-brand">Open now</span>}
          {p.openNow === false && <span className="text-muted">Closed now</span>}
          {p.closedPermanently && <span className="chip border-danger text-danger">Permanently closed</span>}
        </div>
        <div className="flex flex-wrap gap-2">{p.tags.map((t) => <span key={t.slug} className="chip">{t.name}</span>)}</div>
        {p.description && <p className="text-sm">{p.description}</p>}
        <ContactButtons placeId={p.id} phone={p.phone} whatsapp={p.whatsapp} lat={p.lat} lng={p.lng} />
      </header>

      <section id="menu" className="card p-4">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">Menu & prices</h2>
          <span className="text-xs text-muted">Updated {timeAgo(p.menuUpdatedAt)}{p.menuAddedBy ? ` · added by ${p.menuAddedBy}` : ''}</span>
        </div>
        {p.menu.length === 0 ? <p className="text-sm text-muted">No menu yet. Be the first to add it!</p> : p.menu.map((s) => (
          <div key={s.id} className="mb-4 last:mb-0">
            <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-brand">{s.name}</h3>
            <ul className="divide-y divide-border">
              {s.items.map((i) => (
                <li key={i.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                  <span><span className="font-medium">{i.name}</span>{i.description && <span className="block text-xs text-muted">{i.description}</span>}</span>
                  <span className="shrink-0 font-semibold tabular-nums">{kwacha(i.priceNgwee)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {hours.some((h) => h.slots.length) && (
        <section className="card p-4">
          <h2 className="mb-2 text-lg font-bold">Opening hours</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">{hours.map((h) => <div key={h.day} className="contents"><dt className="font-medium">{h.day}</dt><dd className="text-muted">{h.slots.join(', ') || 'Closed'}</dd></div>)}</dl>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Reviews</h2>
        {reviews.length === 0 && <p className="text-sm text-muted">No reviews yet.</p>}
        {reviews.map((r) => (
          <div key={r.id} className="card space-y-1 p-4 text-sm">
            <div className="flex items-center justify-between"><strong>{r.author}</strong><span className="text-xs text-muted">{timeAgo(r.createdAt)}</span></div>
            <Stars value={r.rating} />
            {(r.amountPaidNgwee != null) && <p className="text-xs text-muted">Paid {kwacha(r.amountPaidNgwee)}{r.groupSize ? ` for ${r.groupSize}` : ''}{r.itemsOrdered ? ` · ${r.itemsOrdered}` : ''}</p>}
            {r.body && <p>{r.body}</p>}
            {r.images.length > 0 && <div className="flex gap-2 pt-1">{r.images.map((im, k) => /* eslint-disable-next-line @next/next/no-img-element */ <img key={k} src={im.thumb} alt="" loading="lazy" className="h-16 w-16 rounded-lg object-cover" />)}</div>}
            {r.ownerReply && <p className="rounded-lg bg-brand-soft p-2 text-xs"><strong>Owner reply:</strong> {r.ownerReply}</p>}
          </div>
        ))}
      </section>

      <ContributeLinks slug={p.slug} placeId={p.id} />
    </article>
  );
}
