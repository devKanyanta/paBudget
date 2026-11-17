import type { ReactNode } from 'react';
import { Logo } from './logo';
import { BadgeCheck, Receipt, Users } from 'lucide-react';

const POINTS = [
  [Receipt, 'Real menu prices', 'See what a meal costs before you leave home.'],
  [Users, 'Built by the community', 'Menus and prices confirmed by people who went.'],
  [BadgeCheck, 'Plan to the kwacha', 'Build a bill that fits your group and your budget.'],
] as const;

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-4xl overflow-hidden rounded-2xl bg-surface shadow-pop ring-1 ring-border md:grid-cols-[1fr_1.1fr]">
      <aside className="hidden flex-col justify-between bg-brand-ground p-8 text-white md:flex">
        <div>
          <Logo variant="on-dark" className="h-8" />
          <h2 className="mt-8 text-2xl font-bold leading-snug">Know the bill before you go.</h2>
          <ul className="mt-8 space-y-5">
            {POINTS.map(([Icon, t, d]) => (
              <li key={t} className="flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-copper-light"><Icon aria-hidden className="size-4.5" /></span><div><p className="font-semibold">{t}</p><p className="text-sm text-white/75">{d}</p></div></li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/60">Lusaka · community-priced menus</p>
      </aside>
      <div className="p-6 sm:p-10">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mb-6 mt-1 text-sm text-muted">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
