import Link from 'next/link';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { publicGet } from '@/lib/api';
import type { Meta, PlaceList } from '@/lib/types';
import { PlaceCard } from '@/components/place-card';
import { Filters } from '@/components/filters';
import { EmptyState } from '@/components/blocks';
import { SearchX } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Explore places' };

export default async function Places({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const k of ['q', 'area', 'category', 'tags', 'maxPp', 'groupSize', 'totalBudget', 'openNow', 'lat', 'lng', 'sort', 'offset']) if (sp[k]) qs.set(k, sp[k]!);
  qs.set('limit', '20');
  const [meta, list] = await Promise.all([publicGet<Meta>('/meta', 300), publicGet<PlaceList>(`/places?${qs}`, 15)]);
  const offset = Number(sp.offset ?? 0);
  const link = (o: number) => { const p = new URLSearchParams(qs); p.set('offset', String(o)); p.delete('limit'); return `/places?${p}`; };

  return (
    <div className="space-y-6">
      <div><h1 className="page-title">Explore places</h1><p className="page-sub">Find somewhere that fits your budget.</p></div>
      <div className="grid items-start gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="lg:sticky lg:top-20"><Suspense><Filters meta={meta} /></Suspense></aside>
        <section className="space-y-4">
          <p className="text-sm font-medium text-muted">{list.total} {list.total === 1 ? 'place' : 'places'}{sp.q ? ` for “${sp.q}”` : ''}</p>
          {list.items.length === 0 ? (
            <EmptyState icon={SearchX} title="Nothing matches yet" body="Try a higher budget or fewer filters, or add the place you have in mind." action={<Link className="btn-primary" href="/contribute/place">Add a place</Link>} />
          ) : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{list.items.map((p) => <PlaceCard key={p.id} p={p} />)}</div>}
          {(offset > 0 || offset + 20 < list.total) && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              {offset > 0 ? <Link className="btn-outline btn-sm" href={link(Math.max(0, offset - 20))}>← Previous</Link> : <span />}
              <span className="text-xs text-muted">{offset + 1}–{Math.min(offset + 20, list.total)} of {list.total}</span>
              {offset + 20 < list.total ? <Link className="btn-outline btn-sm" href={link(offset + 20)}>Next →</Link> : <span />}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
