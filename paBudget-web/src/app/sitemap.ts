import type { MetadataRoute } from 'next';
import { API_URL } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const out: MetadataRoute.Sitemap = [{ url: site, changeFrequency: 'daily' }, { url: `${site}/places`, changeFrequency: 'daily' }];
  try {
    for (let offset = 0; ; offset += 50) {
      const r = await (await fetch(`${API_URL}/places?limit=50&offset=${offset}&sort=newest`)).json();
      for (const p of r.items) out.push({ url: `${site}/places/${p.slug}`, changeFrequency: 'weekly' });
      if (offset + 50 >= r.total) break;
    }
  } catch { /* API unreachable at build time */ }
  return out;
}
