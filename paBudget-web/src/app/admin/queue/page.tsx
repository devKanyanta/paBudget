'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AdminSubmission } from '@/lib/types';
import { ErrorText } from '@/components/ui';
import { kwacha, timeAgo } from '@/lib/format';

const LABEL: Record<string, string> = { NEW_PLACE: 'New place', MENU: 'Menu', PHOTOS: 'Photos', REVIEW: 'Review', EDIT: 'Edit', FLAG: 'Report', CLAIM: 'Claim' };

function scoreCls(n: number | null) { return n == null ? 'bg-border' : n >= 80 ? 'bg-brand text-white' : n >= 50 ? 'bg-accent text-black' : 'bg-danger text-white'; }

function Detail({ s }: { s: AdminSubmission }) {
  const p = s.payload;
  return (
    <div className="space-y-2 text-sm">
      {s.placeName && <p className="text-muted">On <strong>{s.placeName}</strong></p>}
      {s.type === 'NEW_PLACE' && <p><strong>{p.name}</strong> · {p.address ?? ''} · {p.lat?.toFixed?.(4)}, {p.lng?.toFixed?.(4)} {p.phone ? `· ${p.phone}` : ''}</p>}
      {p.description && <p>{p.description}</p>}
      {s.type === 'REVIEW' && <p>{'★'.repeat(p.rating)} {p.body} {p.amountPaidNgwee != null && <span className="text-muted">· paid {kwacha(p.amountPaidNgwee)}{p.groupSize ? ` for ${p.groupSize}` : ''}</span>}</p>}
      {(p.sections ?? p.menu?.sections)?.map((sec: any) => (
        <div key={sec.name}><strong className="text-brand">{sec.name}</strong><ul className="ml-4 list-disc">{sec.items.map((i: any) => <li key={i.name}>{i.name} — {kwacha(i.priceNgwee)}</li>)}</ul></div>
      ))}
      {s.type === 'EDIT' && <pre className="overflow-x-auto rounded bg-brand-soft p-2 text-xs">{JSON.stringify(p, null, 1)}</pre>}
      {s.type === 'FLAG' && <p>Report on {p.targetType}: <em>{p.reason}</em></p>}
      {s.type === 'CLAIM' && <p>{p.message} · {p.contactPhone}</p>}
      {s.images.length > 0 && <div className="flex flex-wrap gap-2">{s.images.map((i) => /* eslint-disable-next-line @next/next/no-img-element */ <a key={i.id} href={i.full} target="_blank" rel="noreferrer"><img src={i.thumb} alt="" className="h-24 w-24 rounded-lg object-cover" /></a>)}</div>}
    </div>
  );
}

