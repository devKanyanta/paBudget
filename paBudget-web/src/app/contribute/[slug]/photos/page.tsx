'use client';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { ErrorText, RequireAuth, Loading } from '@/components/ui';
import { ImageUploader, type Uploaded } from '@/components/image-uploader';
import { useSubmit } from '@/components/submit';
import { usePlace } from '@/components/use-place';

function Form() {
  const { place } = usePlace();
  const { submit, busy, error } = useSubmit('photos');
  const [photos, setPhotos] = useState<Uploaded[]>([]);
  if (!place) return <div className="mx-auto max-w-2xl"><Loading rows={2} /></div>;
  return (
    <form className="card mx-auto max-w-2xl space-y-5 p-6 sm:p-8" onSubmit={(e) => { e.preventDefault(); void submit({ placeId: place.id, imageIds: photos.map((p) => p.id) }); }}>
      <Link href={`/places/${place.slug}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-brand"><ChevronLeft aria-hidden className="size-4" />{place.name}</Link>
      <h1 className="page-title">Add photos of {place.name}</h1>
      <p className="text-sm text-muted">Only upload photos you took yourself. By submitting you let paBudget display them. Please avoid photos where people are the main subject.</p>
      <ErrorText error={error} />
      <ImageUploader value={photos} onChange={setPhotos} />
      <button className="btn-primary w-full !py-3" disabled={busy || photos.length === 0}>{busy ? 'Submitting…' : 'Submit photos'}</button>
    </form>
  );
}
export default function Page() { return <RequireAuth><Form /></RequireAuth>; }
