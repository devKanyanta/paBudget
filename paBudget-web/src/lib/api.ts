import type { AuthResult } from './types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(public status: number, message: string, public issues?: { path: string; message: string }[]) { super(message); }
}

const TOKEN_KEY = 'pb_auth';
type Stored = { accessToken: string; refreshToken: string };

export const tokenStore = {
  get(): Stored | null {
    if (typeof window === 'undefined') return null;
    try { return JSON.parse(localStorage.getItem(TOKEN_KEY) ?? 'null'); } catch { return null; }
  },
  set(a: Stored | null) {
    try { if (a) localStorage.setItem(TOKEN_KEY, JSON.stringify(a)); else localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
  },
};

let refreshing: Promise<boolean> | null = null;
async function refreshTokens(): Promise<boolean> {
  const cur = tokenStore.get();
  if (!cur) return false;
  refreshing ??= (async () => {
    try {
      const r = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: cur.refreshToken }) });
      if (!r.ok) { tokenStore.set(null); return false; }
      const d = (await r.json()) as AuthResult;
      tokenStore.set({ accessToken: d.accessToken, refreshToken: d.refreshToken });
      return true;
    } finally { setTimeout(() => (refreshing = null), 0); }
  })();
  return refreshing;
}

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown; auth?: boolean; token?: string } = {}): Promise<T> {
  const run = async () => {
    const headers: Record<string, string> = {};
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    const t = opts.token ?? tokenStore.get()?.accessToken;
    if (t && opts.auth !== false) headers.Authorization = `Bearer ${t}`;
    return fetch(`${API_URL}${path}`, { method: opts.method ?? 'GET', headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
  };
  let res = await run();
  if (res.status === 401 && !opts.token && tokenStore.get() && (await refreshTokens())) res = await run();
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.message ?? res.statusText, data.issues);
  return data as T;
}

/** Server-side fetch of public data (cached briefly; never sends credentials). */
export async function publicGet<T>(path: string, revalidate = 30): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { next: { revalidate } });
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  return res.json() as Promise<T>;
}

/** Presign -> PUT -> complete. Returns the image id to attach to a submission. */
export async function uploadImage(file: Blob, purpose: 'photo' | 'menu-scan' = 'photo'): Promise<{ id: string; thumb?: string }> {
  const p = await api<{ imageId: string; uploadUrl: string; headers: Record<string, string> }>('/uploads/presign', {
    method: 'POST', body: { contentType: file.type, size: file.size, purpose },
  });
  const put = await fetch(p.uploadUrl, { method: 'PUT', headers: p.headers, body: file });
  if (!put.ok) throw new ApiError(put.status, 'Upload failed');
  const done = await api<{ id: string; thumb?: string }>(`/uploads/${p.imageId}/complete`, { method: 'POST' });
  return { id: done.id, thumb: done.thumb };
}

/** Downscale big camera photos before upload to save the user's data (max 1600px, JPEG q0.82). */
export async function compressImage(file: File, maxEdge = 1600): Promise<Blob> {
  if (!file.type.startsWith('image/') || typeof createImageBitmap === 'undefined') return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1_500_000) return file;
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res) => c.toBlob((b) => res(b ?? file), 'image/jpeg', 0.82));
  } catch { return file; }
}
