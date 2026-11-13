'use client';
import { useEffect, useState } from 'react';
import { ErrorText, RequireAuth } from '@/components/ui';
import { MenuEditor, emptyMenu, toPayload, type MenuDraft } from '@/components/menu-editor';
import { MenuCapture } from '@/components/menu-capture';
import { useSubmit } from '@/components/submit';
import { usePlace } from '@/components/use-place';

function Form() {
  const { place } = usePlace();
  const { submit, busy, error } = useSubmit('menu');
  const [menu, setMenu] = useState<MenuDraft>(emptyMenu());
  // start from the current menu so contributors only change what's different
  useEffect(() => {
    if (place?.menu.length) setMenu(place.menu.map((s) => ({ name: s.name, items: s.items.map((i) => ({ name: i.name, price: String(i.priceNgwee / 100) })) })));
  }, [place]);
  if (!place) return <p className="text-sm text-muted">Loading…</p>;
  const sections = toPayload(menu);
  return (
    <form className="mx-auto max-w-xl space-y-4" onSubmit={(e) => { e.preventDefault(); void submit({ placeId: place.id, mode: 'merge', sections }); }}>
      <h1 className="text-xl font-bold">Menu for {place.name}</h1>
      <p className="text-sm text-muted">Scan the printed menu or edit the prices below. Only change what’s different today.</p>
      <ErrorText error={error} />
      <MenuCapture onDraft={setMenu} />
      <MenuEditor value={menu} onChange={setMenu} />
      <button className="btn-primary w-full" disabled={busy || sections.length === 0}>{busy ? 'Submitting…' : 'Submit menu'}</button>
    </form>
  );
}
export default function Page() { return <RequireAuth phone><Form /></RequireAuth>; }
