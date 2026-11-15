'use client';
import { useState } from 'react';
import { ErrorText, Field, RequireAuth } from '@/components/ui';
import { useSubmit } from '@/components/submit';
import { usePlace } from '@/components/use-place';

function Form() {
  const { place } = usePlace();
  const { submit, busy, error } = useSubmit('claim');
  const [message, setMessage] = useState(''); const [phone, setPhone] = useState('');
  if (!place) return <p className="text-sm text-muted">Loading…</p>;
  return (
    <form className="mx-auto max-w-md space-y-4" onSubmit={(e) => { e.preventDefault(); void submit({ placeId: place.id, message, contactPhone: phone }); }}>
      <h1 className="text-xl font-bold">Claim {place.name}</h1>
      <p className="text-sm text-muted">Owners and managers can update the menu, photos and hours directly, post deals and reply to reviews. We’ll call the number below to verify you before approving.</p>
      <ErrorText error={error} />
      <Field label="Your role at this business"><textarea className="input" rows={3} required minLength={3} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. I’m the manager" /></Field>
      <Field label="Phone number we can reach you on"><input className="input" required inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
      <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Send claim'}</button>
    </form>
  );
}
export default function Page() { return <RequireAuth><Form /></RequireAuth>; }
