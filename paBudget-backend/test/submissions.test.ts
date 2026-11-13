import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { api, resetDb, makeUser, makePlace, ref, uploadPhoto, prisma } from './helpers.js';
import { setAiProvider } from '../src/services/ai.js';

let admin: Awaited<ReturnType<typeof makeUser>>;
let place: { id: string; slug: string };

beforeAll(async () => {
  await resetDb();
  admin = await makeUser({ role: 'ADMIN' });
  place = await makePlace(admin);
});
beforeEach(() => setAiProvider(null));

describe('uploads', () => {
  it('processes an image into stripped WebP variants and rejects non-images', async () => {
    const u = await makeUser();
    const up = await uploadPhoto(u);
    expect(up.complete.status).toBe(200);
    expect(up.complete.body.thumb).toMatch(/400\.webp$/);
    const thumb = await api().get(new URL(up.complete.body.thumb).pathname).expect(200);
    expect(thumb.headers['content-type']).toMatch(/webp/);
    // not an image
    const p = await api().post('/uploads/presign').set(u.auth).send({ contentType: 'image/png', size: 10 });
    await api().put(new URL(p.body.uploadUrl).pathname).set('Content-Type', 'image/png').send(Buffer.from('not an image at all')).expect(200);
    await api().post(`/uploads/${p.body.imageId}/complete`).set(u.auth).expect(400);
    // validation
    await api().post('/uploads/presign').set(u.auth).send({ contentType: 'application/pdf', size: 10 }).expect(400);
    await api().post('/uploads/presign').set(u.auth).send({ contentType: 'image/png', size: 9 * 1024 * 1024 }).expect(400);
    await api().post('/uploads/presign').send({ contentType: 'image/png', size: 10 }).expect(401);
    // private files are not served
    await api().get('/files/incoming/x/y').expect(403);
  });
});

describe('submission gating', () => {
  it('requires login and rejects invalid payloads', async () => {
    const v = await makeUser();
    await api().post('/submissions/review').set(v.auth).send({ placeId: place.id, rating: 9 }).expect(400);
    await api().post('/submissions/review').set(v.auth).send({ rating: 5 }).expect(400);
    await api().post('/submissions/nonsense').set(v.auth).send({}).expect(404);
    await api().post('/submissions/review').send({ placeId: place.id, rating: 5 }).expect(401);
  });

  it('blocks banned users and enforces daily limits', async () => {
    const b = await makeUser({ trust: 'BANNED' });
    await api().post('/submissions/flag').set(b.auth).send({ targetType: 'place', targetId: place.id, reason: 'bad' }).expect(403);
    const u = await makeUser();
    for (let i = 0; i < 20; i++) await api().post('/submissions/flag').set(u.auth).send({ targetType: 'place', targetId: place.id, reason: 'spam listing' }).expect(201);
    await api().post('/submissions/flag').set(u.auth).send({ targetType: 'place', targetId: place.id, reason: 'one too many' }).expect(429);
  });
});

