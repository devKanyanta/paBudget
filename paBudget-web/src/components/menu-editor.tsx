'use client';
import { toNgwee } from '@/lib/format';
import type { DraftMenu } from '@/lib/types';

export type MenuDraft = { name: string; items: { name: string; price: string; description?: string }[] }[];

export const emptyMenu = (): MenuDraft => [{ name: 'Mains', items: [{ name: '', price: '' }] }, { name: 'Drinks', items: [{ name: '', price: '' }] }];

export function fromExtracted(d: DraftMenu): MenuDraft {
  return d.sections.map((s) => ({ name: s.name, items: s.items.map((i) => ({ name: i.name, description: i.description, price: String(i.priceNgwee / 100) })) }));
}

/** Converts the editable draft to the API shape, dropping blank rows. */
export function toPayload(menu: MenuDraft) {
  return menu
    .map((s) => ({ name: s.name.trim(), items: s.items.filter((i) => i.name.trim() && i.price.trim()).map((i) => ({ name: i.name.trim(), ...(i.description ? { description: i.description } : {}), priceNgwee: toNgwee(i.price) })) }))
    .filter((s) => s.name && s.items.length);
}

export function MenuEditor({ value, onChange }: { value: MenuDraft; onChange: (m: MenuDraft) => void }) {
  const setSection = (si: number, patch: Partial<MenuDraft[number]>) => onChange(value.map((s, i) => (i === si ? { ...s, ...patch } : s)));
  const setItem = (si: number, ii: number, patch: Partial<MenuDraft[number]['items'][number]>) =>
    setSection(si, { items: value[si].items.map((it, i) => (i === ii ? { ...it, ...patch } : it)) });
  return (
    <div className="space-y-4">
      {value.map((s, si) => (
        <div key={si} className="card space-y-2 p-3">
          <div className="flex gap-2">
            <input className="input font-semibold" aria-label="Section name" placeholder="Section (e.g. Mains)" value={s.name} onChange={(e) => setSection(si, { name: e.target.value })} />
            <button type="button" className="btn-outline !px-3" aria-label="Remove section" onClick={() => onChange(value.filter((_, i) => i !== si))}>✕</button>
          </div>
          {s.items.map((it, ii) => (
            <div key={ii} className="flex gap-2">
              <input className="input" aria-label="Item name" placeholder="Item" value={it.name} onChange={(e) => setItem(si, ii, { name: e.target.value })} />
              <input className="input !w-24 shrink-0" aria-label="Price in kwacha" inputMode="decimal" placeholder="K" value={it.price} onChange={(e) => setItem(si, ii, { price: e.target.value })} />
              <button type="button" className="px-1 text-muted" aria-label="Remove item" onClick={() => setSection(si, { items: s.items.filter((_, i) => i !== ii) })}>✕</button>
            </div>
          ))}
          <button type="button" className="text-sm font-medium text-brand" onClick={() => setSection(si, { items: [...s.items, { name: '', price: '' }] })}>＋ Add item</button>
        </div>
      ))}
      <button type="button" className="btn-outline" onClick={() => onChange([...value, { name: '', items: [{ name: '', price: '' }] }])}>＋ Add section</button>
    </div>
  );
}
