'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, tokenStore } from '@/lib/api';
import type { AuthResult } from '@/lib/types';
import { useAuth } from '@/components/providers';
import { ErrorText, Field } from '@/components/ui';

function Verify() {
  const { user, signIn, reload } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/';
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [code, setCode] = useState(''); const [name, setName] = useState('');
  const [sent, setSent] = useState(false); const [err, setErr] = useState<unknown>(null); const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await api('/auth/otp/request', { method: 'POST', body: { phone }, auth: false }); setSent(true); } catch (e) { setErr(e); } finally { setBusy(false); }
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const r = await api<AuthResult>('/auth/otp/verify', { method: 'POST', body: { phone, code, name: name || undefined } });
      if (tokenStore.get() && user) { tokenStore.set({ accessToken: r.accessToken, refreshToken: r.refreshToken }); await reload(); } else signIn(r);
      router.replace(next);
    } catch (e) { setErr(e); } finally { setBusy(false); }
  }
  return (
    <div className="card mx-auto max-w-sm space-y-4 p-5">
      <h1 className="text-xl font-bold">{user ? 'Verify your phone' : 'Sign in with a phone code'}</h1>
      <ErrorText error={err} />
      {!sent ? (
        <form onSubmit={send} className="space-y-4">
          <Field label="Phone number" hint="We’ll text you a 6-digit code."><input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="0971234567" /></Field>
          <button className="btn-primary w-full" disabled={busy}>Send code</button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          <Field label="6-digit code"><input className="input tracking-widest" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} required autoFocus /></Field>
          {!user && <Field label="Your name (new accounts)"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>}
          <button className="btn-primary w-full" disabled={busy || code.length !== 6}>Verify</button>
          <button type="button" className="text-sm text-muted underline" onClick={() => setSent(false)}>Use a different number</button>
        </form>
      )}
    </div>
  );
}
export default function Page() { return <Suspense><Verify /></Suspense>; }
