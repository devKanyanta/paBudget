'use client';
import { useState } from 'react';
import { ErrorText, RequireAuth } from '@/components/ui';
import { ImageUploader, type Uploaded } from '@/components/image-uploader';
import { useSubmit } from '@/components/submit';
import { usePlace } from '@/components/use-place';

function Form() {
  const { place } = usePlace();
  const { submit, busy, error } = useSubmit('photos');
  const [photos, setPhotos] = useState<Uploaded[]>([]);
  if (!place) return <p className="text-sm text-muted">Loading…</p>;
  return (
    <form className="mx-auto max-w-xl space-y-4" onSubmit={(e) => { e.preventDefault(); void submit({ placeId: place.id, imageIds: photos.map((p) => p.id) }); }}>
      <h1 className="text-xl font-bold">Add photos of {place.name}</h1>
      <p className="text-sm text-muted">Only upload photos you took yourself. By submitting you let paBudget display them. Please avoid photos where people are the main subject.</p>
      <ErrorText error={error} />
      <ImageUploader value={photos} onChange={setPhotos} />
      <button className="btn-primary w-full" disabled={busy || photos.length === 0}>{busy ? 'Submitting…' : 'Submit photos'}</button>
    </form>
  );
}
export default function Page() { return <RequireAuth phone><Form /></RequireAuth>; }
