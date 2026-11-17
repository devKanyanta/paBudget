'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ErrorText } from '@/components/ui';

type U = { id: string; name: string; email: string | null; phone: string | null; role: string; trustLevel: string; points: number; approved: number; rejected: number };

export default function Page() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const users = useQuery({ queryKey: ['admin-users', q], queryFn: () => api<U[]>(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`) });
  const trust = useMutation({ mutationFn: (a: { id: string; trustLevel: string }) => api(`/admin/users/${a.id}/trust`, { method: 'PUT', body: { trustLevel: a.trustLevel } }), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }) });
  return (
    <div className="space-y-3">
      <h1 className="page-title">Users</h1>
      <input className="input" placeholder="Search name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      <ErrorText error={trust.error} />
      <ul className="card divide-y divide-border">
        {users.data?.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <span><strong>{u.name}</strong> <span className="badge badge-gray ml-1">{u.role.toLowerCase()}</span><span className="block text-xs text-muted">{u.email ?? u.phone} · {u.approved} ✓ / {u.rejected} ✗ · {u.points} pts</span></span>
            <select className="input !w-auto" value={u.trustLevel} onChange={(e) => { if (e.target.value !== 'BANNED' || window.confirm(`Ban ${u.name}?`)) trust.mutate({ id: u.id, trustLevel: e.target.value }); }} aria-label="Trust level">
              <option value="NEW">New</option><option value="TRUSTED">Trusted</option><option value="BANNED">Banned</option>
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
}
