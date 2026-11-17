'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { OwnerPlaceRow } from '@/lib/types';
import { RequireAuth } from '@/components/ui';

export default function Page() {
  const q = useQuery({ queryKey: ['owner-places'], queryFn: () => api<OwnerPlaceRow[]>('/owner/places') });
  return (
    <RequireAuth>
      <div className="mx-auto max-w-2xl space-y-5">
        <div><h1 className="page-title">My businesses</h1><p className="page-sub">Manage menus, photos, deals and reviews.</p></div>
        {q.data?.length === 0 && (
          <div className="card space-y-2 p-6 text-sm">
            <p>You don’t manage any places yet.</p>
            <p className="text-muted">Open your business’s page and choose “Claim this business”. We’ll verify it by phone, then you can edit your menu, photos and reply to reviews.</p>
            <Link href="/places" className="btn-primary">Find my business</Link>
          </div>
        )}
        {q.data?.map((p) => (
          <Link key={p.id} href={`/owner/${p.id}`} className="card flex items-center justify-between p-4 transition hover:shadow-pop">
            <span><strong className="block">{p.name}</strong><span className="text-xs text-muted">{p.area} · {p.status === 'LIVE' ? 'Live' : p.status}</span></span>
            <span className="text-right text-sm"><strong className="block text-lg text-brand">{p.views30d}</strong><span className="text-xs text-muted">views / 30 days</span></span>
          </Link>
        ))}
      </div>
    </RequireAuth>
  );
}
