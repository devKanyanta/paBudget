'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function Page() {
  const s = useQuery({ queryKey: ['admin-stats'], queryFn: () => api<{ users: number; livePlaces: number; pendingSubmissions: number; submissionsLast24h: number; approvalRate: number | null }>('/admin/stats'), refetchInterval: 30_000 });
  const d = s.data;
  const tiles: [string, string | number | undefined, string?][] = [
    ['Waiting for review', d?.pendingSubmissions, '/admin/queue'], ['Live places', d?.livePlaces, '/admin/places'], ['Users', d?.users, '/admin/users'],
    ['Submissions (24h)', d?.submissionsLast24h], ['Approval rate', d?.approvalRate != null ? `${Math.round(d.approvalRate * 100)}%` : '—'],
  ];
  return (
    <div className="space-y-4">
      <div><h1 className="page-title">Overview</h1><p className="page-sub">What needs attention right now.</p></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {tiles.map(([label, v, href]) => {
          const inner = <div className={`card p-5 transition ${href ? 'hover:shadow-pop' : ''}`}><div className="text-sm text-muted">{label}</div><div className="num mt-1 text-3xl font-bold">{v ?? <span className="skeleton inline-block h-8 w-12 align-middle" />}</div></div>;
          return href ? <Link key={label} href={href}>{inner}</Link> : <div key={label}>{inner}</div>;
        })}
      </div>
    </div>
  );
}
