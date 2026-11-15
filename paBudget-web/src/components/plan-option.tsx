import Link from 'next/link';
import { UtensilsCrossed } from 'lucide-react';
import { kwacha } from '@/lib/format';
import type { BundleItem } from '@/lib/types';

/** Line-item estimate, e.g. "2 × Burger  K240" — totals always come from the server (FR-32). */
export function BillLines({ items, total, over }: { items: BundleItem[]; total: number; over?: number }) {
  return (
    <div className="rounded-xl bg-sunken p-3.5 text-sm">
      <ul className="space-y-0.5">
        {items.map((i) => <li key={i.itemId} className="flex justify-between gap-2"><span>{i.qty} × {i.name}</span><span className="num">{kwacha(i.priceNgwee * i.qty)}</span></li>)}
      </ul>
      <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold"><span>Estimated total</span><span className="num">{kwacha(total)}</span></div>
      {over ? <p className="mt-1 text-xs font-medium text-danger">{kwacha(over)} over budget</p> : null}
    </div>
  );
}

export function PlanStopCard({ slug, name, area, thumb, reason, children }: { slug: string; name: string; area: string; thumb: string | null; reason?: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-3 p-4">
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {thumb ? <img src={thumb} alt="" className="size-16 shrink-0 rounded-xl object-cover" /> : <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-sunken text-faint"><UtensilsCrossed aria-hidden className="size-6" /></div>}
        <div className="min-w-0">
          <Link href={`/places/${slug}`} className="font-bold hover:text-brand">{name}</Link>
          <p className="text-xs text-muted">{area}</p>
          {reason && <p className="mt-1 text-sm">{reason}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}
