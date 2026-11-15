import { beforeAll, afterEach, describe, expect, it } from 'vitest';
import { api, resetDb, makeUser, makePlace, prisma } from './helpers.js';
import { setAiProvider } from '../src/services/ai.js';
import { config } from '../src/config.js';
import { parseHeuristic, targetDate, buildBundles } from '../src/services/planner.js';

let admin: Awaited<ReturnType<typeof makeUser>>;
const AREAS = ['woodlands', 'kabulonga', 'east-park', 'northmead'];

beforeAll(async () => {
  await resetDb();
  admin = await makeUser({ role: 'ADMIN' });
  const tags = await prisma.tag.findMany();
  const tagId = (s: string) => tags.find((t) => t.slug === s)!.id;
  const areas = await prisma.area.findMany();
  const cats = await prisma.category.findMany();
  const menus: [string, number, number][] = [['Cheap Eats', 4000, 1000], ['Midrange Bistro', 9000, 3000], ['Fancy Grill', 25000, 8000], ['Cafe Cosy', 7000, 4000], ['Garden Spot', 12000, 2500], ['Nshima Hut', 5500, 1500]];
  for (const [i, [name, main, drink]] of menus.entries()) {
    const p = await makePlace(admin, {
      name, areaId: areas.find((a) => a.slug === AREAS[i % 4])!.id, categoryId: cats[i % cats.length].id, lat: -15.4 - i * 0.002,
      menu: [
        { name: 'Mains', items: [{ name: `${name} Special`, priceNgwee: main }, { name: `${name} Plate`, priceNgwee: main + 2000 }, { name: `${name} Deluxe`, priceNgwee: main + 6000 }] },
        { name: 'Drinks', items: [{ name: 'Soda', priceNgwee: drink }, { name: 'Juice', priceNgwee: drink + 500 }] },
        ...(i % 2 ? [{ name: 'Desserts', items: [{ name: 'Cake', priceNgwee: 3000 }] }] : []),
      ],
    });
    if (i % 2 === 0) await prisma.placeTag.create({ data: { placeId: p.id, tagId: tagId('outdoor') } });
  }
  // a place with real recent bills much higher than its menu suggests
  const p = await prisma.place.findFirstOrThrow({ where: { name: 'Cheap Eats' } });
  const u = await makeUser();
  await prisma.review.create({ data: { placeId: p.id, userId: u.id, rating: 4, amountPaidNgwee: 100000, groupSize: 2, status: 'APPROVED' } });
  config.limits.plannerPerDay = 10_000;
});
afterEach(() => setAiProvider(null));

const rnd = (() => { let s = 7; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; })();
const pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length)];

/** Fake Gemini that sometimes hallucinates ids, bundles and totals. */
const flakyAi = (mode: 'good' | 'hallucinate' | 'garbage') => async ({ prompt }: { prompt: string }) => {
  const usage = { tokensIn: 100, tokensOut: 20 };
  if (prompt.includes('extract structured filters')) return { json: mode === 'garbage' ? 'nonsense' : { budgetNgwee: null, groupSize: null, areaSlug: 'narnia', tags: ['not-a-tag'], day: null, time: null, occasion: null }, ...usage };
  const cands = JSON.parse(prompt.split('Candidates: ')[1].split('\nReturn JSON')[0]) as { place_id: string; bundles: { bundle_id: string }[] }[];
  if (mode === 'garbage') return { json: { oops: true }, ...usage };
  const picks = cands.slice(0, 3).map((c) => ({ place_id: c.place_id, bundle_id: mode === 'hallucinate' ? 'fake-bundle' : c.bundles[0]?.bundle_id, reason: 'Great pick', total: 1 }));
  if (mode === 'hallucinate') picks.unshift({ place_id: '00000000-0000-0000-0000-000000000000', bundle_id: 'x', reason: 'Imaginary place', total: 1 });
  return { json: picks, ...usage };
};

