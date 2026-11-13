import Link from 'next/link';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { publicGet } from '@/lib/api';
import type { Meta, PlaceList } from '@/lib/types';
import { PlaceCard } from '@/components/place-card';
import { Filters } from '@/components/filters';

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
    <div className="space-y-4">
      <Suspense><Filters meta={meta} /></Suspense>
      <p className="text-sm text-muted">{list.total} {list.total === 1 ? 'place' : 'places'}</p>
      {list.items.length === 0 ? (
        <div className="card p-6 text-center"><p className="font-medium">Nothing matches yet.</p><p className="mt-1 text-sm text-muted">Try a higher budget or fewer filters — or add the place you have in mind.</p><Link className="btn-primary mt-3" href="/contribute/place">Add a place</Link></div>
      ) : <div className="grid gap-3 sm:grid-cols-2">{list.items.map((p) => <PlaceCard key={p.id} p={p} />)}</div>}
      <div className="flex justify-between">
        {offset > 0 ? <Link className="btn-outline" href={link(Math.max(0, offset - 20))}>← Previous</Link> : <span />}
        {offset + 20 < list.total && <Link className="btn-outline" href={link(offset + 20)}>Next →</Link>}
      </div>
    </div>
  );
}