describe('new place flow', () => {
  it('goes pending, is invisible, then goes live on approval with photos', async () => {
    const u = await makeUser({ name: 'Chanda' });
    const { area, category, tag } = await ref();
    const photo = await uploadPhoto(u);
    const body = {
      name: 'Hidden Gem Cafe', areaId: area.id, categoryId: category.id, lat: -15.43, lng: 28.30, imageIds: [photo.id], tagSlugs: [tag.slug],
      hours: [{ weekday: 1, opensAt: '09:00', closesAt: '17:00' }],
      menu: { sections: [{ name: 'Mains', items: [{ name: 'Nshima & Beans', priceNgwee: 6000 }] }, { name: 'Drinks', items: [{ name: 'Fanta', priceNgwee: 2000 }] }] },
    };
    const dupCheck = await api().get('/submissions/duplicates').set(u.auth).query({ name: 'Cafe Test', lat: -15.4318, lng: 28.3128 }).expect(200);
    expect(dupCheck.body[0].name).toBe('Cafe Test');

    const s = await api().post('/submissions/place').set(u.auth).send(body).expect(201);
    expect(s.body.status).toBe('PENDING');
    expect((await api().get('/places?q=hidden gem')).body.total).toBe(0);
    // a photo can't be reused by a second submission
    await api().post('/submissions/place').set(u.auth).send(body).expect(400);

    const mine = await api().get('/submissions/mine').set(u.auth).expect(200);
    expect(mine.body.items[0].status).toBe('PENDING');

    await api().post(`/admin/submissions/${s.body.id}/approve`).set(u.auth).expect(403);
    const q = await api().get('/admin/submissions').set(admin.auth).expect(200);
    expect(q.body.items.find((i: any) => i.id === s.body.id).images).toHaveLength(1);
    await api().post(`/admin/submissions/${s.body.id}/approve`).set(admin.auth).send({}).expect(200);
    await api().post(`/admin/submissions/${s.body.id}/approve`).set(admin.auth).send({}).expect(400); // already decided

    const list = await api().get('/places?q=hidden gem').expect(200);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0].thumb).toBeTruthy();
    const detail = await api().get(`/places/${list.body.items[0].slug}`).expect(200);
    expect(detail.body.images[0].by).toBe('Chanda');
    expect(detail.body.menuAddedBy).toBeNull(); // menu came with the place, not a MENU submission
    expect(detail.body.avgSpendPpNgwee).toBe(8000);
    const stats = await prisma.contributorStats.findUniqueOrThrow({ where: { userId: u.id } });
    expect(stats.approvedCount).toBe(1);
    expect(stats.points).toBe(20);
    expect(await prisma.userBadge.count({ where: { userId: u.id } })).toBe(1);
    expect(await prisma.moderationLog.count({ where: { action: 'approve' } })).toBeGreaterThan(0);
  });

  it('flags likely duplicates in the AI score and supports edit-then-approve', async () => {
    const u = await makeUser();
    const { area, category } = await ref();
    const photo = await uploadPhoto(u);
    const s = await api().post('/submissions/place').set(u.auth).send({ name: 'Cafe Tests', areaId: area.id, categoryId: category.id, lat: -15.4318, lng: 28.3129, imageIds: [photo.id] }).expect(201);
    const row = await prisma.submission.findUniqueOrThrow({ where: { id: s.body.id } });
    expect(row.aiScore).toBeLessThanOrEqual(60);
    expect(JSON.stringify(row.aiReasons)).toMatch(/duplicate/i);
    await api().post(`/admin/submissions/${s.body.id}/approve`).set(admin.auth).send({ payload: { name: 'Cafe Tests Edited', areaId: area.id, categoryId: category.id, lat: -15.4318, lng: 28.3129, imageIds: [photo.id] } }).expect(200);
    expect((await api().get('/places?q=Edited')).body.total).toBe(1);
  });
});