describe('helpers', () => {
  it('parses budget, group, area, tags and time heuristically', () => {
    const meta = { areas: [{ slug: 'woodlands', name: 'Woodlands' }], tags: [{ slug: 'outdoor', name: 'Outdoor' }] };
    const f = parseHeuristic('Date for 2 in Woodlands, K400 max, outdoor, Saturday evening', meta);
    expect(f).toMatchObject({ budgetNgwee: 40000, groupSize: 2, areaSlug: 'woodlands', tags: ['outdoor'], day: 'saturday', time: 'evening', occasion: 'date' });
    expect(parseHeuristic('lunch for 5 friends under 1,200 kwacha', meta)).toMatchObject({ budgetNgwee: 120000, groupSize: 5, time: 'lunch' });
  });
  it('computes the target date in Lusaka time', () => {
    const d = targetDate('saturday', 'evening', new Date('2026-11-13T10:00:00Z'))!; // Friday
    expect(d.toISOString()).toBe('2026-11-14T17:00:00.000Z'); // Sat 19:00 CAT
  });
  it('builds bundles only from real items', () => {
    const items = [{ id: 'a', name: 'Burger', priceNgwee: 10000, section: { name: 'Mains' } }, { id: 'b', name: 'Coke', priceNgwee: 2000, section: { name: 'Drinks' } }, { id: 'c', name: 'Cake', priceNgwee: 3000, section: { name: 'Desserts' } }];
    const b = buildBundles('p', items, 3);
    expect(b.map((x) => x.kind)).toEqual(['budget', 'treat']); // standard has the same total as budget and is deduped
    expect(b[0].totalNgwee).toBe(3 * 12000);
    expect(b[1].totalNgwee).toBe(3 * 15000);
  });
});

describe('planner API', () => {
  it('requires auth and a budget', async () => {
    await api().post('/planner/chat').send({ message: 'hi there' }).expect(401);
    const u = await makeUser();
    const r = await api().post('/planner/chat').set(u.auth).send({ message: 'somewhere nice' }).expect(200);
    expect(r.body.needs).toBe('budget');
    expect(r.body.options).toEqual([]);
  });

  it('returns affordable options with line items, logs the request, and refines', async () => {
    const u = await makeUser();
    const r = await api().post('/planner/chat').set(u.auth).send({ message: 'dinner for 2 in woodlands K300' }).expect(200);
    expect(r.body.options.length).toBeGreaterThan(0);
    for (const o of r.body.options) {
      expect(o.bundle.totalNgwee).toBeLessThanOrEqual(30000);
      expect(o.bundle.items.reduce((a: number, i: any) => a + i.priceNgwee * i.qty, 0)).toBe(o.bundle.totalNgwee);
    }
    const log = await prisma.aiRequest.findFirst({ where: { userId: u.id, kind: 'planner' } });
    expect(log?.parsedFilters).toMatchObject({ budgetNgwee: 30000, groupSize: 2 });
    expect(log?.candidatePlaceIds.length).toBeGreaterThan(0);
    const cheaper = await api().post('/planner/chat').set(u.auth).send({ message: 'cheaper please', filters: r.body.filters }).expect(200);
    expect(cheaper.body.filters.budgetNgwee).toBe(22500);
    expect(cheaper.body.filters.groupSize).toBe(2);
    cheaper.body.options.forEach((o: any) => expect(o.bundle.totalNgwee).toBeLessThanOrEqual(22500));
  });

  it('falls back to over-budget nearest with the gap shown', async () => {
    const u = await makeUser();
    const r = await api().post('/planner/chat').set(u.auth).send({ message: 'for 4 people K100' }).expect(200);
    expect(r.body.options.length).toBeGreaterThan(0);
    for (const o of r.body.options) expect(o.overBudgetNgwee).toBe(o.bundle.totalNgwee - 10000);
    expect(r.body.options[0].overBudgetNgwee).toBeGreaterThan(0);
  });

  it('deprioritises places whose recent real bills exceed the budget', async () => {
    const u = await makeUser();
    const r = await api().post('/planner/chat').set(u.auth).send({ message: 'for 2 K250 in northmead' }).expect(200);
    const names = r.body.options.map((o: any) => o.name);
    expect(names[0]).not.toBe('Cheap Eats'); // menu total is cheap but reviews say K500 pp
  });

  it('enforces the daily limit', async () => {
    const u = await makeUser();
    config.limits.plannerPerDay = 2;
    await api().post('/planner/chat').set(u.auth).send({ message: 'for 2 K300' }).expect(200);
    const second = await api().post('/planner/chat').set(u.auth).send({ message: 'for 2 K300' }).expect(200);
    expect(second.body.remaining).toBe(0);
    await api().post('/planner/chat').set(u.auth).send({ message: 'for 2 K300' }).expect(429);
    config.limits.plannerPerDay = 10_000;
  });
});

