import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { EmptyState } from '@/components/blocks';

export default function NotFound() {
  return <div className="mx-auto max-w-lg py-10"><EmptyState icon={SearchX} title="We couldn’t find that page" body="The link may be old, or the place may have been removed." action={<Link href="/places" className="btn-primary">Explore places</Link>} /></div>;
}