describe('menu, photos, reviews, edits, flags, claims', () => {
  it('menu submission merges prices and updates freshness', async () => {
    const u = await makeUser();
    const s = await api().post('/submissions/menu').set(u.auth).send({ placeId: place.id, sections: [{ name: 'Mains', items: [{ name: 'Burger', priceNgwee: 13000 }, { name: 'Pizza', priceNgwee: 18000 }] }] }).expect(201);
    await api().post(`/admin/submissions/${s.body.id}/approve`).set(admin.auth).send({}).expect(200);
    const d = (await api().get(`/places/${place.slug}`)).body;
    const mains = d.menu.find((x: any) => x.name === 'Mains').items;
    expect(mains.find((i: any) => i.name === 'Burger').priceNgwee).toBe(13000);
    expect(mains.find((i: any) => i.name === 'Pizza')).toBeTruthy();
    expect(mains).toHaveLength(3);
    expect(d.menuAddedBy).toBe((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).name);
  });

  it('review: one per user, shows after approval with amount paid and rating', async () => {
    const u = await makeUser({ name: 'Mwila' });
    const photo = await uploadPhoto(u);
    const r = await api().post('/submissions/review').set(u.auth).send({ placeId: place.id, rating: 4, body: 'Lovely burgers', amountPaidNgwee: 30000, groupSize: 2, imageIds: [photo.id] }).expect(201);
    expect((await api().get(`/places/${place.id}/reviews`)).body).toHaveLength(0);
    await api().post('/submissions/review').set(u.auth).send({ placeId: place.id, rating: 5 }).expect(400); // pending already
    await api().post(`/admin/submissions/${r.body.id}/approve`).set(admin.auth).send({}).expect(200);
    const rev = (await api().get(`/places/${place.id}/reviews`)).body;
    expect(rev[0]).toMatchObject({ rating: 4, amountPaidNgwee: 30000, groupSize: 2, author: 'Mwila' });
    expect(rev[0].images).toHaveLength(1);
    const d = (await api().get(`/places/${place.id}`)).body;
    expect(d.rating).toBe(4);
    await api().post('/submissions/review').set(u.auth).send({ placeId: place.id, rating: 5 }).expect(400); // already reviewed
  });

  it('suggested edits update hours/phone and price corrections', async () => {
    const u = await makeUser();
    const item = await prisma.menuItem.findFirstOrThrow({ where: { placeId: place.id, name: 'Coke' } });
    const e = await api().post('/submissions/edit').set(u.auth).send({ placeId: place.id, phone: '0977000111', hours: [{ weekday: 1, opensAt: '07:00', closesAt: '23:00' }], itemPrices: [{ itemId: item.id, priceNgwee: 3000 }] }).expect(201);
    await api().post(`/admin/submissions/${e.body.id}/approve`).set(admin.auth).send({}).expect(200);
    const d = (await api().get(`/places/${place.id}`)).body;
    expect(d.phone).toBe('0977000111');
    expect(d.hours).toEqual([{ weekday: 1, opensAt: '07:00', closesAt: '23:00' }]);
    expect((await prisma.menuItem.findUniqueOrThrow({ where: { id: item.id } })).priceNgwee).toBe(3000);
    await api().post('/submissions/edit').set(u.auth).send({ placeId: place.id }).expect(400);
  });

  it('flag approval hides the content; claim approval makes an owner', async () => {
    const other = await makePlace(admin, { name: 'Shady Place' });
    const u = await makeUser();
    const f = await api().post('/submissions/flag').set(u.auth).send({ targetType: 'place', targetId: other.id, reason: 'does not exist' }).expect(201);
    await api().post(`/admin/submissions/${f.body.id}/approve`).set(admin.auth).send({}).expect(200);
    await api().get(`/places/${other.slug}`).expect(404);

    const c = await api().post('/submissions/claim').set(u.auth).send({ placeId: place.id, message: 'I am the manager', contactPhone: '0977123456' }).expect(201);
    await api().post(`/admin/submissions/${c.body.id}/approve`).set(admin.auth).send({}).expect(200);
    expect((await api().get('/me').set(u.auth)).body.role).toBe('OWNER');
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).role).toBe('OWNER');
    await api().post('/submissions/review').set((await api().post('/auth/login').send({ email: u.email, password: 'password123' }).then((r) => ({ Authorization: `Bearer ${r.body.accessToken}` })))).send({ placeId: place.id, rating: 5 }).expect(403);
  });

  it('reject records a reason, rejects images and notifies via my contributions', async () => {
    const u = await makeUser();
    const photo = await uploadPhoto(u);
    const s = await api().post('/submissions/photos').set(u.auth).send({ placeId: place.id, imageIds: [photo.id] }).expect(201);
    await api().post(`/admin/submissions/${s.body.id}/reject`).set(admin.auth).send({}).expect(400);
    await api().post(`/admin/submissions/${s.body.id}/reject`).set(admin.auth).send({ reason: 'Blurry photo' }).expect(204);
    const mine = (await api().get('/submissions/mine').set(u.auth)).body;
    expect(mine.items[0]).toMatchObject({ status: 'REJECTED', rejectReason: 'Blurry photo' });
    expect(mine.stats.rejected).toBe(1);
    expect((await prisma.image.findUniqueOrThrow({ where: { id: photo.id } })).status).toBe('REJECTED');
  });
});

