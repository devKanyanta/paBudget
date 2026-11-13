'use client';
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from './providers';
import { ApiError } from '@/lib/api';

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  const e = error as ApiError;
  return (
    <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
      {e.message || 'Something went wrong'}
      {e.issues?.length ? <ul className="mt-1 list-disc pl-5">{e.issues.map((i, k) => <li key={k}>{i.path}: {i.message}</li>)}</ul> : null}
    </div>
  );
}

/** Redirects to /login when signed out. role='ADMIN' also blocks non-admins. */
export function RequireAuth({ children, role }: { children: ReactNode; role?: 'ADMIN' }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`); }, [loading, user, router]);
  if (loading || !user) return <p className="py-10 text-center text-sm text-muted">Loading…</p>;
  if (role && user.role !== role) return <p className="py-10 text-center">You don’t have access to this page.</p>;
  return <>{children}</>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <div><label className="label">{label}</label>{children}{hint && <p className="mt-1 text-xs text-muted">{hint}</p>}</div>;
}
