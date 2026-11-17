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
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><h1 className="page-title">Plan my outing</h1><p className="page-sub">Tell me your budget, group and vibe. I’ll build the bill from real menu prices.</p></div>
        {remaining != null && <span className="badge badge-gray">{remaining} requests left today</span>}
      </div>
      <div className="card space-y-5 p-4 sm:p-6" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex gap-3'}>
            {m.role === 'bot' && <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-on-brand">pB</span>}
            <div className={m.role === 'user' ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-brand px-4 py-2.5 text-sm text-on-brand' : 'min-w-0 flex-1 space-y-3'}>
              <p className={m.role === 'bot' ? 'pt-1 text-sm text-ink-2' : ''}>{m.text}</p>
              {m.reply?.notes.map((n, k) => <p key={k} className="text-xs text-muted">{n}</p>)}
              {m.reply?.options.map((o) => <OptionCard key={o.placeId} o={o} filters={m.reply!.filters} />)}
              {m.reply && m.reply.options.length > 0 && <p className="text-xs text-muted">Refine it: “cheaper”, “somewhere outdoor”, “Friday night instead”.</p>}
            </div>
          </div>
        ))}
        {busy && <div className="flex gap-3"><span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-on-brand">pB</span><div className="flex items-center gap-1 pt-3" aria-label="Planning">{[0, 1, 2].map((d) => <span key={d} className="size-1.5 animate-bounce rounded-full bg-faint" style={{ animationDelay: `${d * 120}ms` }} />)}</div></div>}
        <div ref={end} />
      </div>
      <ErrorText error={error} />
      {msgs.length === 1 && (
        <div className="grid gap-2 sm:grid-cols-3">{EXAMPLES.map((e) => <button key={e} className="card p-3 text-left text-sm text-ink-2 transition hover:shadow-pop" onClick={() => void send(e)}>{e}</button>)}</div>
      )}
      <form className="sticky bottom-4 flex gap-2 rounded-xl bg-surface p-2 shadow-pop ring-1 ring-border" onSubmit={(e) => { e.preventDefault(); void send(input); }}>
        <input className="w-full rounded-lg bg-transparent px-3 text-sm outline-none placeholder:text-faint" value={input} maxLength={500} onChange={(e) => setInput(e.target.value)} placeholder={filters ? 'Refine: cheaper, outdoor, Saturday…' : 'e.g. Date for 2, K400, Woodlands'} aria-label="Message" />
        <button className="btn-primary !px-3.5" aria-label="Send" disabled={busy || input.trim().length < 2}><SendHorizontal aria-hidden className="size-4" /></button>
      </form>
      <div className="flex items-center justify-between text-sm">
        {filters ? <button className="text-muted hover:text-foreground" onClick={() => { setFilters(null); setMsgs((m) => [...m, { role: 'bot', text: 'Starting fresh. What are you planning?' }]); }}>Start a new search</button> : <span />}
        <Link href="/me/plans" className="font-medium text-brand hover:underline">My saved plans →</Link>
      </div>
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
        <div className="flex flex-wrap gap-2 text-sm"><span className="chip-active"><Check aria-hidden className="size-3.5" />Saved</span><a className="btn-outline btn-sm" target="_blank" rel="noreferrer" href={wa}><MessageCircle aria-hidden className="size-4" />WhatsApp</a><button className="btn-outline btn-sm" onClick={() => void navigator.clipboard?.writeText(link)}><Link2 aria-hidden className="size-4" />Copy link</button></div>
      ) : <button className="btn-outline btn-sm" onClick={() => void save()}>Save plan</button>}
    </PlanStopCard>
  );
}

export default function Page() { return <RequireAuth><Planner /></RequireAuth>; }
