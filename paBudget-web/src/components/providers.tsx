'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api, tokenStore } from '@/lib/api';
import type { AuthResult, User } from '@/lib/types';

type AuthCtx = {
  user: User | null; loading: boolean;
  signIn: (r: AuthResult) => void; signOut: () => Promise<void>; reload: () => Promise<void>;
};
const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);
export const useAuth = () => useContext(Ctx);

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } }));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!tokenStore.get()) { setUser(null); setLoading(false); return; }
    try { setUser(await api<User>('/me')); } catch { setUser(null); }
    setLoading(false);
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const signIn = useCallback((r: AuthResult) => { tokenStore.set({ accessToken: r.accessToken, refreshToken: r.refreshToken }); setUser(r.user); qc.clear(); }, [qc]);
  const signOut = useCallback(async () => {
    const t = tokenStore.get();
    if (t) await api('/auth/logout', { method: 'POST', body: { refreshToken: t.refreshToken }, auth: false }).catch(() => {});
    tokenStore.set(null); setUser(null); qc.clear();
  }, [qc]);

  return (
    <QueryClientProvider client={qc}>
      <Ctx.Provider value={{ user, loading, signIn, signOut, reload }}>{children}</Ctx.Provider>
    </QueryClientProvider>
  );
}
