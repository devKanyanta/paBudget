'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { SavedPlan } from '@/lib/types';
import { RequireAuth } from '@/components/ui';
import { kwacha, timeAgo } from '@/lib/format';

export default function Page() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['plans'], queryFn: () => api<SavedPlan[]>('/plans') });
  return (
    <RequireAuth>
      <div className="mx-auto max-w-xl space-y-3">
        <h1 className="text-xl font-bold">Saved plans</h1>
        {q.data?.length === 0 && <p className="text-sm text-muted">Nothing saved yet. <Link className="font-medium text-brand" href="/planner">Plan an outing</Link></p>}
        {q.data?.map((p) => (
          <div key={p.id} className="card flex items-center justify-between gap-3 p-3 text-sm">
            <Link href={`/plan/${p.shareToken}`} className="min-w-0"><strong className="block truncate">{p.title}</strong><span className="text-xs text-muted">{kwacha(p.totalNgwee)} for {p.groupSize} · {timeAgo(p.createdAt)}</span></Link>
            <button className="text-danger" onClick={async () => { await api(`/plans/${p.id}`, { method: 'DELETE' }); await qc.invalidateQueries({ queryKey: ['plans'] }); }}>Delete</button>
          </div>
        ))}
      </div>
    </RequireAuth>
  );
}
