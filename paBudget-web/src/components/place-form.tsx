'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Meta } from '@/lib/types';
import { ErrorText, Field } from '@/components/ui';
import { ImageUploader, type Uploaded } from '@/components/image-uploader';
import { MenuEditor, emptyMenu, toPayload, type MenuDraft } from '@/components/menu-editor';
import { MenuCapture } from '@/components/menu-capture';
import { WEEKDAYS } from '@/lib/format';

export type AdminPlace = {
  id?: string; name: string; status: string; categoryId: string; areaId: string; lat: number | ''; lng: number | ''; description: string; address: string;
  phone: string; whatsapp: string; isFeatured: boolean; hours: { weekday: number; opensAt: string; closesAt: string }[]; tagSlugs: string[];
  images?: { id: string; thumb?: string; status: string }[]; menu: MenuDraft;
};
export const blankPlace = (): AdminPlace => ({ name: '', status: 'LIVE', categoryId: '', areaId: '', lat: '', lng: '', description: '', address: '', phone: '', whatsapp: '', isFeatured: false, hours: [], tagSlugs: [], menu: emptyMenu() });

export function PlaceForm({ initial }: { initial: AdminPlace }) {
  const router = useRouter();
  const qc = useQueryClient();
  const meta = useQuery({ queryKey: ['meta'], queryFn: () => api<Meta>('/meta', { auth: false }) });
  const [p, setP] = useState(initial);
  const [photos, setPhotos] = useState<Uploaded[]>([]);
  const [err, setErr] = useState<unknown>(null); const [busy, setBusy] = useState(false);
  const [merge, setMerge] = useState('');
  const set = <K extends keyof AdminPlace>(k: K, v: AdminPlace[K]) => setP((s) => ({ ...s, [k]: v }));
  const hoursFor = (d: number) => p.hours.find((h) => h.weekday === d);
  const setHours = (d: number, patch: Partial<{ opensAt: string; closesAt: string }> | null) =>
    set('hours', patch === null ? p.hours.filter((h) => h.weekday !== d) : hoursFor(d) ? p.hours.map((h) => (h.weekday === d ? { ...h, ...patch } : h)) : [...p.hours, { weekday: d, opensAt: '08:00', closesAt: '22:00', ...patch }]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const body = {
        name: p.name, status: p.status, categoryId: p.categoryId, areaId: p.areaId, lat: Number(p.lat), lng: Number(p.lng),
        description: p.description || null, address: p.address || null, phone: p.phone || null, whatsapp: p.whatsapp || null,
        isFeatured: p.isFeatured, hours: p.hours, tagSlugs: p.tagSlugs, menu: toPayload(p.menu), imageIds: photos.map((x) => x.id),
      };
      if (p.id) await api(`/admin/places/${p.id}`, { method: 'PUT', body }); else await api('/admin/places', { method: 'POST', body });
      await qc.invalidateQueries({ queryKey: ['admin-places'] });
      router.push('/admin/places');
    } catch (e) { setErr(e); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">{p.id ? 'Edit place' : 'New place'}</h1>
      <ErrorText error={err} />
      <Field label="Name"><input className="input" value={p.name} onChange={(e) => set('name', e.target.value)} required /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Area"><select className="input" value={p.areaId} onChange={(e) => set('areaId', e.target.value)} required><option value="">—</option>{meta.data?.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
        <Field label="Type"><select className="input" value={p.categoryId} onChange={(e) => set('categoryId', e.target.value)} required><option value="">—</option>{meta.data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Status"><select className="input" value={p.status} onChange={(e) => set('status', e.target.value)}>{['LIVE', 'DRAFT', 'PENDING', 'HIDDEN'].map((s) => <option key={s}>{s}</option>)}</select></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude"><input className="input" inputMode="decimal" value={p.lat} onChange={(e) => set('lat', e.target.value as unknown as number)} required /></Field>
        <Field label="Longitude"><input className="input" inputMode="decimal" value={p.lng} onChange={(e) => set('lng', e.target.value as unknown as number)} required /></Field>
      </div>
      <Field label="Address"><input className="input" value={p.address} onChange={(e) => set('address', e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone"><input className="input" value={p.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="WhatsApp"><input className="input" value={p.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} /></Field>
      </div>
      <Field label="Description"><textarea className="input" rows={3} value={p.description} onChange={(e) => set('description', e.target.value)} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} /> Featured</label>

      <div>
        <label className="label">Tags</label>
        <div className="flex flex-wrap gap-2">{meta.data?.tags.map((t) => <button type="button" key={t.id} className={`chip ${p.tagSlugs.includes(t.slug) ? 'chip-active' : ''}`} onClick={() => set('tagSlugs', p.tagSlugs.includes(t.slug) ? p.tagSlugs.filter((s) => s !== t.slug) : [...p.tagSlugs, t.slug])}>{t.name}</button>)}</div>
      </div>

      <div className="card p-3">
        <h2 className="mb-2 font-semibold">Opening hours</h2>
        {WEEKDAYS.map((d, i) => { const h = hoursFor(i); return (
          <div key={d} className="mb-1 flex items-center gap-2 text-sm">
            <label className="flex w-16 items-center gap-1"><input type="checkbox" checked={!!h} onChange={(e) => setHours(i, e.target.checked ? {} : null)} />{d}</label>
            {h ? (<><input type="time" className="input !w-28" value={h.opensAt} onChange={(e) => setHours(i, { opensAt: e.target.value })} />–<input type="time" className="input !w-28" value={h.closesAt} onChange={(e) => setHours(i, { closesAt: e.target.value })} /></>) : <span className="text-muted">Closed</span>}
          </div>); })}
      </div>

      <div><label className="label">Photos</label>
        {p.images && p.images.length > 0 && <div className="mb-2 flex flex-wrap gap-2">{p.images.map((i) => /* eslint-disable-next-line @next/next/no-img-element */ <img key={i.id} src={i.thumb} alt="" className="h-16 w-16 rounded-lg object-cover" />)}</div>}
        <ImageUploader value={photos} onChange={setPhotos} />
      </div>

      <section className="space-y-2"><h2 className="font-semibold">Menu {p.id && <span className="text-xs font-normal text-muted">(edits merge into the existing menu)</span>}</h2>
        <MenuCapture onDraft={(m) => set('menu', m)} /><MenuEditor value={p.menu} onChange={(m) => set('menu', m)} /></section>

      <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Save place'}</button>

      {p.id && (
        <div className="card space-y-2 p-3">
          <h2 className="font-semibold">Merge duplicate</h2>
          <p className="text-xs text-muted">Moves this place’s photos, menu, reviews and favourites into another place, then hides this one.</p>
          <input className="input" placeholder="Paste the ID of the place to keep" value={merge} onChange={(e) => setMerge(e.target.value)} />
          <button type="button" className="btn-outline" disabled={!merge} onClick={async () => {
            if (!window.confirm('Merge this place into the one with that ID?')) return;
            try { await api(`/admin/places/${p.id}/merge`, { method: 'POST', body: { intoId: merge.trim() } }); router.push('/admin/places'); } catch (e) { setErr(e); }
          }}>Merge into that place</button>
        </div>
      )}
    </form>
  );
}
