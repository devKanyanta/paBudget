'use client';
import { useRouter, useSearchParams } from 'next/navigation';
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

  return (
    <form onSubmit={submit} className="card space-y-3 p-3">
      <input className="input" placeholder="Search place, dish or area" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="grid grid-cols-3 gap-2">
        <div><label className="label text-xs">Per person (K)</label><input className="input" inputMode="decimal" placeholder="e.g. 150" value={maxPp} onChange={(e) => { setMaxPp(e.target.value); setTotal(''); setGroup(''); }} /></div>
        <div><label className="label text-xs">Or total (K)</label><input className="input" inputMode="decimal" placeholder="e.g. 400" value={total} onChange={(e) => { setTotal(e.target.value); setMaxPp(''); }} /></div>
        <div><label className="label text-xs">Group size</label><input className="input" inputMode="numeric" placeholder="2" value={group} onChange={(e) => setGroup(e.target.value.replace(/\D/g, ''))} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select className="input" value={sp.get('area') ?? ''} onChange={(e) => push({ area: e.target.value || undefined })} aria-label="Area">
          <option value="">All areas</option>{meta.areas.map((a) => <option key={a.id} value={a.slug}>{a.name}</option>)}
        </select>
        <select className="input" value={sp.get('category') ?? ''} onChange={(e) => push({ category: e.target.value || undefined })} aria-label="Category">
          <option value="">All types</option>{meta.categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <select className="input" value={sp.get('sort') ?? ''} onChange={(e) => push({ sort: e.target.value || undefined })} aria-label="Sort">
          <option value="">Top rated</option><option value="cheapest">Cheapest</option><option value="nearest">Nearest</option><option value="newest">Newest</option>
        </select>
        <label className="chip justify-center gap-2"><input type="checkbox" checked={sp.get('openNow') === 'true'} onChange={(e) => push({ openNow: e.target.checked ? 'true' : undefined })} /> Open now</label>
      </div>
      <div className="flex flex-wrap gap-2">
        {meta.tags.map((t) => <button type="button" key={t.id} onClick={() => toggleTag(t.slug)} className={`chip ${tags.includes(t.slug) ? 'chip-active' : ''}`}>{t.name}</button>)}
        <button type="button" onClick={near} className="chip">📍 Near me</button>
      </div>
      <div className="flex gap-2"><button className="btn-primary flex-1">Search</button><button type="button" className="btn-outline" onClick={() => router.push('/places')}>Clear</button></div>
    </form>
  );
}
