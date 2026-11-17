'use client';
import { Check } from 'lucide-react';
import { useLoop } from './use-loop';

/* Animated product mock-ups for the landing page. Each loops while on screen. */

const PP = [100, 150, 200, 150];
export function MockBudget() {
  const { ref, step } = useLoop<HTMLDivElement>(PP.length, 2200);
  const pp = PP[step];
  const chips = ['Woodlands', 'Outdoor', 'Family-friendly'];
  return (
    <div ref={ref} className="card space-y-4 p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Your budget</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-sunken p-3"><p className="text-xs text-muted">Per person</p><p key={pp} className="num pop text-xl font-bold">K{pp}</p></div>
        <div className="rounded-lg bg-sunken p-3"><p className="text-xs text-muted">Group of</p><p className="num text-xl font-bold">4</p></div>
      </div>
      <div className="flex flex-wrap gap-1.5">{chips.map((t, i) => <span key={t} className={`badge transition-all duration-500 ${step % 3 === i || step === 3 ? 'badge-green' : 'badge-gray'}`}>{t}</span>)}</div>
      <div className="rounded-lg bg-brand px-4 py-2.5 text-center text-sm font-semibold text-on-brand">Find places · <span key={pp} className="num pop inline-block">K{pp * 4}</span> total</div>
    </div>
  );
}

const MENU: [string, string][] = [['Nshima & Beef Stew', 'K60'], ['Village Chicken', 'K95'], ['Mosi Lager', 'K25'], ['Fresh Juice', 'K25']];
export function MockMenu() {
  const { ref, step } = useLoop<HTMLDivElement>(MENU.length + 1, 1100);
  return (
    <div ref={ref} className="card p-5">
      <div className="mb-3 flex items-center justify-between"><p className="font-semibold">Menu & prices</p><span className="badge badge-green"><Check aria-hidden className="size-3" />Confirmed 2 days ago</span></div>
      <ul className="divide-y divide-border text-sm">
        {MENU.map(([n, pr], i) => (
          <li key={n} className={`-mx-2 flex justify-between rounded-md px-2 py-2.5 transition-colors duration-500 ${step === i ? 'bg-mint' : ''}`}><span>{n}</span><span className={`num font-semibold transition-transform duration-500 ${step === i ? 'scale-110 text-brand' : ''}`}>{pr}</span></li>
        ))}
      </ul>
    </div>
  );
}

const BILL: [string, number][] = [['2 × Grilled tilapia', 190], ['2 × Draught beer', 60], ['2 × Cheesecake', 70]];
export function MockBill() {
  const { ref, step } = useLoop<HTMLDivElement>(6, 900); // 0: empty, 1-3: lines in, 4: total, 5: hold
  const shown = Math.min(step, 3);
  const total = step >= 4 ? 320 : 0;
  return (
    <div ref={ref} className="card p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Estimated bill · 2 people</p>
      <ul className="space-y-2 text-sm text-ink-2">
        {BILL.map(([n, pr], i) => <li key={n} className={`flex justify-between transition-all duration-500 ${shown > i ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}`}><span>{n}</span><span className="num">K{pr}</span></li>)}
      </ul>
      <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3"><span className="font-semibold">Total</span><span key={total} className={`num text-2xl font-bold ${total ? 'pop' : 'text-faint'}`}>{total ? `K${total}` : '—'}</span></div>
      <p className={`mt-1 text-sm font-medium text-brand transition-opacity duration-500 ${total ? 'opacity-100' : 'opacity-0'}`}>K80 under your budget</p>
    </div>
  );
}
