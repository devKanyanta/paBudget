'use client';
import { useEffect, useState } from 'react';
import { Camera, Flag, Heart, MessageCircle, Navigation, Pencil, Phone, Plus, Store } from 'lucide-react';
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

/** Records a menu view once the menu section scrolls into view. */
export function MenuViewTracker({ placeId }: { placeId: string }) {
  useEffect(() => {
    const el = document.getElementById('menu');
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { track(placeId, 'menu_view'); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [placeId]);
  return null;
}

export function ContactButtons({ placeId, phone, whatsapp, lat, lng }: { placeId: string; phone: string | null; whatsapp: string | null; lat: number; lng: number }) {
  return (
    <div className="grid gap-2">
      <a className="btn-primary" target="_blank" rel="noreferrer" href={directionsUrl(lat, lng)} onClick={() => track(placeId, 'directions')}><Navigation aria-hidden className="size-4" />Get directions</a>
      <div className="grid grid-cols-2 gap-2">
        {phone && <a className="btn-outline" href={`tel:${phone}`} onClick={() => track(placeId, 'call')}><Phone aria-hidden className="size-4" />Call</a>}
        {(whatsapp ?? phone) && <a className="btn-outline" target="_blank" rel="noreferrer" href={whatsappUrl((whatsapp ?? phone)!)} onClick={() => track(placeId, 'whatsapp')}><MessageCircle aria-hidden className="size-4" />WhatsApp</a>}
      </div>
    </div>
  );
}

export function FavouriteButton({ placeId }: { placeId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const favs = useQuery({ queryKey: ['favourites'], queryFn: () => api<PlaceSummary[]>('/me/favourites'), enabled: !!user });
  const isFav = favs.data?.some((p) => p.id === placeId) ?? false;
  const [busy, setBusy] = useState(false);
  if (!user) return <Link href="/login" className="btn-outline btn-sm"><Heart aria-hidden className="size-4" />Save</Link>;
  return (
    <button className="btn-outline btn-sm" disabled={busy} onClick={async () => {
      setBusy(true);
      try { await api(`/places/${placeId}/favourite`, { method: isFav ? 'DELETE' : 'PUT' }); await qc.invalidateQueries({ queryKey: ['favourites'] }); } finally { setBusy(false); }
    }}><Heart aria-hidden className={`size-4 ${isFav ? 'fill-danger text-danger' : ''}`} />{isFav ? 'Saved' : 'Save'}</button>
  );
}

export function ContributeLinks({ slug, placeId }: { slug: string; placeId: string }) {
  const { user } = useAuth();
  const [flagged, setFlagged] = useState(false);
  const row = 'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink-2 transition hover:bg-sunken hover:text-foreground';
  const ic = 'size-4 text-faint';
  return (
    <div className="card p-3">
      <h3 className="px-2.5 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted">Help keep this accurate</h3>
      <Link className={row} href={`/contribute/${slug}/menu`}><Plus aria-hidden className={ic} />Add or update menu</Link>
      <Link className={row} href={`/contribute/${slug}/photos`}><Camera aria-hidden className={ic} />Add photos</Link>
      <Link className={row} href={`/contribute/${slug}/edit`}><Pencil aria-hidden className={ic} />Suggest an edit</Link>
      <Link className={row} href={`/contribute/${slug}/claim`}><Store aria-hidden className={ic} />Claim this business</Link>
      {user && !flagged && <button className={`${row} w-full`} onClick={async () => {
        const reason = window.prompt('What is wrong with this place?'); if (!reason) return;
        try { await api('/submissions/flag', { method: 'POST', body: { targetType: 'place', targetId: placeId, reason } }); setFlagged(true); } catch (e) { window.alert((e as Error).message); }
      }}><Flag aria-hidden className={ic} />Report a problem</button>}
      {flagged && <p className="px-2.5 py-2 text-sm text-brand">Thanks, we’ll take a look.</p>}
      <Link className={`${row} text-xs`} href={`/takedown?type=place&id=${placeId}`}>Report content or request removal</Link>
      {!tokenStore.get() && <p className="px-2.5 pb-2 pt-1 text-xs text-muted">Log in to contribute. Contributions are reviewed before they go public.</p>}
    </div>
  );
}
