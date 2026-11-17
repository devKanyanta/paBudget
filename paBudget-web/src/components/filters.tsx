'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, LocateFixed, Search, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import type { Meta } from '@/lib/types';

export function Filters({ meta }: { meta: Meta }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get('q') ?? '');
  const [maxPp, setMaxPp] = useState(sp.get('maxPp') ? String(Number(sp.get('maxPp')) / 100) : '');
  const [total, setTotal] = useState(sp.get('totalBudget') ? String(Number(sp.get('totalBudget')) / 100) : '');
  const [group, setGroup] = useState(sp.get('groupSize') ?? '');
  const tags = (sp.get('tags') ?? '').split(',').filter(Boolean);

  function push(next: Record<string, string | undefined>) {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) { if (v) p.set(k, v); else p.delete(k); }
    p.delete('offset');
    router.push(`/places?${p.toString()}`);
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    push({
      q: q.trim() || undefined,
      maxPp: maxPp && !group ? String(Math.round(parseFloat(maxPp) * 100)) : undefined,
      totalBudget: total && group ? String(Math.round(parseFloat(total) * 100)) : undefined,
      groupSize: group && total ? group : undefined,
    });
  }
  function near() {
    navigator.geolocation?.getCurrentPosition((pos) => push({ lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5), sort: 'nearest' }));
  }
  const toggleTag = (slug: string) => push({ tags: (tags.includes(slug) ? tags.filter((t) => t !== slug) : [...tags, slug]).join(',') || undefined });

  const [open, setOpen] = useState(false);
  const activeCount = ['q', 'area', 'category', 'tags', 'maxPp', 'totalBudget', 'openNow'].filter((k) => sp.get(k)).length;
  const sec = 'space-y-2 border-t border-border pt-4';
  const sub = 'text-xs font-semibold uppercase tracking-wider text-muted';
  return (
    <form onSubmit={submit} className="card p-4">
      <button type="button" className="flex w-full items-center justify-between font-semibold lg:hidden" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="inline-flex items-center gap-2"><SlidersHorizontal aria-hidden className="size-4" />Filters{activeCount > 0 && <span className="badge badge-green">{activeCount}</span>}</span>
        <ChevronDown aria-hidden className={`size-4 text-faint transition ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`${open ? 'mt-4 block' : 'hidden'} space-y-4 lg:mt-0 lg:block`}>
        <div className="hidden items-center justify-between lg:flex"><h2 className="font-semibold">Filters</h2>{activeCount > 0 && <button type="button" className="text-xs font-medium text-brand hover:underline" onClick={() => router.push('/places')}>Clear all</button>}</div>
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input className="input !pl-9" placeholder="Search place, dish or area" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        </div>
        <div className={sec}>
          <p className={sub}>Budget</p>
          <div><label className="label !text-xs">Per person (K)</label><input className="input" inputMode="decimal" placeholder="e.g. 150" value={maxPp} onChange={(e) => { setMaxPp(e.target.value); setTotal(''); setGroup(''); }} /></div>
          <p className="text-center text-xs text-faint">or for the whole group</p>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label !text-xs">Total (K)</label><input className="input" inputMode="decimal" placeholder="400" value={total} onChange={(e) => { setTotal(e.target.value); setMaxPp(''); }} /></div>
            <div><label className="label !text-xs">People</label><input className="input" inputMode="numeric" placeholder="2" value={group} onChange={(e) => setGroup(e.target.value.replace(/\D/g, ''))} /></div>
          </div>
        </div>
        <div className={sec}>
          <p className={sub}>Where & what</p>
          <select className="input" value={sp.get('area') ?? ''} onChange={(e) => push({ area: e.target.value || undefined })} aria-label="Area"><option value="">All areas</option>{meta.areas.map((a) => <option key={a.id} value={a.slug}>{a.name}</option>)}</select>
          <select className="input" value={sp.get('category') ?? ''} onChange={(e) => push({ category: e.target.value || undefined })} aria-label="Category"><option value="">All types</option>{meta.categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}</select>
          <select className="input" value={sp.get('sort') ?? ''} onChange={(e) => push({ sort: e.target.value || undefined })} aria-label="Sort by"><option value="">Sort: Top rated</option><option value="cheapest">Sort: Cheapest</option><option value="nearest">Sort: Nearest</option><option value="newest">Sort: Newest</option></select>
          <label className="flex cursor-pointer items-center justify-between rounded-lg bg-sunken px-3 py-2.5 text-sm font-medium">Open now<input type="checkbox" className="size-4 accent-[var(--brand)]" checked={sp.get('openNow') === 'true'} onChange={(e) => push({ openNow: e.target.checked ? 'true' : undefined })} /></label>
        </div>
        <div className={sec}>
          <p className={sub}>Vibe & features</p>
          <div className="flex flex-wrap gap-1.5">{meta.tags.map((t) => <button type="button" key={t.id} onClick={() => toggleTag(t.slug)} aria-pressed={tags.includes(t.slug)} className={tags.includes(t.slug) ? 'chip-active' : 'chip'}>{t.name}</button>)}</div>
          <button type="button" onClick={near} className="chip mt-1"><LocateFixed aria-hidden className="size-3.5" />Near me</button>
        </div>
        <button className="btn-primary w-full">Apply filters</button>
      </div>
    </form>
  );
}
