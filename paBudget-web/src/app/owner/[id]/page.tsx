'use client';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Meta, OwnerPlace, OwnerStats, Review } from '@/lib/types';
import { ErrorText, Field, RequireAuth } from '@/components/ui';
import { MenuEditor, toPayload, type MenuDraft } from '@/components/menu-editor';
import { MenuCapture } from '@/components/menu-capture';
import { ImageUploader, type Uploaded } from '@/components/image-uploader';
import { kwacha, timeAgo, toNgwee, WEEKDAYS } from '@/lib/format';

const TABS = ['Details', 'Menu', 'Photos', 'Reviews', 'Deals', 'Stats'] as const;
type Tab = (typeof TABS)[number];

function useAction() {
  const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null); const [ok, setOk] = useState('');
  async function run(fn: () => Promise<unknown>, done = 'Saved') {
    setBusy(true); setError(null); setOk('');
    try { await fn(); setOk(done); } catch (e) { setError(e); } finally { setBusy(false); }
  }
  return { busy, error, ok, run };
}

function Manager() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('Details');
  const q = useQuery({ queryKey: ['owner-place', id], queryFn: () => api<OwnerPlace>(`/owner/places/${id}`), staleTime: 0 });
  const refresh = () => qc.invalidateQueries({ queryKey: ['owner-place', id] });
  if (q.isError) return <ErrorText error={q.error} />;
  if (!q.data) return <p className="text-sm text-muted">Loading…</p>;
  const p = q.data;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-baseline justify-between gap-2"><h1 className="page-title">{p.name}</h1><Link className="text-sm font-medium text-brand" href={`/places/${p.slug}`}>View public page →</Link></div>
      <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4" role="tablist">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={t === tab} className={`whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition ${t === tab ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-foreground'}`} onClick={() => setTab(t)}>{t}</button>)}
      </nav>
      {tab === 'Details' && <Details p={p} onSaved={refresh} />}
      {tab === 'Menu' && <MenuTab p={p} onSaved={refresh} />}
      {tab === 'Photos' && <PhotosTab p={p} onSaved={refresh} />}
      {tab === 'Reviews' && <ReviewsTab id={id} />}
      {tab === 'Deals' && <DealsTab p={p} onSaved={refresh} />}
      {tab === 'Stats' && <StatsTab id={id} />}
    </div>
  );
}

type HourRow = { open: boolean; opensAt: string; closesAt: string };
function Details({ p, onSaved }: { p: OwnerPlace; onSaved: () => void }) {
  const meta = useQuery({ queryKey: ['meta'], queryFn: () => api<Meta>('/meta', { auth: false }) });
  const [f, setF] = useState({ description: '', address: '', phone: '', whatsapp: '' });
  const [hours, setHours] = useState<HourRow[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const a = useAction();
  useEffect(() => {
    setF({ description: p.description ?? '', address: p.address ?? '', phone: p.phone ?? '', whatsapp: p.whatsapp ?? '' });
    setHours(WEEKDAYS.map((_, d) => { const h = p.hours.find((x) => x.weekday === d); return { open: !!h, opensAt: h?.opensAt ?? '09:00', closesAt: h?.closesAt ?? '21:00' }; }));
    setTags(p.tagSlugs);
  }, [p]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void a.run(async () => {
      await api(`/owner/places/${p.id}`, { method: 'PATCH', body: {
        description: f.description || null, address: f.address || null, phone: f.phone || null, whatsapp: f.whatsapp || null, tagSlugs: tags,
        hours: hours.flatMap((h, d) => (h.open ? [{ weekday: d, opensAt: h.opensAt, closesAt: h.closesAt }] : [])),
      } });
      onSaved();
    }); }}>
      <ErrorText error={a.error} />
      <Field label="Description"><textarea className="input" rows={3} maxLength={1000} value={f.description} onChange={set('description')} /></Field>
      <Field label="Address"><input className="input" value={f.address} onChange={set('address')} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Phone"><input className="input" inputMode="tel" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="WhatsApp"><input className="input" inputMode="tel" value={f.whatsapp} onChange={set('whatsapp')} /></Field>
      </div>
      <fieldset className="space-y-2"><legend className="label">Opening hours</legend>
        {hours.map((h, d) => (
          <div key={d} className="flex items-center gap-2 text-sm">
            <label className="flex w-20 items-center gap-1.5"><input type="checkbox" checked={h.open} onChange={(e) => setHours(hours.map((x, i) => (i === d ? { ...x, open: e.target.checked } : x)))} />{WEEKDAYS[d]}</label>
            {h.open ? <><input type="time" className="input !w-28" aria-label={`${WEEKDAYS[d]} opens`} value={h.opensAt} onChange={(e) => setHours(hours.map((x, i) => (i === d ? { ...x, opensAt: e.target.value } : x)))} />–<input type="time" className="input !w-28" aria-label={`${WEEKDAYS[d]} closes`} value={h.closesAt} onChange={(e) => setHours(hours.map((x, i) => (i === d ? { ...x, closesAt: e.target.value } : x)))} /></> : <span className="text-muted">Closed</span>}
          </div>
        ))}
      </fieldset>
      <fieldset><legend className="label">Vibe & features</legend>
        <div className="flex flex-wrap gap-2">{meta.data?.tags.map((t) => <button type="button" key={t.id} className={tags.includes(t.slug) ? 'chip-active' : 'chip'} onClick={() => setTags(tags.includes(t.slug) ? tags.filter((x) => x !== t.slug) : [...tags, t.slug])}>{t.name}</button>)}</div>
      </fieldset>
      <button className="btn-primary w-full" disabled={a.busy}>{a.busy ? 'Saving…' : 'Save details'}</button>
      {a.ok && <p className="text-center text-sm text-brand">{a.ok}</p>}
    </form>
  );
}

