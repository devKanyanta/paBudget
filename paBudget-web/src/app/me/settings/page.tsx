'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Meta } from '@/lib/types';
import { useAuth } from '@/components/providers';
import { ErrorText, Field, RequireAuth } from '@/components/ui';
import { toNgwee } from '@/lib/format';

export default function Page() {
  const { user, reload, signOut } = useAuth();
  const router = useRouter();
  const meta = useQuery({ queryKey: ['meta'], queryFn: () => api<Meta>('/meta', { auth: false }) });
  const [name, setName] = useState(''); const [area, setArea] = useState(''); const [budget, setBudget] = useState('');
  const [msg, setMsg] = useState(''); const [err, setErr] = useState<unknown>(null);
  useEffect(() => { if (user) { setName(user.name); setArea(user.homeAreaId ?? ''); setBudget(user.defaultBudgetNgwee ? String(user.defaultBudgetNgwee / 100) : ''); } }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setMsg('');
    try { await api('/me', { method: 'PATCH', body: { name, homeAreaId: area || null, defaultBudgetNgwee: budget ? toNgwee(budget) : null } }); await reload(); setMsg('Saved'); } catch (e) { setErr(e); }
  }
  async function del() {
    if (!window.confirm('Delete your account and personal data? This cannot be undone. Places and reviews you contributed stay, without your name.')) return;
    await api('/me', { method: 'DELETE' }); await signOut(); router.replace('/');
  }
  return (
    <RequireAuth>
      <form onSubmit={save} className="card mx-auto max-w-md space-y-4 p-5">
        <h1 className="text-xl font-bold">Settings</h1>
        <ErrorText error={err} />
        <Field label="Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        <Field label="Home area"><select className="input" value={area} onChange={(e) => setArea(e.target.value)}><option value="">—</option>{meta.data?.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
        <Field label="Usual budget per person (K)"><input className="input" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} /></Field>
        <button className="btn-primary w-full">Save</button>
        {msg && <p className="text-center text-sm text-brand">{msg}</p>}
        <hr className="border-border" />
        <button type="button" className="btn-outline w-full text-danger" onClick={() => void del()}>Delete my account</button>
      </form>
    </RequireAuth>
  );
}
