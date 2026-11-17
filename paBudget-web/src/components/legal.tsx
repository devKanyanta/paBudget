import type { ReactNode } from 'react';

export function Legal({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8 border-b border-border pb-6"><h1 className="text-3xl font-bold tracking-tight">{title}</h1><p className="mt-2 inline-flex rounded-md bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">{note}</p></header>
      <div className="prose-doc card p-6 sm:p-10 [&>h2:first-child]:mt-0">{children}</div>
    </div>
  );
}
