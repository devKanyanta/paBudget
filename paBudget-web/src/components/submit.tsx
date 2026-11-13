'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useSubmit(kind: string) {
  const router = useRouter();
  const qc = useQueryClient();
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  async function submit(body: unknown) {
    setBusy(true); setError(null);
    try {
      const r = await api<{ status: string }>(`/submissions/${kind}`, { method: 'POST', body });
      await qc.invalidateQueries({ queryKey: ['mine'] });
      router.push(`/me/contributions?done=${r.status}`);
    } catch (e) { setError(e); } finally { setBusy(false); }
  }
  return { submit, busy, error };
}
