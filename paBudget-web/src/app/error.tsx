'use client';
import { AlertTriangle } from 'lucide-react';
import { EmptyState } from '@/components/ui';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <div className="mx-auto max-w-lg py-10"><EmptyState icon={AlertTriangle} title="Something went wrong" body="We couldn’t load this page. Please try again in a moment." action={<button className="btn-primary" onClick={reset}>Try again</button>} /></div>;
}
