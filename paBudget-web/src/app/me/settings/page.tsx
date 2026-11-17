'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Meta } from '@/lib/types';
import { useAuth } from '@/components/providers';
import { ErrorText, Field, FormSection, PageHeader } from '@/components/ui';
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
  async function exportData() {
    setErr(null);
    try {
      const data = await api('/me/export');
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = 'pabudget-my-data.json'; a.click(); URL.revokeObjectURL(url);
    } catch (e) { setErr(e); }
  }
  async function del() {
    if (!window.confirm('Delete your account and personal data? This cannot be undone. Places and reviews you contributed stay, without your name.')) return;
    await api('/me', { method: 'DELETE' }); await signOut(); router.replace('/');
  }
  return (
    <div className="max-w-xl space-y-6">
      <PageHeader title="Settings" subtitle="Your profile and preferences." />
      <ErrorText error={err} />
      <form onSubmit={save}>
        <FormSection title="Profile">
          <Field label="Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></Field>
          <Field label="Home area" hint="We’ll show places near here first."><select className="input" value={area} onChange={(e) => setArea(e.target.value)}><option value="">None</option>{meta.data?.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
          <Field label="Usual budget per person (K)"><input className="input" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} /></Field>
          <div className="flex items-center gap-3"><button className="btn-primary">Save changes</button>{msg && <span className="text-sm font-medium text-brand">{msg}</span>}</div>
        </FormSection>
      </form>
      <FormSection title="Your data" hint="Download a copy of everything we hold about you.">
        <button type="button" className="btn-outline" onClick={() => void exportData()}>Download my data</button>
      </FormSection>
      <section className="rounded-xl border border-danger/25 bg-danger-soft p-5">
        <h2 className="font-semibold text-danger">Delete account</h2>
        <p className="mt-0.5 text-sm text-ink-2">Permanently removes your personal data. Places and reviews you contributed stay, without your name.</p>
        <button type="button" className="btn-danger mt-4" onClick={() => void del()}>Delete my account</button>
      </section>
    </div>
  );
}
