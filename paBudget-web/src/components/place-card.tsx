import Link from 'next/link';
import type { PlaceSummary } from '@/lib/types';
import { formatDistance, kwacha, priceLevelLabel } from '@/lib/format';

export function Stars({ value, count }: { value: number | null; count?: number }) {
  if (value == null) return <span className="text-xs text-muted">No reviews yet</span>;
  return <span className="text-xs"><span className="text-accent">★</span> {value.toFixed(1)}{count != null && <span className="text-muted"> ({count})</span>}</span>;
}

export function PlaceCard({ p }: { p: PlaceSummary }) {
  const dist = formatDistance(p.distanceM);
  return (
    <Link href={`/places/${p.slug}`} className="card flex gap-3 overflow-hidden p-2 transition hover:border-brand">
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-brand-soft">
        {p.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.thumb} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
        ) : <div className="flex h-full items-center justify-center text-3xl">🍽️</div>}
      </div>
      <div className="min-w-0 flex-1 py-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-semibold">{p.name}</h3>
          {p.isFeatured && <span className="chip chip-active shrink-0">Featured</span>}
        </div>
        <p className="truncate text-xs text-muted">{p.category} · {p.area}{dist ? ` · ${dist}` : ''}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm font-bold text-brand">{priceLevelLabel(p.priceLevel)}</span>
          <span className="text-sm">{p.avgSpendPpNgwee != null ? `~${kwacha(p.avgSpendPpNgwee)} pp` : 'Menu needed'}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <Stars value={p.rating} count={p.ratingCount} />
          {p.openNow === true && <span className="text-xs font-medium text-brand">Open now</span>}
          {p.openNow === false && <span className="text-xs text-muted">Closed</span>}
        </div>
      </div>
    </Link>
  );
}
