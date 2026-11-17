'use client';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ErrorText, Field, RequireAuth, Loading } from '@/components/ui';
import { useSubmit } from '@/components/submit';
import { usePlace } from '@/components/use-place';

function Form() {
  const { place } = usePlace();
  const { submit, busy, error } = useSubmit('edit');
  const [f, setF] = useState({ phone: '', address: '', opens: '', closes: '', closed: false });
  useEffect(() => { if (place) setF((s) => ({ ...s, phone: place.phone ?? '', address: place.address ?? '' })); }, [place]);
  if (!place) return <div className="mx-auto max-w-2xl"><Loading rows={2} /></div>;
  return (
    <form className="card mx-auto max-w-2xl space-y-5 p-6 sm:p-8" onSubmit={(e) => {
      e.preventDefault();
      const body: Record<string, unknown> = { placeId: place.id };
      if (f.phone !== (place.phone ?? '') && f.phone) body.phone = f.phone;
      if (f.address !== (place.address ?? '') && f.address) body.address = f.address;
      if (f.opens && f.closes) body.hours = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opensAt: f.opens, closesAt: f.closes }));
      if (f.closed) body.closedPermanently = true;
      void submit(body);
    }}>
      <Link href={`/places/${place.slug}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-brand"><ChevronLeft aria-hidden className="size-4" />{place.name}</Link>
      <h1 className="page-title">Suggest an edit to {place.name}</h1>
      <ErrorText error={error} />
      <Field label="Phone"><input className="input" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
      <Field label="Address / landmark"><input className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="New opening time"><input className="input" type="time" value={f.opens} onChange={(e) => setF({ ...f, opens: e.target.value })} /></Field>
        <Field label="New closing time"><input className="input" type="time" value={f.closes} onChange={(e) => setF({ ...f, closes: e.target.value })} /></Field>
      </div>
      <p className="-mt-2 text-xs text-muted">Times apply to every day. For different hours on certain days, leave a note via “Report”.</p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.closed} onChange={(e) => setF({ ...f, closed: e.target.checked })} /> This place has permanently closed</label>
      <button className="btn-primary w-full !py-3" disabled={busy}>{busy ? 'Submitting…' : 'Submit suggestion'}</button>
    </form>
  );
}
export default function Page() { return <RequireAuth><Form /></RequireAuth>; }
