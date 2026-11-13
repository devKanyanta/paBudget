'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Meta } from '@/lib/types';
import { ErrorText, Field, RequireAuth } from '@/components/ui';
import { ImageUploader, type Uploaded } from '@/components/image-uploader';
import { MenuEditor, emptyMenu, toPayload, type MenuDraft } from '@/components/menu-editor';
import { MenuCapture } from '@/components/menu-capture';
import { useSubmit } from '@/components/submit';

type Dup = { id: string; name: string; slug: string; distanceM: number };

function Form() {
  const meta = useQuery({ queryKey: ['meta'], queryFn: () => api<Meta>('/meta', { auth: false }) });
  const { submit, busy, error } = useSubmit('place');
  const [f, setF] = useState({ name: '', areaId: '', categoryId: '', address: '', phone: '', description: '', lat: '', lng: '', opens: '', closes: '' });
  const [tagSlugs, setTags] = useState<string[]>([]);
  const [photos, setPhotos] = useState<Uploaded[]>([]);
  const [menu, setMenu] = useState<MenuDraft>(emptyMenu());
  const [dups, setDups] = useState<Dup[]>([]);
  const [notDup, setNotDup] = useState(false);
  const [geoErr, setGeoErr] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const lat = parseFloat(f.lat), lng = parseFloat(f.lng);
  const hasLoc = Number.isFinite(lat) && Number.isFinite(lng);

  // Duplicate check (FR-71) once we have a name and a location
  useEffect(() => {
    setNotDup(false);
    if (f.name.trim().length < 3 || !hasLoc) { setDups([]); return; }
    const t = setTimeout(() => {
      api<Dup[]>(`/submissions/duplicates?name=${encodeURIComponent(f.name)}&lat=${lat}&lng=${lng}`).then(setDups).catch(() => setDups([]));
    }, 500);
    return () => clearTimeout(t);
  }, [f.name, lat, lng, hasLoc]);

  function locate() {
    setGeoErr('');
    if (!navigator.geolocation) return setGeoErr('Location is not available on this device.');
    navigator.geolocation.getCurrentPosition(
      (p) => setF((s) => ({ ...s, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) })),
      () => setGeoErr('We couldn’t get your location. Enter the coordinates by hand (see the map link).'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }
  const area = meta.data?.areas.find((a) => a.id === f.areaId);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const sections = toPayload(menu);
    void submit({
      name: f.name.trim(), areaId: f.areaId, categoryId: f.categoryId, lat, lng,
      ...(f.address && { address: f.address }), ...(f.phone && { phone: f.phone }), ...(f.description && { description: f.description }),
      ...(tagSlugs.length && { tagSlugs }), imageIds: photos.map((p) => p.id),
      ...(f.opens && f.closes && { hours: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opensAt: f.opens, closesAt: f.closes })) }),
      ...(sections.length && { menu: { mode: 'merge', sections } }), confirmNotDuplicate: notDup || undefined,
    });
  }

  const blocked = dups.length > 0 && !notDup;
  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-5">
      <h1 className="text-xl font-bold">Add a place</h1>
      <p className="text-sm text-muted">Thanks for helping others plan! We check every submission before it goes public.</p>
      <ErrorText error={error} />
      <Field label="Place name"><input className="input" value={f.name} onChange={set('name')} required minLength={2} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Area"><select className="input" value={f.areaId} onChange={set('areaId')} required><option value="">Select…</option>{meta.data?.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
        <Field label="Type"><select className="input" value={f.categoryId} onChange={set('categoryId')} required><option value="">Select…</option>{meta.data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      </div>

      <div className="card space-y-3 p-3">
        <h2 className="font-semibold">Location</h2>
        <button type="button" className="btn-outline" onClick={locate}>📍 I’m at the place — use my location</button>
        {geoErr && <p className="text-sm text-danger">{geoErr}</p>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude"><input className="input" inputMode="decimal" value={f.lat} onChange={set('lat')} required placeholder="-15.4318" /></Field>
          <Field label="Longitude"><input className="input" inputMode="decimal" value={f.lng} onChange={set('lng')} required placeholder="28.3128" /></Field>
        </div>
        {hasLoc ? <a className="text-sm font-medium text-brand underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`}>Check the pin on a map ↗</a>
          : area && <button type="button" className="text-sm text-muted underline" onClick={() => setF({ ...f, lat: String(area.lat), lng: String(area.lng) })}>Start from the centre of {area.name}</button>}
        <Field label="Address / landmark"><input className="input" value={f.address} onChange={set('address')} placeholder="e.g. Next to Woodlands Shopping Mall" /></Field>
      </div>

      {dups.length > 0 && (
        <div role="alert" className="card space-y-2 border-accent p-3 text-sm">
          <p className="font-semibold">Is it one of these?</p>
          {dups.map((d) => <a key={d.id} className="block text-brand underline" href={`/places/${d.slug}`} target="_blank" rel="noreferrer">{d.name} · {d.distanceM} m away</a>)}
          <label className="flex items-center gap-2"><input type="checkbox" checked={notDup} onChange={(e) => setNotDup(e.target.checked)} /> No, this is a different place</label>
        </div>
      )}

      <Field label="Photos (at least 1)" hint="Food, inside or outside. Please avoid close-ups of people."><ImageUploader value={photos} onChange={setPhotos} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone (optional)"><input className="input" inputMode="tel" value={f.phone} onChange={set('phone')} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Opens"><input className="input" type="time" value={f.opens} onChange={set('opens')} /></Field>
          <Field label="Closes"><input className="input" type="time" value={f.closes} onChange={set('closes')} /></Field>
        </div>
      </div>
      <Field label="Short description (optional)"><textarea className="input" rows={2} maxLength={1000} value={f.description} onChange={set('description')} /></Field>
      <div>
        <label className="label">Vibe & features</label>
        <div className="flex flex-wrap gap-2">{meta.data?.tags.map((t) => <button type="button" key={t.id} className={`chip ${tagSlugs.includes(t.slug) ? 'chip-active' : ''}`} onClick={() => setTags(tagSlugs.includes(t.slug) ? tagSlugs.filter((s) => s !== t.slug) : [...tagSlugs, t.slug])}>{t.name}</button>)}</div>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Menu & prices (optional but very helpful)</h2>
        <MenuCapture onDraft={setMenu} />
        <MenuEditor value={menu} onChange={setMenu} />
      </section>

      <button className="btn-primary w-full" disabled={busy || photos.length === 0 || !hasLoc || blocked}>{busy ? 'Submitting…' : 'Submit for review'}</button>
      {blocked && <p className="text-center text-sm text-muted">Please confirm this isn’t a duplicate to continue.</p>}
    </form>
  );
}
export default function Page() { return <RequireAuth><Form /></RequireAuth>; }