export default function Page() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'PENDING' | 'SPOT'>('PENDING');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const q = useQuery({ queryKey: ['queue', tab], queryFn: () => api<{ total: number; items: AdminSubmission[] }>(tab === 'PENDING' ? '/admin/submissions?status=PENDING' : '/admin/submissions?status=AUTO_PUBLISHED&spot=true') });
  const done = () => { setSel(new Set()); setEditing(null); void qc.invalidateQueries({ queryKey: ['queue'] }); void qc.invalidateQueries({ queryKey: ['admin-stats'] }); };
  const act = useMutation({
    mutationFn: async (a: { kind: 'approve' | 'reject' | 'revoke' | 'ok'; id: string; payload?: unknown }) => {
      if (a.kind === 'approve') return api(`/admin/submissions/${a.id}/approve`, { method: 'POST', body: a.payload ? { payload: a.payload } : {} });
      if (a.kind === 'ok') return api(`/admin/submissions/${a.id}/spot-checked`, { method: 'POST' });
      const reason = window.prompt(a.kind === 'reject' ? 'Reason shown to the contributor:' : 'Why is this being removed?');
      if (!reason) return;
      return api(`/admin/submissions/${a.id}/${a.kind}`, { method: 'POST', body: { reason } });
    },
    onSuccess: done,
  });
  const batch = useMutation({
    mutationFn: (action: 'approve' | 'reject') => {
      let reason: string | null | undefined;
      if (action === 'reject') { reason = window.prompt('Reason for rejecting all selected:'); if (!reason) return Promise.resolve(); }
      return api('/admin/submissions/batch', { method: 'POST', body: { action, ids: [...sel], reason } });
    },
    onSuccess: done,
  });
  const items = q.data?.items ?? [];
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const safe = items.filter((i) => (i.aiScore ?? 0) >= 80).map((i) => i.id);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Moderation queue {q.data && <span className="text-muted">({q.data.total})</span>}</h1>
        <div className="flex gap-1"><button className={`chip ${tab === 'PENDING' ? 'chip-active' : ''}`} onClick={() => setTab('PENDING')}>Pending</button><button className={`chip ${tab === 'SPOT' ? 'chip-active' : ''}`} onClick={() => setTab('SPOT')}>Spot-checks</button></div>
      </div>
      <ErrorText error={act.error ?? batch.error} />
      {tab === 'PENDING' && items.length > 0 && (
        <div className="sticky top-14 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background p-2 text-sm">
          <button className="chip" onClick={() => setSel(new Set(safe))}>Select low-risk ({safe.length})</button>
          <button className="chip" onClick={() => setSel(new Set())}>Clear</button>
          <span className="text-muted">{sel.size} selected</span>
          <button className="btn-primary !py-1.5" disabled={!sel.size || batch.isPending} onClick={() => batch.mutate('approve')}>Approve</button>
          <button className="btn-outline !py-1.5" disabled={!sel.size || batch.isPending} onClick={() => batch.mutate('reject')}>Reject</button>
        </div>
      )}
      {q.isSuccess && items.length === 0 && <p className="card p-6 text-center text-sm text-muted">{tab === 'PENDING' ? 'All caught up 🎉' : 'Nothing to spot-check.'}</p>}
      {items.map((s) => (
        <article key={s.id} className="card space-y-3 p-3">
          <header className="flex items-start gap-2">
            {tab === 'PENDING' && <input type="checkbox" className="mt-1.5 h-5 w-5" aria-label="Select" checked={sel.has(s.id)} onChange={() => toggle(s.id)} />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><span className="chip chip-active">{LABEL[s.type] ?? s.type}</span><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${scoreCls(s.aiScore)}`}>AI {s.aiScore ?? '—'}</span><span className="text-xs text-muted">{timeAgo(s.createdAt)}</span></div>
              <p className="text-xs text-muted">by {s.user.name} · {s.user.trustLevel.toLowerCase()} · {s.user.approved} ✓ / {s.user.rejected} ✗</p>
            </div>
          </header>
          {s.aiReasons && s.aiReasons.length > 0 && <ul className="rounded-lg bg-accent/15 p-2 text-xs">{s.aiReasons.map((r, i) => <li key={i}>⚠ {r}</li>)}</ul>}
          <Detail s={s} />
          {editing?.id === s.id && <textarea className="input h-48 font-mono text-xs" value={editing.text} onChange={(e) => setEditing({ id: s.id, text: e.target.value })} />}
          <footer className="flex flex-wrap gap-2">
            {tab === 'PENDING' ? (<>
              {editing?.id === s.id
                ? <button className="btn-primary" onClick={() => { try { act.mutate({ kind: 'approve', id: s.id, payload: JSON.parse(editing.text) }); } catch { window.alert('Invalid JSON'); } }}>Save & approve</button>
                : <button className="btn-primary" disabled={act.isPending} onClick={() => act.mutate({ kind: 'approve', id: s.id })}>Approve</button>}
              <button className="btn-outline" disabled={act.isPending} onClick={() => act.mutate({ kind: 'reject', id: s.id })}>Reject…</button>
              <button className="btn-outline" onClick={() => setEditing(editing?.id === s.id ? null : { id: s.id, text: JSON.stringify(s.payload, null, 2) })}>{editing?.id === s.id ? 'Cancel edit' : 'Edit…'}</button>
            </>) : (<>
              <button className="btn-primary" onClick={() => act.mutate({ kind: 'ok', id: s.id })}>Looks fine</button>
              <button className="btn-danger" onClick={() => act.mutate({ kind: 'revoke', id: s.id })}>Remove…</button>
            </>)}
          </footer>
        </article>
      ))}
    </div>
  );
}
