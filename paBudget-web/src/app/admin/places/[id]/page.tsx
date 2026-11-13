'use client';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PlaceForm, type AdminPlace } from '@/components/place-form';

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const q = useQuery({ queryKey: ['admin-place', id], queryFn: () => api<any>(`/admin/places/${id}`), staleTime: 0, gcTime: 0 });
  if (!q.data) return <p className="text-sm text-muted">Loading…</p>;
  const d = q.data;
  const initial: AdminPlace = {
    id: d.id, name: d.name, status: d.status, categoryId: d.categoryId, areaId: d.areaId, lat: d.lat, lng: d.lng, description: d.description ?? '', address: d.address ?? '',
    phone: d.phone ?? '', whatsapp: d.whatsapp ?? '', isFeatured: d.isFeatured, hours: d.hours, tagSlugs: d.tagSlugs, images: d.images,
    menu: d.menu.length ? d.menu.map((s: any) => ({ name: s.name, items: s.items.map((i: any) => ({ name: i.name, price: String(i.priceNgwee / 100) })) })) : [{ name: '', items: [{ name: '', price: '' }] }],
  };
  return <PlaceForm initial={initial} />;
}
