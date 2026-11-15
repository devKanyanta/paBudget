'use client';
import { useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { compressImage, uploadImage } from '@/lib/api';

export type Uploaded = { id: string; preview: string };

export function ImageUploader({ value, onChange, max = 10, purpose = 'photo', label = 'Add photos' }: {
  value: Uploaded[]; onChange: (v: Uploaded[]) => void; max?: number; purpose?: 'photo' | 'menu-scan'; label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState('');

  async function pick(files: FileList | null) {
    if (!files) return;
    setError('');
    const room = max - value.length;
    const chosen = Array.from(files).slice(0, room);
    let acc = [...value];
    for (const f of chosen) {
      setBusy((b) => b + 1);
      try {
        const blob = await compressImage(f);
        const up = await uploadImage(blob, purpose);
        acc = [...acc, { id: up.id, preview: URL.createObjectURL(blob) }];
        onChange(acc);
      } catch (e) { setError((e as Error).message || 'Upload failed'); }
      finally { setBusy((b) => b - 1); }
    }
    if (input.current) input.current.value = '';
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((u) => (
          <div key={u.id} className="relative size-20 overflow-hidden rounded-xl bg-sunken">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u.preview} alt="" className="size-full object-cover" />
            <button type="button" aria-label="Remove photo" onClick={() => onChange(value.filter((x) => x.id !== u.id))} className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white"><X aria-hidden className="size-3" /></button>
          </div>
        ))}
        {value.length < max && (
          <button type="button" onClick={() => input.current?.click()} disabled={busy > 0} className="flex size-20 flex-col items-center justify-center gap-1 rounded-xl bg-sunken text-xs text-muted transition hover:brightness-95">
            {busy > 0 ? 'Uploading…' : <><Camera aria-hidden className="size-5" />{label}</>}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple={max > 1} capture={undefined} hidden onChange={(e) => void pick(e.target.files)} />
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
