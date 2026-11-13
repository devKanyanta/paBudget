'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PlaceSummary } from '@/lib/types';
import { PlaceCard } from '@/components/place-card';
import { RequireAuth } from '@/components/ui';

export default function Page() {
  const q = useQuery({ queryKey: ['favourites'], queryFn: () => api<PlaceSummary[]>('/me/favourites') });
  return (
    <RequireAuth>
      <h1 className="mb-3 text-xl font-bold">Saved places</h1>
      {q.data?.length === 0 && <p className="text-sm text-muted">Nothing saved yet. Tap ♡ Save on a place to keep it here.</p>}
      <div className="grid gap-3 sm:grid-cols-2">{q.data?.map((p) => <PlaceCard key={p.id} p={p} />)}</div>
    </RequireAuth>
  );
}