describe('AI screening and trust', () => {
  it('auto-rejects unsafe photos and offensive text; flags links', async () => {
    const u = await makeUser();
    const bad = await api().post('/submissions/review').set(u.auth).send({ placeId: place.id, rating: 1, body: 'what a fucking joke' }).expect(201);
    expect(bad.body.status).toBe('REJECTED');
    expect(bad.body.rejectReason).toMatch(/offensive/i);

    const u2 = await makeUser();
    const linky = await api().post('/submissions/review').set(u2.auth).send({ placeId: place.id, rating: 5, body: 'best, visit www.spam.com now' }).expect(201);
    expect(linky.body.status).toBe('PENDING');
    expect((await prisma.submission.findUniqueOrThrow({ where: { id: linky.body.id } })).aiScore).toBeLessThan(80);

    setAiProvider(async () => ({ json: { label: 'unsafe' }, tokensIn: 10, tokensOut: 2 }));
    const u3 = await makeUser();
    const photo = await uploadPhoto(u3);
    const un = await api().post('/submissions/photos').set(u3.auth).send({ placeId: place.id, imageIds: [photo.id] }).expect(201);
    expect(un.body.status).toBe('REJECTED');
    expect(await prisma.aiRequest.count({ where: { kind: 'screening' } })).toBe(1);
  });

  it('flags implausible menu prices', async () => {
    const u = await makeUser();
    const s = await api().post('/submissions/menu').set(u.auth).send({ placeId: place.id, sections: [{ name: 'Mains', items: [{ name: 'Steak', priceNgwee: 500 }] }] }).expect(201);
    const row = await prisma.submission.findUniqueOrThrow({ where: { id: s.body.id } });
    expect(row.aiScore).toBeLessThan(100);
    expect(JSON.stringify(row.aiReasons)).toMatch(/Unusual price/);
  });

  it('menu extraction returns an editable draft (Gemini mocked)', async () => {
    const u = await makeUser();
    const scan = await uploadPhoto(u, { purpose: 'menu-scan' });
    expect(scan.complete.body.private).toBe(true);
    await api().post('/submissions/menu-extract').set(u.auth).send({ imageId: scan.id }).expect(503); // AI not configured
    setAiProvider(async () => ({ json: { sections: [{ name: 'Starters', items: [{ name: 'Samosa', price: 15.5 }, { name: 'Free thing' }] }] }, tokensIn: 100, tokensOut: 50 }));
    const r = await api().post('/submissions/menu-extract').set(u.auth).send({ imageId: scan.id }).expect(200);
    expect(r.body).toEqual({ sections: [{ name: 'Starters', items: [{ name: 'Samosa', priceNgwee: 1550 }] }] });
    const other = await makeUser();
    await api().post('/submissions/menu-extract').set(other.auth).send({ imageId: scan.id }).expect(403);
    const log = await prisma.aiRequest.findFirstOrThrow({ where: { kind: 'menu_extract' } });
    expect(log.tokensIn).toBe(100);
  });

  it('trusted contributors auto-publish reviews; promotion after 10 approvals; demotion after 3 rejections', async () => {
    const t = await makeUser({ trust: 'TRUSTED' });
    const r = await api().post('/submissions/review').set(t.auth).send({ placeId: place.id, rating: 5, body: 'Great spot, friendly staff' }).expect(201);
    expect(r.body.status).toBe('AUTO_PUBLISHED');
    expect((await api().get(`/places/${place.id}/reviews`)).body.some((x: any) => x.body === 'Great spot, friendly staff')).toBe(true);
    // new places still need approval, even for trusted users
    const { area, category } = await ref();
    const photo = await uploadPhoto(t);
    const np = await api().post('/submissions/place').set(t.auth).send({ name: 'Trusted New Place', areaId: area.id, categoryId: category.id, lat: -15.5, lng: 28.4, imageIds: [photo.id] }).expect(201);
    expect(np.body.status).toBe('PENDING');

    // promotion
    const n = await makeUser();
    for (let i = 0; i < 10; i++) {
      const s = await api().post('/submissions/flag').set(n.auth).send({ targetType: 'review', targetId: '00000000-0000-4000-8000-000000000000', reason: `reason ${i}` }).expect(201);
      await api().post(`/admin/submissions/${s.body.id}/approve`).set(admin.auth).send({}).expect(200);
    }
    expect((await prisma.contributorStats.findUniqueOrThrow({ where: { userId: n.id } })).trustLevel).toBe('TRUSTED');
    // demotion
    for (let i = 0; i < 3; i++) {
      const s = await api().post('/submissions/review').set(n.auth).send({ placeId: place.id, rating: 1, body: 'fuck this' }).expect(201);
      expect(s.body.status).toBe('REJECTED');
      break;
    }
    for (let i = 0; i < 2; i++) {
      const s = await api().post('/submissions/flag').set(n.auth).send({ targetType: 'place', targetId: place.id, reason: `bogus ${i}` }).expect(201);
      await api().post(`/admin/submissions/${s.body.id}/reject`).set(admin.auth).send({ reason: 'not valid' }).expect(204);
    }
    expect((await prisma.contributorStats.findUniqueOrThrow({ where: { userId: n.id } })).trustLevel).toBe('NEW');
  });

  it('batch approve and spot-check revoke', async () => {
    const u = await makeUser();
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) ids.push((await api().post('/submissions/flag').set(u.auth).send({ targetType: 'review', targetId: '00000000-0000-4000-8000-00000000000' + i, reason: 'meh reason' }).expect(201)).body.id);
    const res = await api().post('/admin/submissions/batch').set(admin.auth).send({ action: 'approve', ids }).expect(200);
    expect(res.body.results.every((r: any) => r.ok)).toBe(true);
    const again = await api().post('/admin/submissions/batch').set(admin.auth).send({ action: 'approve', ids: [ids[0]] }).expect(200);
    expect(again.body.results[0].ok).toBe(false);

    const t = await makeUser({ trust: 'TRUSTED' });
    const rv = await api().post('/submissions/review').set(t.auth).send({ placeId: place.id, rating: 2, body: 'Overpriced for what it is' }).expect(201);
    await api().post(`/admin/submissions/${rv.body.id}/revoke`).set(admin.auth).send({ reason: 'Not genuine' }).expect(204);
    expect((await api().get(`/places/${place.id}/reviews`)).body.some((x: any) => x.body === 'Overpriced for what it is')).toBe(false);
  });
});

