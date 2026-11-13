'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type Row = { id: string; name: string; slug: string; status: string; area: string; category: string; source: string; menuItems: number; images: number; isFeatured: boolean };

export default function Page() {
  const [qs, setQs] = useState('');
  const q = useQuery({ queryKey: ['admin-places', qs], queryFn: () => api<Row[]>(`/admin/places${qs ? `?q=${encodeURIComponent(qs)}` : ''}`) });
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h1 className="text-xl font-bold">Places</h1><Link className="btn-primary" href="/admin/places/new">＋ New place</Link></div>
      <input className="input" placeholder="Search by name" value={qs} onChange={(e) => setQs(e.target.value)} />
      <ul className="space-y-2">
        {q.data?.map((p) => (
          <li key={p.id}><Link href={`/admin/places/${p.id}`} className="card flex items-center justify-between gap-3 p-3 text-sm hover:border-brand">
            <span><strong>{p.name}</strong><span className="block text-xs text-muted">{p.category} · {p.area} · {p.source.toLowerCase()} · {p.menuItems} items · {p.images} photos</span></span>
            <span className={`chip ${p.status === 'LIVE' ? 'chip-active' : ''}`}>{p.status.toLowerCase()}</span>
          </Link></li>
        ))}
      </ul>
    </div>
  );
}
