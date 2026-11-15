import { beforeAll, describe, expect, it } from 'vitest';
import { api, resetDb, makeUser, makePlace, ref, uploadPhoto, prisma } from './helpers.js';

let admin: Awaited<ReturnType<typeof makeUser>>;
let owner: Awaited<ReturnType<typeof makeUser>>;
let stranger: Awaited<ReturnType<typeof makeUser>>;
let place: { id: string; slug: string };

beforeAll(async () => {
  await resetDb();
  admin = await makeUser({ role: 'ADMIN' });
  owner = await makeUser({ name: 'Owner Olu' });
  stranger = await makeUser();
  place = await makePlace(admin);
});

describe('claim -> owner', () => {
  it('becomes owner only after admin approves the claim', async () => {
    await api().get(`/owner/places/${place.id}`).set(owner.auth).expect(403);
    const c = await api().post('/submissions/claim').set(owner.auth).send({ placeId: place.id, message: 'I am the manager', contactPhone: '0971234567' }).expect(201);
    await api().get('/owner/places').set(owner.auth).expect(200).then((r) => expect(r.body).toEqual([]));
    await api().post(`/admin/submissions/${c.body.id}/approve`).set(admin.auth).expect(200);
    // role changed to OWNER; re-login for a fresh token
    owner = { ...owner, ...(await (async () => { const l = await api().post('/auth/login').send({ email: owner.email, password: 'password123' }); return { auth: { Authorization: `Bearer ${l.body.accessToken}` } }; })()) };
    const mine = await api().get('/owner/places').set(owner.auth).expect(200);
    expect(mine.body.map((p: any) => p.id)).toEqual([place.id]);
    await api().get(`/owner/places/${place.id}`).set(stranger.auth).expect(403);
  });
});

describe('owner editing', () => {
  it('edits details, hours and tags directly and rejects bad text', async () => {
    await api().patch(`/owner/places/${place.id}`).set(owner.auth).send({ phone: '0977000111', description: 'Best burgers in town', hours: [{ weekday: 1, opensAt: '09:00', closesAt: '21:00' }], tagSlugs: ['quiet'] }).expect(204);
    const p = await api().get(`/places/${place.slug}`).expect(200);
    expect(p.body.phone).toBe('0977000111');
    expect(p.body.hours).toHaveLength(1);
    expect(p.body.tags.map((t: any) => t.slug)).toEqual(['quiet']);
    await api().patch(`/owner/places/${place.id}`).set(owner.auth).send({ description: 'what the fuck' }).expect(400);
    await api().patch(`/owner/places/${place.id}`).set(stranger.auth).send({ phone: '1' }).expect(403);
  });

  it('replaces the menu, toggles availability and recalculates the average spend', async () => {
    const before = (await api().get(`/places/${place.slug}`)).body.avgSpendPpNgwee;
    await api().put(`/owner/places/${place.id}/menu`).set(owner.auth).send({
      sections: [{ name: 'Mains', items: [{ name: 'Burger', priceNgwee: 20000 }] }, { name: 'Drinks', items: [{ name: 'Coke', priceNgwee: 3000 }] }],
    }).expect(204);
    const p = (await api().get(`/places/${place.slug}`)).body;
    expect(p.avgSpendPpNgwee).toBe(23000);
    expect(p.avgSpendPpNgwee).not.toBe(before);
    const names = p.menu.flatMap((s: any) => s.items.map((i: any) => i.name));
    expect(names.sort()).toEqual(['Burger', 'Coke']); // omitted items are no longer shown
    const burger = p.menu[0].items[0];
    await api().patch(`/owner/places/${place.id}/items/${burger.id}`).set(owner.auth).send({ priceNgwee: 18000 }).expect(204);
    expect((await api().get(`/places/${place.slug}`)).body.avgSpendPpNgwee).toBe(21000);
    await api().patch(`/owner/places/${place.id}/items/${burger.id}`).set(stranger.auth).send({ isAvailable: false }).expect(403);
  });

  it('adds and reorders gallery photos', async () => {
    const a = await uploadPhoto(owner), b = await uploadPhoto(owner);
    await api().post(`/owner/places/${place.id}/photos`).set(owner.auth).send({ imageIds: [a.id, b.id] }).expect(204);
    await api().put(`/owner/places/${place.id}/photos/order`).set(owner.auth).send({ imageIds: [b.id, a.id] }).expect(204);
    const imgs = (await api().get(`/places/${place.slug}`)).body.images.map((i: any) => i.id);
    expect(imgs).toEqual([b.id, a.id]);
    await api().post(`/owner/places/${place.id}/photos`).set(owner.auth).send({ imageIds: [a.id] }).expect(400); // already used
    await api().delete(`/owner/places/${place.id}/photos/${a.id}`).set(owner.auth).expect(204);
    expect((await api().get(`/places/${place.slug}`)).body.images).toHaveLength(1);
  });

  it('replies to reviews and shows active deals', async () => {
    const reviewer = await makeUser();
    const review = await prisma.review.create({ data: { placeId: place.id, userId: reviewer.id, rating: 5, body: 'Great', status: 'APPROVED' } });
    await api().put(`/owner/places/${place.id}/reviews/${review.id}/reply`).set(owner.auth).send({ reply: 'Thank you!' }).expect(204);
    const rs = await api().get(`/places/${place.id}/reviews`).expect(200);
    expect(rs.body[0].ownerReply).toBe('Thank you!');
    await api().put(`/owner/places/${place.id}/reviews/${review.id}/reply`).set(stranger.auth).send({ reply: 'x' }).expect(403);

    const now = Date.now();
    await api().post(`/owner/places/${place.id}/deals`).set(owner.auth).send({ title: 'Couple dinner K299', priceNgwee: 29900, startsAt: new Date(now - 3600e3), endsAt: new Date(now + 86400e3) }).expect(201);
    await api().post(`/owner/places/${place.id}/deals`).set(owner.auth).send({ title: 'Expired deal', priceNgwee: 100, startsAt: new Date(now - 7200e3), endsAt: new Date(now - 3600e3) }).expect(201);
    await api().post(`/owner/places/${place.id}/deals`).set(owner.auth).send({ title: 'Bad dates', priceNgwee: 100, startsAt: new Date(now), endsAt: new Date(now - 1000) }).expect(400);
    const p = (await api().get(`/places/${place.slug}`)).body;
    expect(p.deals.map((d: any) => d.title)).toEqual(['Couple dinner K299']);
  });

  it('reports stats from place events', async () => {
    for (const type of ['view', 'view', 'menu_view', 'call', 'directions', 'whatsapp']) await api().post(`/places/${place.id}/events`).send({ type }).expect(204);
    const s = await api().get(`/owner/places/${place.id}/stats?days=7`).set(owner.auth).expect(200);
    expect(s.body.totals).toMatchObject({ view: 2, menu_view: 1, call: 1, directions: 1, whatsapp: 1 });
    expect(s.body.series).toHaveLength(7);
    expect(s.body.series.reduce((a: number, d: any) => a + d.views, 0)).toBe(2);
    await api().get(`/owner/places/${place.id}/stats`).set(stranger.auth).expect(403);
  });
});

