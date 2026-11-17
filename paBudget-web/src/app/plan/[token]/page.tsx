import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ApiError, publicGet } from '@/lib/api';
import type { SavedPlan } from '@/lib/types';
import { kwacha } from '@/lib/format';
import { BillLines, PlanStopCard } from '@/components/plan-option';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function load(token: string) {
  try { return await publicGet<SavedPlan>(`/plans/shared/${encodeURIComponent(token)}`, 60); }
  catch (e) { if (e instanceof ApiError && e.status === 404) notFound(); throw e; }
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const p = await load((await params).token);
  return { title: p.title, description: `About ${kwacha(p.totalNgwee)} for ${p.groupSize}, planned on paBudget.`, robots: { index: false } };
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const p = await load((await params).token);
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="page-title">{p.title}</h1>
        <p className="text-sm text-muted">Shared by {p.by} · for {p.groupSize} · budget {kwacha(p.budgetNgwee)}</p>
      </header>
      {p.stops.map((s) => (
        <PlanStopCard key={s.placeId} slug={s.slug} name={s.name} area={s.area} thumb={s.thumb}>
          <BillLines items={s.items} total={s.totalNgwee} />
        </PlanStopCard>
      ))}
      <p className="text-xs text-muted">Prices were checked when the plan was saved and may have changed since.</p>
      <Link href="/planner" className="btn-primary w-full !py-3">Plan my own outing</Link>
    </div>
  );
}
