'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { AuthResult } from '@/lib/types';
import { useAuth } from '@/components/providers';
import { ErrorText, Field } from '@/components/ui';

function LoginForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get('next') || '/';
  const [id, setId] = useState(''); const [pw, setPw] = useState('');
  const [err, setErr] = useState<unknown>(null); const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const body = id.includes('@') ? { email: id, password: pw } : { phone: id, password: pw };
      signIn(await api<AuthResult>('/auth/login', { method: 'POST', body, auth: false }));
      router.replace(next);
    } catch (e) { setErr(e); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="card mx-auto max-w-sm space-y-4 p-5">
      <h1 className="text-xl font-bold">Log in</h1>
      <ErrorText error={err} />
      <Field label="Email or phone"><input className="input" value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" required /></Field>
      <Field label="Password"><input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" required /></Field>
      <button className="btn-primary w-full" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      <p className="text-center text-sm text-muted">New here? <Link className="font-medium text-brand" href={`/register?next=${encodeURIComponent(next)}`}>Create an account</Link></p>
    </form>
  );
}
export default function Page() { return <Suspense><LoginForm /></Suspense>; }
