'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api, tokenStore } from '@/lib/api';
import { directionsUrl, whatsappUrl } from '@/lib/format';
import { useAuth } from './providers';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PlaceSummary } from '@/lib/types';

const track = (placeId: string, type: string) => void api(`/places/${placeId}/events`, { method: 'POST', body: { type } }).catch(() => {});

export function ViewTracker({ placeId }: { placeId: string }) {
  const [done, setDone] = useState(false);
  if (!done && typeof window !== 'undefined') { setDone(true); track(placeId, 'view'); }
  return null;
}

export function ContactButtons({ placeId, phone, whatsapp, lat, lng }: { placeId: string; phone: string | null; whatsapp: string | null; lat: number; lng: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {phone && <a className="btn-outline" href={`tel:${phone}`} onClick={() => track(placeId, 'call')}>📞 Call</a>}
      {(whatsapp ?? phone) && <a className="btn-outline" target="_blank" rel="noreferrer" href={whatsappUrl((whatsapp ?? phone)!)} onClick={() => track(placeId, 'whatsapp')}>💬 WhatsApp</a>}
      <a className="btn-primary" target="_blank" rel="noreferrer" href={directionsUrl(lat, lng)} onClick={() => track(placeId, 'directions')}>🧭 Directions</a>
    </div>
  );
}

export function FavouriteButton({ placeId }: { placeId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const favs = useQuery({ queryKey: ['favourites'], queryFn: () => api<PlaceSummary[]>('/me/favourites'), enabled: !!user });
  const isFav = favs.data?.some((p) => p.id === placeId) ?? false;
  const [busy, setBusy] = useState(false);
  if (!user) return <Link href="/login" className="btn-outline">♡ Save</Link>;
  return (
    <button className="btn-outline" disabled={busy} onClick={async () => {
      setBusy(true);
      try { await api(`/places/${placeId}/favourite`, { method: isFav ? 'DELETE' : 'PUT' }); await qc.invalidateQueries({ queryKey: ['favourites'] }); } finally { setBusy(false); }
    }}>{isFav ? '♥ Saved' : '♡ Save'}</button>
  );
}

export function ContributeLinks({ slug, placeId }: { slug: string; placeId: string }) {
  const { user } = useAuth();
  const [flagged, setFlagged] = useState(false);
  return (
    <div className="card space-y-3 p-4">
      <h3 className="font-semibold">Help keep this page accurate</h3>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link className="chip hover:border-brand" href={`/contribute/${slug}/review`}>★ Write a review</Link>
        <Link className="chip hover:border-brand" href={`/contribute/${slug}/menu`}>＋ Add / update menu</Link>
        <Link className="chip hover:border-brand" href={`/contribute/${slug}/photos`}>📷 Add photos</Link>
        <Link className="chip hover:border-brand" href={`/contribute/${slug}/edit`}>✎ Suggest an edit</Link>
        {user && !flagged && <button className="chip hover:border-danger" onClick={async () => {
          const reason = window.prompt('What is wrong with this place?'); if (!reason) return;
          try { await api('/submissions/flag', { method: 'POST', body: { targetType: 'place', targetId: placeId, reason } }); setFlagged(true); } catch (e) { window.alert((e as Error).message); }
        }}>⚑ Report</button>}
        {flagged && <span className="chip">Thanks — we’ll take a look</span>}
      </div>
      {!tokenStore.get() && <p className="text-xs text-muted">Log in to contribute. Contributions are reviewed before they go public.</p>}
    </div>
  );
}
