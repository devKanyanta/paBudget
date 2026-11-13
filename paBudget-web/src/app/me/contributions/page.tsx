'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { MySubmission } from '@/lib/types';
import { RequireAuth } from '@/components/ui';
import { timeAgo } from '@/lib/format';

const LABEL: Record<string, string> = { NEW_PLACE: 'New place', MENU: 'Menu', PHOTOS: 'Photos', REVIEW: 'Review', EDIT: 'Edit', FLAG: 'Report', CLAIM: 'Ownership claim' };
const STATUS: Record<string, { text: string; cls: string }> = {
  PENDING: { text: 'In review', cls: 'text-accent' }, APPROVED: { text: 'Approved', cls: 'text-brand' },
  AUTO_PUBLISHED: { text: 'Published', cls: 'text-brand' }, REJECTED: { text: 'Rejected', cls: 'text-danger' },
};

export default function Page() {
  const q = useQuery({ queryKey: ['mine'], queryFn: () => api<{ stats: { trustLevel: string; points: number; approved: number; rejected: number } | null; items: MySubmission[] }>('/submissions/mine') });
  return (
    <RequireAuth>
      <h1 className="mb-3 text-xl font-bold">My contributions</h1>
      {q.data?.stats && (
        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          <div className="card p-3"><div className="text-2xl font-extrabold text-brand">{q.data.stats.points}</div><div className="text-xs text-muted">points</div></div>
          <div className="card p-3"><div className="text-2xl font-extrabold">{q.data.stats.approved}</div><div className="text-xs text-muted">approved</div></div>
          <div className="card p-3"><div className="text-sm font-bold">{q.data.stats.trustLevel === 'TRUSTED' ? 'Trusted' : 'New'}</div><div className="text-xs text-muted">contributor</div></div>
        </div>
      )}
      {q.data?.items.length === 0 && <p className="text-sm text-muted">You haven’t contributed yet. <Link className="font-medium text-brand" href="/contribute/place">Add a place</Link> or write a review on one you’ve visited.</p>}
      <ul className="space-y-2">
        {q.data?.items.map((s) => (
          <li key={s.id} className="card p-3 text-sm">
            <div className="flex justify-between"><strong>{LABEL[s.type] ?? s.type}{s.summary ? ` · ${s.summary}` : ''}</strong><span className={`font-medium ${STATUS[s.status]?.cls}`}>{STATUS[s.status]?.text}</span></div>
            <div className="text-xs text-muted">{timeAgo(s.createdAt)}</div>
            {s.rejectReason && <p className="mt-1 text-danger">Reason: {s.rejectReason}</p>}
          </li>
        ))}
      </ul>
    </RequireAuth>
  );
}