describe('leaderboard & badges', () => {
  it('ranks contributors by points for an area', async () => {
    const { area, category } = await ref();
    const u1 = await makeUser({ name: 'Top Contributor' }), u2 = await makeUser({ name: 'Second' });
    const p = place.id;
    await prisma.submission.createMany({ data: [
      { userId: u1.id, type: 'MENU', targetPlaceId: p, payload: {}, status: 'APPROVED' },
      { userId: u1.id, type: 'PHOTOS', targetPlaceId: p, payload: {}, status: 'AUTO_PUBLISHED' },
      { userId: u2.id, type: 'REVIEW', targetPlaceId: p, payload: {}, status: 'APPROVED' },
      { userId: u2.id, type: 'MENU', targetPlaceId: p, payload: {}, status: 'REJECTED' },
    ] });
    const lb = await api().get(`/leaderboard?area=${area.slug}`).set(u2.auth).expect(200);
    expect(lb.body.map((r: any) => [r.name, r.points])).toEqual([['Top Contributor', 20], ['Second', 5]]);
    expect(lb.body[1].isMe).toBe(true);
    expect((await api().get('/leaderboard?area=kabulonga')).body).toEqual([]);
    void category;
    const badges = await api().get('/me/badges').set(u1.auth).expect(200);
    expect(badges.body.length).toBeGreaterThan(0);
    await api().get('/me/badges').expect(401);
  });
});

describe('privacy: export, deletion, takedown', () => {
  it('exports and deletes personal data', async () => {
    const u = await makeUser({ name: 'Privacy Pat' });
    await api().put(`/places/${place.id}/favourite`).set(u.auth).expect(204);
    await api().post('/planner/chat').set(u.auth).send({ message: 'for 2 K500' }).expect(200);
    const ex = await api().get('/me/export').set(u.auth).expect(200);
    expect(ex.headers['content-disposition']).toMatch(/attachment/);
    expect(ex.body.profile.email).toBe(u.email);
    expect(ex.body.favourites).toHaveLength(1);
    expect(ex.body.plannerRequests).toHaveLength(1);
    await api().delete('/me').set(u.auth).expect(204);
    const gone = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(gone).toMatchObject({ name: 'Deleted user', email: null, passwordHash: null });
    expect(await prisma.aiRequest.count({ where: { userId: u.id } })).toBe(0);
    expect((await prisma.aiRequest.findFirst({ where: { kind: 'planner', userId: null } }))?.prompt).toBeNull();
    await api().post('/auth/login').send({ email: u.email, password: 'password123' }).expect(401);
  });

  it('handles takedown requests with a 72 hour deadline', async () => {
    await api().post('/takedowns').send({ targetType: 'place', reason: 'short' }).expect(400);
    const t = await api().post('/takedowns').send({ targetType: 'place', targetId: place.id, reason: 'This listing uses my photo without permission', contactName: 'Rights Holder', contactEmail: 'rh@example.com' }).expect(201);
    expect(new Date(t.body.dueAt).getTime() - Date.now()).toBeGreaterThan(71 * 3600e3);
    await api().get('/admin/takedowns').set(stranger.auth).expect(403);
    const list = await api().get('/admin/takedowns').set(admin.auth).expect(200);
    expect(list.body[0]).toMatchObject({ id: t.body.id, status: 'OPEN', overdue: false });
    await api().post(`/admin/takedowns/${t.body.id}/resolve`).set(admin.auth).send({ action: 'remove', note: 'Removed' }).expect(204);
    expect((await prisma.place.findUniqueOrThrow({ where: { id: place.id } })).status).toBe('HIDDEN');
    await api().post(`/admin/takedowns/${t.body.id}/resolve`).set(admin.auth).send({ action: 'dismiss' }).expect(400);
    await api().get(`/places/${place.slug}`).expect(404);
  });

  it('health check reports database status', async () => {
    await api().get('/health').expect(200);
  });
});
