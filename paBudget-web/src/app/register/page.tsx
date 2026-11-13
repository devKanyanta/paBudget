'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { AuthResult } from '@/lib/types';
import { useAuth } from '@/components/providers';
import { ErrorText, Field } from '@/components/ui';

function RegisterForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get('next') || '/';
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [err, setErr] = useState<unknown>(null); const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const body = { name: f.name, password: f.password, ...(f.email ? { email: f.email } : {}), ...(f.phone ? { phone: f.phone } : {}) };
      signIn(await api<AuthResult>('/auth/register', { method: 'POST', body, auth: false }));
      router.replace(f.phone ? `/verify-phone?next=${encodeURIComponent(next)}` : next);
    } catch (e) { setErr(e); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="card mx-auto max-w-sm space-y-4 p-5">
      <h1 className="text-xl font-bold">Create account</h1>
      <ErrorText error={err} />
      <Field label="Your name"><input className="input" value={f.name} onChange={set('name')} required /></Field>
      <Field label="Email"><input className="input" type="email" value={f.email} onChange={set('email')} /></Field>
      <Field label="Phone number" hint="Needed to add places, photos and reviews. e.g. 0971234567"><input className="input" inputMode="tel" value={f.phone} onChange={set('phone')} /></Field>
      <Field label="Password" hint="At least 8 characters"><input className="input" type="password" minLength={8} value={f.password} onChange={set('password')} required autoComplete="new-password" /></Field>
      <button className="btn-primary w-full" disabled={busy || (!f.email && !f.phone)}>{busy ? 'Creating…' : 'Sign up'}</button>
      <p className="text-center text-xs text-muted">By signing up you accept our <Link className="underline" href="/terms">terms</Link> and <Link className="underline" href="/privacy">privacy policy</Link>.</p>
      <p className="text-center text-sm text-muted">Have an account? <Link className="font-medium text-brand" href="/login">Log in</Link></p>
    </form>
  );
}
export default function Page() { return <Suspense><RegisterForm /></Suspense>; }
