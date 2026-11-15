import Link from 'next/link';
import { Star, UtensilsCrossed } from 'lucide-react';
import type { PlaceSummary } from '@/lib/types';
import { formatDistance, kwacha } from '@/lib/format';

export function Stars({ value, count }: { value: number | null; count?: number }) {
  if (value == null) return <span className="text-xs text-muted">No reviews yet</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium">
      <Star aria-hidden className="size-3.5 fill-accent text-accent" />{value.toFixed(1)}{count != null && <span className="font-normal text-muted">({count})</span>}
    </span>
  );
}

export function PlaceCard({ p }: { p: PlaceSummary }) {
  const dist = formatDistance(p.distanceM);
  return (
    <Link href={`/places/${p.slug}`} className="card group flex gap-4 p-3 transition hover:-translate-y-px hover:shadow-pop">
      <div className="size-24 shrink-0 overflow-hidden rounded-xl bg-sunken">
        {p.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.thumb} alt={p.name} loading="lazy" className="size-full object-cover" />
        ) : <div className="flex size-full items-center justify-center text-faint"><UtensilsCrossed aria-hidden className="size-7" /></div>}
      </div>
      <div className="flex min-w-0 flex-1 flex-col py-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-semibold">{p.name}</h3>
          {p.isFeatured && <span className="chip-active shrink-0">Featured</span>}
        </div>
        <p className="truncate text-xs text-muted">{p.category} · {p.area}{dist ? ` · ${dist}` : ''}</p>
        <div className="mt-auto space-y-1">
          <p className="num flex items-baseline gap-1.5">
            <span className="text-lg font-bold leading-none tracking-tight">{p.avgSpendPpNgwee != null ? kwacha(p.avgSpendPpNgwee) : '—'}</span>
            <span className="text-xs text-muted">{p.avgSpendPpNgwee != null ? 'per person' : 'Menu needed'}</span>
          </p>
          <div className="flex items-center gap-3">
            <Stars value={p.rating} count={p.ratingCount} />
            {p.openNow === true && <span className="text-xs font-medium text-brand">Open now</span>}
            {p.openNow === false && <span className="text-xs text-muted">Closed</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}