describe('Gate 2: 100 prompts, totals always match the database', () => {
  it('never returns an unknown place or a wrong total, even when the AI hallucinates', async () => {
    const u = await makeUser();
    const modes = ['good', 'hallucinate', 'garbage'] as const;
    const tagWords = ['', '', 'outdoor', 'quiet'];
    let withOptions = 0;
    for (let i = 0; i < 100; i++) {
      setAiProvider(i % 5 === 0 ? null : (flakyAi(modes[i % 3]) as any));
      const budget = pick([50, 80, 120, 200, 300, 450, 800, 1500]);
      const msg = `${pick(['dinner', 'lunch', 'a date', 'drinks'])} for ${1 + Math.floor(rnd() * 6)} in ${pick(['woodlands', 'kabulonga', 'east park', 'northmead', 'chilenje'])} K${budget} ${pick(tagWords)} ${pick(['saturday evening', 'friday night', 'tomorrow lunch', ''])}`;
      const res = await api().post('/planner/chat').set(u.auth).send({ message: msg }).expect(200);
      const budgetNgwee = res.body.filters.budgetNgwee as number;
      expect(budgetNgwee).toBe(budget * 100);
      for (const o of res.body.options) {
        withOptions++;
        const place = await prisma.place.findUnique({ where: { id: o.placeId } });
        expect(place, msg).not.toBeNull();
        let total = 0;
        for (const line of o.bundle.items) {
          const item = await prisma.menuItem.findUnique({ where: { id: line.itemId } });
          expect(item?.placeId).toBe(o.placeId);
          expect(item?.priceNgwee).toBe(line.priceNgwee);
          expect(line.qty).toBe(res.body.filters.groupSize);
          total += item!.priceNgwee * line.qty;
        }
        expect(o.bundle.totalNgwee, msg).toBe(total);
        expect(o.overBudgetNgwee, msg).toBe(Math.max(0, total - budgetNgwee));
      }
      expect(res.body.options.length).toBeLessThanOrEqual(3);
    }
    expect(withOptions).toBeGreaterThan(100);
  });
});

describe('saved plans', () => {
  it('recomputes totals server-side, shares by token, and deletes', async () => {
    const u = await makeUser();
    const r = await api().post('/planner/chat').set(u.auth).send({ message: 'for 2 K400' }).expect(200);
    const o = r.body.options[0];
    const body = { budgetNgwee: 40000, groupSize: 2, stops: [{ placeId: o.placeId, items: o.bundle.items.map((i: any) => ({ itemId: i.itemId, qty: i.qty, priceNgwee: 1 })) }] };
    const saved = await api().post('/plans').set(u.auth).send(body).expect(201);
    expect(saved.body.totalNgwee).toBe(o.bundle.totalNgwee);
    const shared = await api().get(`/plans/shared/${saved.body.shareToken}`).expect(200);
    expect(shared.body.stops[0].name).toBe(o.name);
    await api().get('/plans/shared/nope').expect(404);
    expect((await api().get('/plans').set(u.auth).expect(200)).body).toHaveLength(1);
    await api().post('/plans').set(u.auth).send({ ...body, stops: [{ placeId: o.placeId, items: [{ itemId: '00000000-0000-0000-0000-000000000000', qty: 1 }] }] }).expect(400);
    await api().delete(`/plans/${saved.body.id}`).set(u.auth).expect(204);
    await api().get(`/plans/shared/${saved.body.shareToken}`).expect(404);
  });
});
