'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { ErrorText, Field } from '@/components/ui';

function Form() {
  const sp = useSearchParams();
  const [f, setF] = useState({ targetType: sp.get('type') ?? 'place', targetId: sp.get('id') ?? '', reason: '', contactName: '', contactEmail: '' });
  const [err, setErr] = useState<unknown>(null); const [done, setDone] = useState(false); const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  if (done) return <div className="card mx-auto max-w-md space-y-2 p-5"><h1 className="text-xl font-bold">Request received</h1><p className="text-sm">Thank you. We review takedown requests within 72 hours and will contact you by email.</p></div>;
  return (
    <form className="card mx-auto max-w-md space-y-4 p-5" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr(null);
      try { await api('/takedowns', { method: 'POST', auth: false, body: { ...f, targetId: f.targetId || undefined } }); setDone(true); } catch (x) { setErr(x); } finally { setBusy(false); }
    }}>
      <h1 className="text-xl font-bold">Report content or request removal</h1>
      <p className="text-sm text-muted">Use this if a photo, review or listing uses your content without permission, shows you, or contains personal information. We act within 72 hours.</p>
      <ErrorText error={err} />
      <Field label="What should we look at?"><select className="input" value={f.targetType} onChange={set('targetType')}><option value="place">A place listing</option><option value="image">A photo</option><option value="review">A review</option><option value="other">Something else</option></select></Field>
      <Field label="Link or ID (optional)" hint="Paste the page address if you can."><input className="input" value={f.targetId} onChange={set('targetId')} /></Field>
      <Field label="What’s the problem?"><textarea className="input" rows={4} required minLength={10} maxLength={2000} value={f.reason} onChange={set('reason')} /></Field>
      <Field label="Your name"><input className="input" required value={f.contactName} onChange={set('contactName')} /></Field>
      <Field label="Your email"><input className="input" type="email" required value={f.contactEmail} onChange={set('contactEmail')} /></Field>
      <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
    </form>
  );
}
export default function Page() { return <Suspense><Form /></Suspense>; }
