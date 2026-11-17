'use client';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PlaceSummary } from '@/lib/types';
import { PlaceCard } from '@/components/place-card';
import { EmptyState, Loading, PageHeader } from '@/components/ui';

export default function Page() {
  const q = useQuery({ queryKey: ['favourites'], queryFn: () => api<PlaceSummary[]>('/me/favourites') });
  return (
    <>
      <PageHeader title="Saved places" subtitle="Places you’ve bookmarked to visit later." />
      {q.isLoading && <Loading rows={2} />}
      {q.data?.length === 0 && <EmptyState icon={Heart} title="Nothing saved yet" body="Tap Save on any place to keep it here." action={<Link href="/places" className="btn-primary">Explore places</Link>} />}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{q.data?.map((p) => <PlaceCard key={p.id} p={p} />)}</div>
    </>
  );
}
