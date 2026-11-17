'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { MySubmission } from '@/lib/types';
import { EmptyState, Loading, PageHeader } from '@/components/ui';
import { PenLine } from 'lucide-react';
import { timeAgo } from '@/lib/format';

const LABEL: Record<string, string> = { NEW_PLACE: 'New place', MENU: 'Menu', PHOTOS: 'Photos', REVIEW: 'Review', EDIT: 'Edit', FLAG: 'Report', CLAIM: 'Ownership claim' };
const STATUS: Record<string, { text: string; cls: string }> = {
  PENDING: { text: 'In review', cls: 'badge-amber' }, APPROVED: { text: 'Approved', cls: 'badge-green' },
  AUTO_PUBLISHED: { text: 'Published', cls: 'badge-green' }, REJECTED: { text: 'Rejected', cls: 'badge-red' },
};

export default function Page() {
  const q = useQuery({ queryKey: ['mine'], queryFn: () => api<{ stats: { trustLevel: string; points: number; approved: number; rejected: number } | null; items: MySubmission[] }>('/submissions/mine') });
  return (
    <>
      <PageHeader title="My contributions" subtitle="Everything you’ve added, and where it stands." action={<Link href="/contribute/place" className="btn-primary btn-sm">Add a place</Link>} />
      {q.isLoading && <Loading rows={3} />}
      {q.data?.stats && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="card p-4"><div className="num text-3xl font-bold text-brand">{q.data.stats.points}</div><div className="text-xs text-muted">Points</div></div>
          <div className="card p-4"><div className="num text-3xl font-bold">{q.data.stats.approved}</div><div className="text-xs text-muted">Approved</div></div>
          <div className="card p-4"><div className="text-lg font-bold">{q.data.stats.trustLevel === 'TRUSTED' ? 'Trusted' : 'New'}</div><div className="text-xs text-muted">Contributor level</div></div>
        </div>
      )}
      {q.data?.items.length === 0 && <EmptyState icon={PenLine} title="No contributions yet" body="Add a place, a menu or a review for somewhere you’ve visited." action={<Link className="btn-primary" href="/contribute/place">Add a place</Link>} />}
      <ul className="space-y-3">
        {q.data?.items.map((s) => (
          <li key={s.id} className="card p-4 text-sm">
            <div className="flex items-start justify-between gap-3"><div><strong>{LABEL[s.type] ?? s.type}</strong>{s.summary && <span className="text-muted"> · {s.summary}</span>}<div className="mt-0.5 text-xs text-muted">{timeAgo(s.createdAt)}</div></div><span className={`badge ${STATUS[s.status]?.cls ?? 'badge-gray'}`}>{STATUS[s.status]?.text ?? s.status}</span></div>
            {s.rejectReason && <p className="mt-2 rounded-lg bg-danger-soft p-2.5 text-xs text-danger">Reason: {s.rejectReason}</p>}
          </li>
        ))}
      </ul>
    </>
  );
}
