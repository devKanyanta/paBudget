'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';

export default function Page() {
  const q = useQuery({ queryKey: ['mod-log'], queryFn: () => api<{ id: string; admin: string; action: string; note: string | null; createdAt: string }[]>('/admin/moderation-log'), staleTime: 0 });
  return (
    <div className="space-y-3"><h1 className="text-xl font-bold">Audit log</h1>
      <ul className="space-y-1 text-sm">{q.data?.map((l) => <li key={l.id} className="card flex flex-wrap justify-between gap-2 p-2"><span><strong>{l.admin}</strong> · {l.action.replace(/_/g, ' ')}{l.note ? ` — ${l.note}` : ''}</span><span className="text-xs text-muted">{timeAgo(l.createdAt)}</span></li>)}</ul>
    </div>
  );
}
