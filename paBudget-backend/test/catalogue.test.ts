import { beforeAll, describe, expect, it } from 'vitest';
import { api, resetDb, makeUser, makePlace, ref, prisma } from './helpers.js';

let admin: Awaited<ReturnType<typeof makeUser>>;
let cheap: { id: string; slug: string }, pricey: { id: string; slug: string };

beforeAll(async () => {
  await resetDb();
  admin = await makeUser({ role: 'ADMIN' });
  const { area, tag } = await ref();
  cheap = await makePlace(admin, { name: 'Cheap Eats', tagSlugs: [tag.slug] });
  const kab = await prisma.area.findFirstOrThrow({ where: { slug: 'kabulonga' } });
  pricey = await makePlace(admin, {
    name: 'Fancy Place', areaId: kab.id, lat: -15.41, lng: 28.327,
    hours: [{ weekday: 5, opensAt: '18:00', closesAt: '02:00' }],
    menu: [{ name: 'Mains', items: [{ name: 'Ribeye Steak', priceNgwee: 25000 }] }, { name: 'Drinks', items: [{ name: 'Wine glass', priceNgwee: 12000 }] }],
  });
  void area;
});

describe('catalogue', () => {
  it('computes average spend and price level from the menu', async () => {
    const p = await api().get(`/places/${cheap.slug}`).expect(200);
    expect(p.body.avgSpendPpNgwee).toBe(12000 + 3500); // median main (upper) + median drink (upper)
    expect(p.body.priceLevel).toBe(2);
    expect(p.body.menu.map((s: any) => s.name)).toEqual(['Mains', 'Drinks']);
    expect(p.body.menuUpdatedAt).toBeTruthy();
  });

  it('lists with budget, area, tag and sort filters', async () => {
    const all = await api().get('/places').expect(200);
    expect(all.body.total).toBe(2);
    const budget = await api().get('/places?maxPp=20000').expect(200);
    expect(budget.body.items.map((i: any) => i.name)).toEqual(['Cheap Eats']);
    const group = await api().get('/places?totalBudget=40000&groupSize=2').expect(200); // K200 pp
    expect(group.body.items.map((i: any) => i.name)).toEqual(['Cheap Eats']);
    const area = await api().get('/places?area=kabulonga').expect(200);
    expect(area.body.items.map((i: any) => i.name)).toEqual(['Fancy Place']);
    const tagged = await api().get('/places?tags=outdoor').expect(200);
    expect(tagged.body.items.map((i: any) => i.name)).toEqual(['Cheap Eats']);
    const cheapest = await api().get('/places?sort=cheapest').expect(200);
    expect(cheapest.body.items[0].name).toBe('Cheap Eats');
    const near = await api().get('/places?lat=-15.41&lng=28.327&sort=nearest').expect(200);
    expect(near.body.items[0].name).toBe('Fancy Place');
    expect(near.body.items[0].distanceM).toBeLessThan(50);
  });

  it('searches by place name (fuzzy), dish and area', async () => {
    expect((await api().get('/places?q=cheep').expect(200)).body.items.map((i: any) => i.name)).toEqual(['Cheap Eats']);
    expect((await api().get('/places?q=ribeye').expect(200)).body.items.map((i: any) => i.name)).toEqual(['Fancy Place']);
    expect((await api().get('/places?q=kabulonga').expect(200)).body.items.map((i: any) => i.name)).toEqual(['Fancy Place']);
    expect((await api().get('/places?q=zzzz').expect(200)).body.total).toBe(0);
  });

  it('filters open now', async () => {
    const r = await api().get('/places?openNow=true').expect(200);
    // Cheap Eats is open 08:00-22:00 daily; it is only guaranteed in-window during those hours
    const hour = new Date(Date.now() + 2 * 3600_000).getUTCHours();
    if (hour >= 8 && hour < 22) expect(r.body.items.some((i: any) => i.name === 'Cheap Eats')).toBe(true);
    else expect(r.body.items.some((i: any) => i.name === 'Cheap Eats')).toBe(false);
  });

  it('hides non-live places and rejects bad queries', async () => {
    await prisma.place.update({ where: { id: pricey.id }, data: { status: 'HIDDEN' } });
    expect((await api().get('/places').expect(200)).body.total).toBe(1);
    await api().get(`/places/${pricey.slug}`).expect(404);
    await prisma.place.update({ where: { id: pricey.id }, data: { status: 'LIVE' } });
    await api().get('/places?limit=9999').expect(400);
  });

  it('favourites, events and meta', async () => {
    const u = await makeUser();
    await api().put(`/places/${cheap.id}/favourite`).expect(401);
    await api().put(`/places/${cheap.id}/favourite`).set(u.auth).expect(204);
    const favs = await api().get('/me/favourites').set(u.auth).expect(200);
    expect(favs.body.map((p: any) => p.name)).toEqual(['Cheap Eats']);
    await api().delete(`/places/${cheap.id}/favourite`).set(u.auth).expect(204);
    expect((await api().get('/me/favourites').set(u.auth)).body).toEqual([]);
    await api().post(`/places/${cheap.id}/events`).send({ type: 'call' }).expect(204);
    expect(await prisma.placeEvent.count({ where: { type: 'call' } })).toBe(1);
    const meta = await api().get('/meta').expect(200);
    expect(meta.body.areas.length).toBeGreaterThan(5);
  });
});