function MenuTab({ p, onSaved }: { p: OwnerPlace; onSaved: () => void }) {
  const [menu, setMenu] = useState<MenuDraft>([]);
  const a = useAction();
  useEffect(() => {
    setMenu(p.menu.map((s) => ({ name: s.name, items: s.items.filter((i) => i.isAvailable).map((i) => ({ name: i.name, price: String(i.priceNgwee / 100), description: i.description ?? undefined })) })).filter((s) => s.items.length));
  }, [p]);
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void a.run(async () => { await api(`/owner/places/${p.id}/menu`, { method: 'PUT', body: { mode: 'replace', sections: toPayload(menu) } }); onSaved(); }, 'Menu published'); }}>
      <p className="text-sm text-muted">Changes go live immediately. Items you remove are hidden from the public menu. Average spend: {kwacha(p.avgSpendPpNgwee)}.</p>
      <ErrorText error={a.error} />
      <MenuCapture onDraft={setMenu} />
      <MenuEditor value={menu} onChange={setMenu} />
      <button className="btn-primary w-full" disabled={a.busy}>{a.busy ? 'Publishing…' : 'Publish menu'}</button>
      {a.ok && <p className="text-center text-sm text-brand">{a.ok}</p>}
    </form>
  );
}

function PhotosTab({ p, onSaved }: { p: OwnerPlace; onSaved: () => void }) {
  const [fresh, setFresh] = useState<Uploaded[]>([]);
  const a = useAction();
  const move = (i: number, d: number) => {
    const ids = p.images.map((x) => x.id); const j = i + d; if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    void a.run(async () => { await api(`/owner/places/${p.id}/photos/order`, { method: 'PUT', body: { imageIds: ids } }); onSaved(); }, 'Order saved');
  };
  return (
    <div className="space-y-4">
      <ErrorText error={a.error} />
      <ImageUploader value={fresh} onChange={setFresh} max={10} />
      {fresh.length > 0 && <button className="btn-primary" disabled={a.busy} onClick={() => void a.run(async () => { await api(`/owner/places/${p.id}/photos`, { method: 'POST', body: { imageIds: fresh.map((f) => f.id) } }); setFresh([]); onSaved(); }, 'Photos added')}>Add {fresh.length} photo{fresh.length > 1 ? 's' : ''} to gallery</button>}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {p.images.map((im, i) => (
          <li key={im.id} className="card overflow-hidden text-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={im.thumb} alt="" className="aspect-square w-full object-cover" />
            <div className="flex items-center justify-between p-1.5">
              <span>{i === 0 ? 'Cover' : `#${i + 1}`}</span>
              <span className="flex gap-1">
                <button aria-label="Move earlier" disabled={i === 0} onClick={() => move(i, -1)} className="px-1.5 disabled:opacity-30"><ChevronLeft aria-hidden className="size-4" /></button>
                <button aria-label="Move later" disabled={i === p.images.length - 1} onClick={() => move(i, 1)} className="px-1.5 disabled:opacity-30"><ChevronRight aria-hidden className="size-4" /></button>
                <button aria-label="Remove photo" className="px-1.5 text-danger" onClick={() => { if (window.confirm('Remove this photo?')) void a.run(async () => { await api(`/owner/places/${p.id}/photos/${im.id}`, { method: 'DELETE' }); onSaved(); }, 'Removed'); }}><X aria-hidden className="size-4" /></button>
              </span>
            </div>
          </li>
        ))}
      </ul>
      {a.ok && <p className="text-sm text-brand">{a.ok}</p>}
    </div>
  );
}

