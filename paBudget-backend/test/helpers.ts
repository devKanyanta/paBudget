import request from 'supertest';
import sharp from 'sharp';
import { prisma } from '../src/db.js';
import { createApp } from '../src/app.js';
import { seedReference } from '../prisma/seed.js';

export const app = createApp();
export const api = () => request(app);

export async function resetDb() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(',')} RESTART IDENTITY CASCADE`);
  await seedReference();
}

let n = 0;
export async function makeUser(opts: { role?: 'USER' | 'ADMIN'; trust?: 'NEW' | 'TRUSTED' | 'BANNED'; name?: string } = {}) {
  n++;
  const email = `user${n}-${Date.now()}@test.local`;
  const r = await api().post('/auth/register').send({ name: opts.name ?? `User ${n}`, email, password: 'password123' });
  const id = r.body.user.id as string;
  await prisma.user.update({
    where: { id },
    data: { role: opts.role ?? 'USER', createdAt: new Date(Date.now() - 7 * 864e5) },
  });
  if (opts.trust) await prisma.contributorStats.update({ where: { userId: id }, data: { trustLevel: opts.trust } });
  // re-login so the token carries the updated role
  const l = await api().post('/auth/login').send({ email, password: 'password123' });
  return { id, email, token: l.body.accessToken as string, refreshToken: l.body.refreshToken as string, auth: { Authorization: `Bearer ${l.body.accessToken}` } };
}

export async function ref() {
  const [area, category, tag] = await Promise.all([prisma.area.findFirstOrThrow({ where: { slug: 'woodlands' } }), prisma.category.findFirstOrThrow({ where: { slug: 'cafe' } }), prisma.tag.findFirstOrThrow({ where: { slug: 'outdoor' } })]);
  return { area, category, tag };
}

export async function uploadPhoto(u: { auth: Record<string, string> }, opts: { purpose?: 'photo' | 'menu-scan'; width?: number } = {}) {
  const png = await sharp({ create: { width: opts.width ?? 1200, height: 900, channels: 3, background: '#c33' } }).png().toBuffer();
  const p = await api().post('/uploads/presign').set(u.auth).send({ contentType: 'image/png', size: png.length, purpose: opts.purpose ?? 'photo' });
  const url = new URL(p.body.uploadUrl);
  await request(app).put(url.pathname).set('Content-Type', 'image/png').send(png).expect(200);
  const c = await api().post(`/uploads/${p.body.imageId}/complete`).set(u.auth);
  return { id: p.body.imageId as string, complete: c };
}

/** A live place created directly, with a menu. */
export async function makePlace(admin: { auth: Record<string, string> }, over: Record<string, unknown> = {}) {
  const { area, category } = await ref();
  const r = await api().post('/admin/places').set(admin.auth).send({
    name: 'Cafe Test', areaId: area.id, categoryId: category.id, lat: -15.4318, lng: 28.3128, status: 'LIVE',
    hours: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ weekday: d, opensAt: '08:00', closesAt: '22:00' })),
    menu: [
      { name: 'Mains', items: [{ name: 'Burger', priceNgwee: 12000 }, { name: 'Chicken Wrap', priceNgwee: 10000 }] },
      { name: 'Drinks', items: [{ name: 'Coke', priceNgwee: 2500 }, { name: 'Iced Tea', priceNgwee: 3500 }] },
    ],
    ...over,
  });
  if (r.status !== 201) throw new Error(JSON.stringify(r.body));
  return r.body as { id: string; slug: string };
}

export { prisma };
