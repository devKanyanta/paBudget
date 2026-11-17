'use client';
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { EmptyState, Loading } from './blocks';

export { EmptyState, Field, FormSection, Loading, PageHeader } from './blocks';
import { useAuth } from './providers';
import { ApiError } from '@/lib/api';

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  const e = error as ApiError;
  return (
    <div role="alert" className="flex gap-2.5 rounded-lg border border-danger/25 bg-danger-soft p-3 text-sm text-danger">
      <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div>
        {e.message || 'Something went wrong'}
        {e.issues?.length ? <ul className="mt-1 list-disc pl-4">{e.issues.map((i, k) => <li key={k}>{i.path}: {i.message}</li>)}</ul> : null}
      </div>
    </div>
  );
}

/** Redirects to /login when signed out. role='ADMIN' also blocks non-admins. */
export function RequireAuth({ children, role }: { children: ReactNode; role?: 'ADMIN' }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`); }, [loading, user, router]);
  if (loading || !user) return <div className="mx-auto max-w-xl py-6"><Loading /></div>;
  if (role && user.role !== role) return <EmptyState icon={AlertCircle} title="No access" body="You don’t have permission to view this page." />;
  return <>{children}</>;
}

