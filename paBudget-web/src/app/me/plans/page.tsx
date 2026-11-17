'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ListChecks, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { SavedPlan } from '@/lib/types';
import { EmptyState, Loading, PageHeader } from '@/components/ui';
import { kwacha, timeAgo } from '@/lib/format';

export default function Page() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['plans'], queryFn: () => api<SavedPlan[]>('/plans') });
  return (
    <>
      <PageHeader title="Saved plans" subtitle="Outings you’ve planned with the budget planner." action={<Link href="/planner" className="btn-primary btn-sm">New plan</Link>} />
      {q.isLoading && <Loading rows={2} />}
      {q.data?.length === 0 && <EmptyState icon={ListChecks} title="No saved plans" body="Plan an outing and save it to share with friends." action={<Link className="btn-primary" href="/planner">Plan an outing</Link>} />}
      <ul className="space-y-3">
        {q.data?.map((p) => (
          <li key={p.id} className="card flex items-center justify-between gap-3 p-4 text-sm">
            <Link href={`/plan/${p.shareToken}`} className="min-w-0 flex-1"><strong className="block truncate text-base">{p.title}</strong><span className="text-xs text-muted">{kwacha(p.totalNgwee)} for {p.groupSize} · {timeAgo(p.createdAt)}</span></Link>
            <button className="btn-ghost btn-sm text-danger" aria-label={`Delete ${p.title}`} onClick={async () => { if (!window.confirm('Delete this plan?')) return; await api(`/plans/${p.id}`, { method: 'DELETE' }); await qc.invalidateQueries({ queryKey: ['plans'] }); }}><Trash2 aria-hidden className="size-4" /></button>
          </li>
        ))}
      </ul>
    </>
  );
}