function ReviewsTab({ id }: { id: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['owner-reviews', id], queryFn: () => api<(Pick<Review, 'id' | 'rating' | 'body' | 'author' | 'createdAt' | 'ownerReply'>)[]>(`/owner/places/${id}/reviews`), staleTime: 0 });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const a = useAction();
  if (q.data?.length === 0) return <p className="text-sm text-muted">No reviews yet.</p>;
  return (
    <div className="space-y-3">
      <ErrorText error={a.error} />
      {q.data?.map((r) => (
        <div key={r.id} className="card space-y-2 p-3 text-sm">
          <div className="flex justify-between"><strong>{r.author} · {r.rating} stars</strong><span className="text-xs text-muted">{timeAgo(r.createdAt)}</span></div>
          {r.body && <p>{r.body}</p>}
          {r.ownerReply && <p className="rounded-lg bg-brand-soft p-2 text-xs"><strong>Your reply:</strong> {r.ownerReply}</p>}
          <div className="flex gap-2">
            <input className="input" maxLength={500} placeholder={r.ownerReply ? 'Edit reply' : 'Reply publicly'} value={drafts[r.id] ?? ''} onChange={(e) => setDrafts({ ...drafts, [r.id]: e.target.value })} />
            <button className="btn-outline" disabled={a.busy || !(drafts[r.id] ?? '').trim()} onClick={() => void a.run(async () => { await api(`/owner/places/${id}/reviews/${r.id}/reply`, { method: 'PUT', body: { reply: drafts[r.id] } }); setDrafts({ ...drafts, [r.id]: '' }); await qc.invalidateQueries({ queryKey: ['owner-reviews', id] }); }, 'Reply posted')}>Reply</button>
            {r.ownerReply && <button className="px-2 text-danger" aria-label="Delete reply" onClick={() => void a.run(async () => { await api(`/owner/places/${id}/reviews/${r.id}/reply`, { method: 'PUT', body: { reply: null } }); await qc.invalidateQueries({ queryKey: ['owner-reviews', id] }); }, 'Reply removed')}><X aria-hidden className="size-4" /></button>}
          </div>
        </div>
      ))}
      {a.ok && <p className="text-sm text-brand">{a.ok}</p>}
    </div>
  );
}

const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
function DealsTab({ p, onSaved }: { p: OwnerPlace; onSaved: () => void }) {
  const [title, setTitle] = useState(''); const [price, setPrice] = useState('');
  const [start, setStart] = useState(() => localInput(new Date())); const [end, setEnd] = useState(() => localInput(new Date(Date.now() + 7 * 864e5)));
  const a = useAction();
  const [asOf] = useState(() => Date.now());
  return (
    <div className="space-y-4">
      <form className="card space-y-3 p-3" onSubmit={(e) => { e.preventDefault(); void a.run(async () => { await api(`/owner/places/${p.id}/deals`, { method: 'POST', body: { title, priceNgwee: toNgwee(price), startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString() } }); setTitle(''); setPrice(''); onSaved(); }, 'Deal posted'); }}>
        <h2 className="font-semibold">New deal</h2>
        <ErrorText error={a.error} />
        <Field label="Title"><input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Couple’s dinner" /></Field>
        <Field label="Deal price (K)"><input className="input" required inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Starts"><input type="datetime-local" className="input" value={start} onChange={(e) => setStart(e.target.value)} /></Field><Field label="Ends"><input type="datetime-local" className="input" value={end} onChange={(e) => setEnd(e.target.value)} /></Field></div>
        <button className="btn-primary w-full" disabled={a.busy}>Post deal</button>
        {a.ok && <p className="text-center text-sm text-brand">{a.ok}</p>}
      </form>
      <ul className="space-y-2">
        {p.deals.map((d) => (
          <li key={d.id} className="card flex items-center justify-between p-3 text-sm">
            <span><strong>{d.title}</strong> · {kwacha(d.priceNgwee)}<span className="block text-xs text-muted">{new Date(d.startsAt).toLocaleDateString()} – {new Date(d.endsAt).toLocaleDateString()}{Date.parse(d.endsAt) < asOf ? ' (ended)' : ''}</span></span>
            <button className="text-danger" onClick={() => void a.run(async () => { await api(`/owner/places/${p.id}/deals/${d.id}`, { method: 'DELETE' }); onSaved(); }, 'Deal removed')}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const STAT_LABELS: [string, string][] = [['view', 'Profile views'], ['menu_view', 'Menu views'], ['ai_shown', 'Planner appearances'], ['directions', 'Direction taps'], ['call', 'Call taps'], ['whatsapp', 'WhatsApp taps']];
function StatsTab({ id }: { id: string }) {
  const [days, setDays] = useState(30);
  const q = useQuery({ queryKey: ['owner-stats', id, days], queryFn: () => api<OwnerStats>(`/owner/places/${id}/stats?days=${days}`), staleTime: 0 });
  const max = Math.max(1, ...(q.data?.series.map((s) => s.views) ?? [1]));
  return (
    <div className="space-y-4">
      <div className="flex gap-2">{[7, 30, 90].map((d) => <button key={d} className={d === days ? 'chip-active' : 'chip'} onClick={() => setDays(d)}>{d} days</button>)}</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{STAT_LABELS.map(([k, l]) => <div key={k} className="card p-3"><div className="text-2xl font-extrabold text-brand">{q.data?.totals[k] ?? 0}</div><div className="text-xs text-muted">{l}</div></div>)}</div>
      <div className="card p-3"><h2 className="mb-2 text-sm font-semibold">Profile views per day</h2>
        <div className="flex h-24 items-end gap-px" role="img" aria-label="Bar chart of daily profile views">
          {q.data?.series.map((s) => <div key={s.date} title={`${s.date}: ${s.views}`} className="min-h-px flex-1 rounded-t bg-brand" style={{ height: `${(s.views / max) * 100}%` }} />)}
        </div>
      </div>
    </div>
  );
}

export default function Page() { return <RequireAuth><Manager /></RequireAuth>; }
