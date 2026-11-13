'use client';
import { useState } from 'react';
import { ErrorText, Field, RequireAuth } from '@/components/ui';
import { ImageUploader, type Uploaded } from '@/components/image-uploader';
import { useSubmit } from '@/components/submit';
import { usePlace } from '@/components/use-place';
import { toNgwee } from '@/lib/format';

function Form() {
  const { place } = usePlace();
  const { submit, busy, error } = useSubmit('review');
  const [rating, setRating] = useState(0);
  const [f, setF] = useState({ body: '', itemsOrdered: '', paid: '', group: '' });
  const [photos, setPhotos] = useState<Uploaded[]>([]);
  if (!place) return <p className="text-sm text-muted">Loading…</p>;
  return (
    <form className="mx-auto max-w-xl space-y-4" onSubmit={(e) => {
      e.preventDefault();
      void submit({
        placeId: place.id, rating, ...(f.body && { body: f.body }), ...(f.itemsOrdered && { itemsOrdered: f.itemsOrdered }),
        ...(f.paid && { amountPaidNgwee: toNgwee(f.paid) }), ...(f.group && { groupSize: Number(f.group) }), ...(photos.length && { imageIds: photos.map((p) => p.id) }),
      });
    }}>
      <h1 className="text-xl font-bold">Review {place.name}</h1>
      <ErrorText error={error} />
      <div role="radiogroup" aria-label="Rating" className="flex gap-1 text-3xl">
        {[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} role="radio" aria-checked={rating === n} aria-label={`${n} stars`} onClick={() => setRating(n)} className={n <= rating ? 'text-accent' : 'text-border'}>★</button>)}
      </div>
      <Field label="What did you order?"><input className="input" value={f.itemsOrdered} onChange={(e) => setF({ ...f, itemsOrdered: e.target.value })} placeholder="2 burgers, 2 Cokes" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Total you paid (K)" hint="Helps others plan their budget"><input className="input" inputMode="decimal" value={f.paid} onChange={(e) => setF({ ...f, paid: e.target.value })} /></Field>
        <Field label="People in your group"><input className="input" inputMode="numeric" value={f.group} onChange={(e) => setF({ ...f, group: e.target.value.replace(/\D/g, '') })} /></Field>
      </div>
      <Field label="Your review"><textarea className="input" rows={4} maxLength={1500} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
      <Field label="Photos (optional)"><ImageUploader value={photos} onChange={setPhotos} max={4} /></Field>
      <button className="btn-primary w-full" disabled={busy || rating === 0}>{busy ? 'Submitting…' : 'Submit review'}</button>
    </form>
  );
}
export default function Page() { return <RequireAuth><Form /></RequireAuth>; }