describe('admin tools', () => {
  it('merges duplicates, manages users and reference data', async () => {
    const a = await makePlace(admin, { name: 'Dup One' });
    const b = await makePlace(admin, { name: 'Dup Two' });
    const u = await makeUser();
    await api().put(`/places/${b.id}/favourite`).set(u.auth);
    await api().post(`/admin/places/${b.id}/merge`).set(admin.auth).send({ intoId: a.id }).expect(204);
    await api().get(`/places/${b.slug}`).expect(404);
    expect((await api().get('/me/favourites').set(u.auth)).body.map((p: any) => p.id)).toEqual([a.id]);
    expect(await prisma.menuItem.count({ where: { placeId: b.id } })).toBe(0);

    await api().put(`/admin/users/${u.id}/trust`).set(admin.auth).send({ trustLevel: 'BANNED' }).expect(204);
    await api().post('/submissions/flag').set(u.auth).send({ targetType: 'place', targetId: a.id, reason: 'x y z' }).expect(403);

    const area = await api().post('/admin/areas').set(admin.auth).send({ name: 'New Area', lat: -15.5, lng: 28.2 }).expect(201);
    expect(area.body.slug).toBe('new-area');
    await api().post('/admin/areas').set(u.auth).send({ name: 'Nope', lat: 0, lng: 0 }).expect(403);
    const stats = await api().get('/admin/stats').set(admin.auth).expect(200);
    expect(stats.body.livePlaces).toBeGreaterThan(1);
    expect((await api().get('/admin/moderation-log').set(admin.auth)).body.length).toBeGreaterThan(3);
  });
});
