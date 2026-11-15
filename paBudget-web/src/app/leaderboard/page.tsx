'use client';
import { useState } from 'react';
import { Lock, Medal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { BadgeRow, LeaderRow, Meta } from '@/lib/types';
import { useAuth } from '@/components/providers';

export default function Page() {
  const { user } = useAuth();
  const [area, setArea] = useState(''); const [period, setPeriod] = useState<'all' | 'month'>('all');
  const meta = useQuery({ queryKey: ['meta'], queryFn: () => api<Meta>('/meta', { auth: false }) });
  const q = useQuery({ queryKey: ['leaders', area, period], queryFn: () => api<LeaderRow[]>(`/leaderboard?period=${period}${area ? `&area=${area}` : ''}`) });
  const badges = useQuery({ queryKey: ['badges'], queryFn: () => api<BadgeRow[]>('/me/badges'), enabled: !!user });
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-bold">Top contributors</h1>
      <p className="text-sm text-muted">Points for places, menus, photos and reviews that pass review: place 20, menu 15, photos 5, review 5.</p>
      <div className="flex flex-wrap gap-2">
        <select className="input !w-auto" aria-label="Area" value={area} onChange={(e) => setArea(e.target.value)}><option value="">All Lusaka</option>{meta.data?.areas.map((a) => <option key={a.id} value={a.slug}>{a.name}</option>)}</select>
        <select className="input !w-auto" aria-label="Period" value={period} onChange={(e) => setPeriod(e.target.value as 'all' | 'month')}><option value="all">All time</option><option value="month">Last 30 days</option></select>
      </div>
      {q.data?.length === 0 && <p className="text-sm text-muted">No contributions here yet — be the first!</p>}
      <ol className="space-y-2">
        {q.data?.map((r) => (
          <li key={r.rank} className={`card flex items-center gap-3 p-3 text-sm ${r.isMe ? 'ring-2 ring-brand' : ''}`}>
            <span className="w-6 text-center text-lg font-extrabold text-brand">{r.rank}</span>
            <span className="flex-1 font-medium">{r.name}{r.isMe ? ' (you)' : ''}</span>
            <span className="text-xs text-muted">{r.badges} badge{r.badges === 1 ? '' : 's'}</span>
            <strong className="tabular-nums">{r.points} pts</strong>
          </li>
        ))}
      </ol>
      {badges.data && (
        <section>
          <h2 className="mb-2 font-bold">Your badges</h2>
          <div className="grid grid-cols-2 gap-2">{badges.data.map((b) => (
            <div key={b.id} className={`card p-3 text-sm ${b.earnedAt ? '' : 'opacity-50'}`}>{b.earnedAt ? <Medal aria-hidden className="mb-1 size-5 text-accent" /> : <Lock aria-hidden className="mb-1 size-5 text-faint" />}<strong>{b.name}</strong><div className="text-xs text-muted">{b.rule.replace('>=', ' ≥ ')}</div></div>
          ))}</div>
        </section>
      )}
    </div>
  );
}
