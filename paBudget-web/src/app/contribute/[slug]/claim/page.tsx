'use client';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { ErrorText, Field, RequireAuth, Loading } from '@/components/ui';
import { useSubmit } from '@/components/submit';
import { usePlace } from '@/components/use-place';

function Form() {
  const { place } = usePlace();
  const { submit, busy, error } = useSubmit('claim');
  const [message, setMessage] = useState(''); const [phone, setPhone] = useState('');
  if (!place) return <div className="mx-auto max-w-2xl"><Loading rows={2} /></div>;
  return (
    <form className="card mx-auto max-w-2xl space-y-5 p-6 sm:p-8" onSubmit={(e) => { e.preventDefault(); void submit({ placeId: place.id, message, contactPhone: phone }); }}>
      <Link href={`/places/${place.slug}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-brand"><ChevronLeft aria-hidden className="size-4" />{place.name}</Link>
      <h1 className="page-title">Claim {place.name}</h1>
      <p className="text-sm text-muted">Owners and managers can update the menu, photos and hours directly, post deals and reply to reviews. We’ll call the number below to verify you before approving.</p>
      <ErrorText error={error} />
      <Field label="Your role at this business"><textarea className="input" rows={3} required minLength={3} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. I’m the manager" /></Field>
      <Field label="Phone number we can reach you on"><input className="input" required inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
      <button className="btn-primary w-full !py-3" disabled={busy}>{busy ? 'Sending…' : 'Send claim'}</button>
    </form>
  );
}
export default function Page() { return <RequireAuth><Form /></RequireAuth>; }
