'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Takedown } from '@/lib/types';
import { ErrorText } from '@/components/ui';
import { timeAgo } from '@/lib/format';

export default function Page() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('OPEN'); const [err, setErr] = useState<unknown>(null);
  const q = useQuery({ queryKey: ['takedowns', status], queryFn: () => api<Takedown[]>(`/admin/takedowns?status=${status}`), staleTime: 0 });
  async function resolve(t: Takedown, action: 'remove' | 'dismiss') {
    const note = window.prompt(action === 'remove' ? 'Note (content will be hidden):' : 'Why dismiss?') ?? undefined;
    setErr(null);
    try { await api(`/admin/takedowns/${t.id}/resolve`, { method: 'POST', body: { action, note: note || undefined } }); await qc.invalidateQueries({ queryKey: ['takedowns'] }); } catch (e) { setErr(e); }
  }
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Takedown requests</h1>
      <div className="flex gap-2">{['OPEN', 'ACTIONED', 'DISMISSED'].map((s) => <button key={s} className={s === status ? 'chip-active' : 'chip'} onClick={() => setStatus(s)}>{s.toLowerCase()}</button>)}</div>
      <ErrorText error={err} />
      {q.data?.length === 0 && <p className="text-sm text-muted">Nothing here.</p>}
      {q.data?.map((t) => (
        <div key={t.id} className={`card space-y-1 p-3 text-sm ${t.overdue ? 'border-danger' : ''}`}>
          <div className="flex justify-between"><strong>{t.targetType}{t.targetId ? ` · ${t.targetId}` : ''}</strong><span className={t.overdue ? 'font-bold text-danger' : 'text-xs text-muted'}>{t.status === 'OPEN' ? (t.overdue ? 'OVERDUE' : `due ${new Date(t.dueAt).toLocaleString()}`) : timeAgo(t.createdAt)}</span></div>
          <p>{t.reason}</p>
          <p className="text-xs text-muted">{t.contactName} · <a className="underline" href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a></p>
          {t.note && <p className="text-xs">Note: {t.note}</p>}
          {t.status === 'OPEN' && <div className="flex gap-2 pt-1"><button className="btn-danger !py-1.5" onClick={() => void resolve(t, 'remove')}>Remove content</button><button className="btn-outline !py-1.5" onClick={() => void resolve(t, 'dismiss')}>Dismiss</button></div>}
        </div>
      ))}
    </div>
  );
}
