'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import type { DraftMenu } from '@/lib/types';
import { ImageUploader, type Uploaded } from './image-uploader';
import { fromExtracted, type MenuDraft } from './menu-editor';

/** Photo of a printed menu -> AI draft the user then edits (FR-72). Falls back gracefully if AI is unavailable. */
export function MenuCapture({ onDraft }: { onDraft: (m: MenuDraft) => void }) {
  const [shots, setShots] = useState<Uploaded[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function extract(list: Uploaded[]) {
    setShots(list);
    const last = list[list.length - 1];
    if (!last) return;
    setBusy(true); setMsg('');
    try {
      const d = await api<DraftMenu>('/submissions/menu-extract', { method: 'POST', body: { imageId: last.id } });
      if (!d.sections.length) setMsg('We couldn’t read prices from that photo. Try a clearer shot, or type the menu below.');
      else { onDraft(fromExtracted(d)); setMsg('Draft ready — please check every price below before submitting.'); }
    } catch { setMsg('Automatic reading isn’t available right now. Please type the menu below.'); }
    finally { setBusy(false); }
  }
  return (
    <div className="space-y-2">
      <ImageUploader value={shots} onChange={(l) => void extract(l)} max={1} purpose="menu-scan" label="Scan menu" />
      {busy && <p className="text-sm text-muted">Reading the menu…</p>}
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </div>
  );
}
