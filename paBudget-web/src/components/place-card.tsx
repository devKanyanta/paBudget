import Link from 'next/link';
import { Star, UtensilsCrossed } from 'lucide-react';
import type { PlaceSummary } from '@/lib/types';
import { formatDistance, kwacha } from '@/lib/format';

export function Stars({ value, count }: { value: number | null; count?: number }) {
  if (value == null) return <span className="text-xs text-muted">No reviews yet</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold">
      <Star aria-hidden className="size-3.5 fill-accent text-accent" />{value.toFixed(1)}{count != null && <span className="font-normal text-muted">({count})</span>}
    </span>
  );
}

export function PlaceCard({ p }: { p: PlaceSummary }) {
  const dist = formatDistance(p.distanceM);
  return (
    <Link href={`/places/${p.slug}`} className="card group flex flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-pop">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-sunken">
        {p.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.thumb} alt={p.name} loading="lazy" className="size-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        ) : <div className="flex size-full items-center justify-center bg-sunken text-faint"><UtensilsCrossed aria-hidden className="size-8" /></div>}
        {p.isFeatured && <span className="absolute left-3 top-3 rounded-md bg-surface px-2 py-0.5 text-xs font-semibold text-brand shadow-sm">Featured</span>}
        <span className="num absolute bottom-3 right-3 rounded-md bg-surface px-2.5 py-1 text-sm font-bold text-foreground shadow-sm">
          {p.avgSpendPpNgwee != null ? <>{kwacha(p.avgSpendPpNgwee)}<span className="ml-1 text-xs font-normal text-muted">pp</span></> : 'Menu needed'}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-4">
        <h3 className="truncate text-[15px] font-semibold">{p.name}</h3>
        <p className="truncate text-sm text-muted">{p.category} · {p.area}{dist ? ` · ${dist}` : ''}</p>
        <div className="mt-2 flex items-center gap-3">
          <Stars value={p.rating} count={p.ratingCount} />
          {p.openNow === true && <span className="inline-flex items-center gap-1 text-xs font-medium text-brand"><span className="size-1.5 rounded-full bg-brand" />Open now</span>}
          {p.openNow === false && <span className="text-xs text-muted">Closed</span>}
        </div>
      </div>
    </Link>
  );
}
