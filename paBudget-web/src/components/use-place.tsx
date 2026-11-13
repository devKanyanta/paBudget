'use client';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PlaceDetail } from '@/lib/types';

export function usePlace() {
  const { slug } = useParams<{ slug: string }>();
  const q = useQuery({ queryKey: ['place', slug], queryFn: () => api<PlaceDetail>(`/places/${slug}`, { auth: false }) });
  return { place: q.data, loading: q.isLoading, slug };
}
