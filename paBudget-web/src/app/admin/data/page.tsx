'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Meta } from '@/lib/types';
import { ErrorText } from '@/components/ui';

export default function Page() {
  const qc = useQueryClient();
  const meta = useQuery({ queryKey: ['meta'], queryFn: () => api<Meta>('/meta', { auth: false }), staleTime: 0 });
  const [area, setArea] = useState({ name: '', lat: '', lng: '' }); const [cat, setCat] = useState(''); const [tag, setTag] = useState({ name: '', type: 'VIBE' });
  const refresh = () => qc.invalidateQueries({ queryKey: ['meta'] });
  const add = useMutation({ mutationFn: (a: { path: string; body: unknown }) => api(a.path, { method: 'POST', body: a.body }), onSuccess: refresh });
  const del = useMutation({ mutationFn: (path: string) => api(path, { method: 'DELETE' }), onSuccess: refresh });
  const Row = ({ label, path }: { label: string; path: string }) => <li className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-sunken"><span>{label}</span><button className="text-xs text-danger" onClick={() => window.confirm(`Delete ${label}?`) && del.mutate(path)}>Delete</button></li>;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <ErrorText error={add.error ?? del.error} />
      <section className="card space-y-3 p-5"><h2 className="font-semibold">Areas</h2>
        <ul className="max-h-64 overflow-auto text-sm">{meta.data?.areas.map((a) => <Row key={a.id} label={a.name} path={`/admin/areas/${a.id}`} />)}</ul>
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); add.mutate({ path: '/admin/areas', body: { name: area.name, lat: Number(area.lat), lng: Number(area.lng) } }); setArea({ name: '', lat: '', lng: '' }); }}>
          <input className="input" placeholder="Name" value={area.name} onChange={(e) => setArea({ ...area, name: e.target.value })} required />
          <div className="flex gap-2"><input className="input" placeholder="Lat" value={area.lat} onChange={(e) => setArea({ ...area, lat: e.target.value })} required /><input className="input" placeholder="Lng" value={area.lng} onChange={(e) => setArea({ ...area, lng: e.target.value })} required /></div>
          <button className="btn-primary w-full">Add area</button></form></section>
      <section className="card space-y-3 p-5"><h2 className="font-semibold">Categories</h2>
        <ul className="text-sm">{meta.data?.categories.map((c) => <Row key={c.id} label={c.name} path={`/admin/categories/${c.id}`} />)}</ul>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add.mutate({ path: '/admin/categories', body: { name: cat } }); setCat(''); }}><input className="input" value={cat} onChange={(e) => setCat(e.target.value)} placeholder="New category" required /><button className="btn-primary">Add</button></form></section>
      <section className="card space-y-3 p-5"><h2 className="font-semibold">Vibe & feature tags</h2>
        <ul className="max-h-64 overflow-auto text-sm">{meta.data?.tags.map((t) => <Row key={t.id} label={`${t.name} (${t.type.toLowerCase()})`} path={`/admin/tags/${t.id}`} />)}</ul>
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); add.mutate({ path: '/admin/tags', body: tag }); setTag({ ...tag, name: '' }); }}>
          <input className="input" placeholder="New tag" value={tag.name} onChange={(e) => setTag({ ...tag, name: e.target.value })} required />
          <select className="input" value={tag.type} onChange={(e) => setTag({ ...tag, type: e.target.value })}><option value="VIBE">Vibe</option><option value="FEATURE">Feature</option></select>
          <button className="btn-primary w-full">Add tag</button></form></section>
    </div>
  );
}
