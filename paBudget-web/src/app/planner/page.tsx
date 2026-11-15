'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, Link2, MessageCircle, SendHorizontal } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { kwacha } from '@/lib/format';
import type { PlanOption, PlannerFilters, PlannerReply, SavedPlan } from '@/lib/types';
import { ErrorText, RequireAuth } from '@/components/ui';
import { BillLines, PlanStopCard } from '@/components/plan-option';

type Msg = { role: 'user' | 'bot'; text: string; reply?: PlannerReply };

const EXAMPLES = ['Date for 2 in Woodlands, K400 max, outdoor, Saturday evening', 'Lunch for 4, K300, Kabulonga', 'Cheap family dinner for 5, K500'];

function Planner() {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'bot', text: 'Tell me your budget, group size, area and vibe — I’ll suggest places with real menu prices.' }]);
  const [filters, setFilters] = useState<PlannerFilters | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);
  useEffect(() => { void api<{ remaining: number }>('/planner/quota').then((q) => setRemaining(q.remaining)).catch(() => {}); }, []);

  async function send(text: string) {
    const message = text.trim();
    if (message.length < 2 || busy) return;
    setInput(''); setError(null); setBusy(true);
    setMsgs((m) => [...m, { role: 'user', text: message }]);
    try {
      const r = await api<PlannerReply>('/planner/chat', { method: 'POST', body: { message, filters: filters ?? undefined } });
      setFilters(r.filters); setRemaining(r.remaining);
      setMsgs((m) => [...m, { role: 'bot', text: r.message, reply: r }]);
    } catch (e) { setError(e); } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3">
      <div className="flex items-baseline justify-between"><h1 className="text-xl font-bold">Plan my outing</h1>{remaining != null && <span className="text-xs text-muted">{remaining} requests left today</span>}</div>
      <div className="space-y-3" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
            <div className={m.role === 'user' ? 'max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-sm text-on-brand' : 'w-full space-y-3'}>
              <p className={m.role === 'bot' ? 'text-sm' : ''}>{m.text}</p>
              {m.reply?.notes.map((n, k) => <p key={k} className="text-xs text-muted">{n}</p>)}
              {m.reply?.options.map((o) => <OptionCard key={o.placeId} o={o} filters={m.reply!.filters} />)}
              {m.reply && m.reply.options.length > 0 && <p className="text-xs text-muted">Try: “cheaper”, “somewhere outdoor”, “Friday night instead”.</p>}
            </div>
          </div>
        ))}
        {busy && <p className="text-sm text-muted">Planning…</p>}
        <div ref={end} />
      </div>
      <ErrorText error={error} />
      {msgs.length === 1 && <div className="flex flex-wrap gap-2">{EXAMPLES.map((e) => <button key={e} className="chip text-left" onClick={() => void send(e)}>{e}</button>)}</div>}
      <form className="sticky bottom-3 flex gap-2 rounded-2xl bg-background/90 p-1 backdrop-blur" onSubmit={(e) => { e.preventDefault(); void send(input); }}>
        <input className="input" value={input} maxLength={500} onChange={(e) => setInput(e.target.value)} placeholder={filters ? 'Refine: cheaper, outdoor, Saturday…' : 'e.g. Date for 2, K400, Woodlands'} aria-label="Message" />
        <button className="btn-primary !px-3.5" aria-label="Send" disabled={busy || input.trim().length < 2}><SendHorizontal aria-hidden className="size-4" /></button>
      </form>
      {filters && <button className="text-xs text-muted underline" onClick={() => { setFilters(null); setMsgs((m) => [...m, { role: 'bot', text: 'Starting fresh — what are you planning?' }]); }}>Start a new search</button>}
      <Link href="/me/plans" className="text-sm font-medium text-brand">My saved plans →</Link>
    </div>
  );
}

function OptionCard({ o, filters }: { o: PlanOption; filters: PlannerFilters }) {
  const [saved, setSaved] = useState<SavedPlan | null>(null);
  const [err, setErr] = useState<unknown>(null);
  async function save() {
    setErr(null);
    try {
      setSaved(await api<SavedPlan>('/plans', { method: 'POST', body: { budgetNgwee: filters.budgetNgwee, groupSize: filters.groupSize, stops: [{ placeId: o.placeId, items: o.bundle.items.map((i) => ({ itemId: i.itemId, qty: i.qty })) }] } }));
    } catch (e) { setErr(e); }
  }
  const link = saved ? `${window.location.origin}/plan/${saved.shareToken}` : '';
  const wa = saved ? `https://wa.me/?text=${encodeURIComponent(`${o.name}: about ${kwacha(saved.totalNgwee)} for ${filters.groupSize}. ${link}`)}` : '';
  return (
    <PlanStopCard slug={o.slug} name={o.name} area={`${o.category} · ${o.area}${o.rating ? ` · ${o.rating} stars` : ''}`} thumb={o.thumb} reason={o.reason}>
      <BillLines items={o.bundle.items} total={o.bundle.totalNgwee} over={o.overBudgetNgwee} />
      {o.recentBillPpNgwee != null && <p className="text-xs text-muted">Recent diners reported paying about {kwacha(o.recentBillPpNgwee)} per person.</p>}
      <ErrorText error={err} />
      {saved ? (
        <div className="flex flex-wrap gap-2 text-sm"><span className="chip-active"><Check aria-hidden className="size-3.5" />Saved</span><a className="btn-outline !py-1.5" target="_blank" rel="noreferrer" href={wa}><MessageCircle aria-hidden className="size-4" />WhatsApp</a><button className="btn-outline !py-1.5" onClick={() => void navigator.clipboard?.writeText(link)}><Link2 aria-hidden className="size-4" />Copy link</button></div>
      ) : <button className="btn-outline !py-1.5" onClick={() => void save()}>Save plan</button>}
    </PlanStopCard>
  );
}

export default function Page() { return <RequireAuth><Planner /></RequireAuth>; }
