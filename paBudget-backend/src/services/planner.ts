import crypto from 'node:crypto';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { aiConfigured, aiJson } from './ai.js';
import { isOpenAt } from '../lib/util.js';
import { tooMany } from '../lib/errors.js';
import { urls } from './images.js';
import { ratingMap } from './places.js';

/** AI budget planner (URD §7). The database picks candidates and code does all arithmetic; Gemini only parses and ranks. */

export type Filters = {
  budgetNgwee: number | null; groupSize: number; areaSlug: string | null; tags: string[];
  day: string | null; time: string | null; occasion: string | null;
};
export type BundleItem = { itemId: string; name: string; priceNgwee: number; qty: number; role: 'main' | 'drink' | 'dessert' };
export type Bundle = { id: string; kind: 'budget' | 'standard' | 'treat'; items: BundleItem[]; totalNgwee: number };
export type PlanOption = {
  placeId: string; slug: string; name: string; area: string; category: string; thumb: string | null; rating: number | null;
  tags: string[]; reason: string; bundle: Bundle; overBudgetNgwee: number; recentBillPpNgwee: number | null;
};
export type PlannerReply = {
  filters: Filters; message: string; needs?: 'budget'; notes: string[]; options: PlanOption[]; remaining: number;
};

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const TIMES: Record<string, string> = { morning: '09:00', breakfast: '08:00', lunch: '12:30', afternoon: '15:00', evening: '19:00', dinner: '19:00', night: '21:00', late: '22:00' };

// ---------- request parsing ----------

type Meta = { areas: { slug: string; name: string }[]; tags: { slug: string; name: string }[] };

const sanitize = (raw: Partial<Record<keyof Filters, unknown>>, meta: Meta): Partial<Filters> => {
  const out: Partial<Filters> = {};
  const n = Number(raw.budgetNgwee);
  if (Number.isFinite(n) && n > 0 && n <= 1e9) out.budgetNgwee = Math.round(n);
  const g = Number(raw.groupSize);
  if (Number.isInteger(g) && g >= 1 && g <= 100) out.groupSize = g;
  if (typeof raw.areaSlug === 'string' && meta.areas.some((a) => a.slug === raw.areaSlug)) out.areaSlug = raw.areaSlug;
  if (Array.isArray(raw.tags)) out.tags = [...new Set(raw.tags.filter((t): t is string => typeof t === 'string' && meta.tags.some((m) => m.slug === t)))];
  if (typeof raw.day === 'string' && (DAYS.includes(raw.day.toLowerCase()) || raw.day.toLowerCase() === 'today' || raw.day.toLowerCase() === 'tomorrow')) out.day = raw.day.toLowerCase();
  if (typeof raw.time === 'string' && (raw.time.toLowerCase() in TIMES || /^([01]\d|2[0-3]):[0-5]\d$/.test(raw.time))) out.time = raw.time.toLowerCase();
  if (typeof raw.occasion === 'string' && raw.occasion.trim()) out.occasion = raw.occasion.trim().slice(0, 40);
  return out;
};

/** Regex parser used when Gemini is unavailable and to make refinements deterministic. */
export function parseHeuristic(message: string, meta: Meta): Partial<Filters> {
  const m = message.toLowerCase();
  const raw: Partial<Record<keyof Filters, unknown>> = {};
  const money = m.match(/(?:k|zmw|kwacha)\s?(\d[\d,]*(?:\.\d+)?)|(\d[\d,]*(?:\.\d+)?)\s?(?:k\b|kwacha|zmw)/);
  if (money) raw.budgetNgwee = Math.round(parseFloat((money[1] ?? money[2]).replace(/,/g, '')) * 100);
  const grp = m.match(/\bfor\s+(\d{1,3})\b(?!\s?(?:k|kwacha))/) ?? m.match(/\b(\d{1,3})\s+(?:people|persons|of us|friends|guests|pax|adults)\b/);
  if (grp) raw.groupSize = Number(grp[1]);
  else if (/\b(couple|date|two of us|romantic)\b/.test(m)) raw.groupSize = 2;
  else if (/\b(solo|alone|just me|myself)\b/.test(m)) raw.groupSize = 1;
  const area = meta.areas.find((a) => m.includes(a.name.toLowerCase()));
  if (area) raw.areaSlug = area.slug;
  raw.tags = meta.tags.filter((t) => m.includes(t.name.toLowerCase()) || m.includes(t.slug.replace(/-/g, ' '))).map((t) => t.slug);
  const day = DAYS.find((d) => m.includes(d)) ?? (/\btomorrow\b/.test(m) ? 'tomorrow' : /\b(today|tonight)\b/.test(m) ? 'today' : undefined);
  if (day) raw.day = day;
  const time = Object.keys(TIMES).find((t) => new RegExp(`\\b${t}\\b`).test(m)) ?? (/\btonight\b/.test(m) ? 'evening' : undefined);
  if (time) raw.time = time;
  if (/\bdate\b/.test(m)) raw.occasion = 'date';
  else if (/\bbirthday\b/.test(m)) raw.occasion = 'birthday';
  else if (/\bfamily\b/.test(m)) raw.occasion = 'family';
  return sanitize(raw, meta);
}

const PRESENT = <K extends keyof Filters>(k: K, v: Partial<Filters>) => v[k] !== undefined && v[k] !== null;

export async function parseRequest(userId: string, message: string, prev: Filters | null, meta: Meta, acc: { tokensIn: number; tokensOut: number }) {
  const heuristic = parseHeuristic(message, meta);
  let ai: Partial<Filters> = {};
  if (aiConfigured()) {
    try {
      const raw = await aiJson<Record<string, unknown>>('planner_parse', userId, {
        prompt: `You extract structured filters from a message to a Lusaka (Zambia) outing planner.
Known areas (slug: name): ${meta.areas.map((a) => `${a.slug}: ${a.name}`).join('; ')}
Known tags (slugs): ${meta.tags.map((t) => t.slug).join(', ')}
${prev ? `Current filters from the conversation: ${JSON.stringify(prev)}\nThe new message may refine them. Only return fields the message changes or adds; use null for unchanged ones.` : 'Use null for anything not mentioned.'}
Message: ${JSON.stringify(message)}
Return JSON: {"budgetNgwee": integer ngwee (K400 => 40000) or null, "groupSize": integer or null, "areaSlug": slug or null, "tags": [slugs], "day": "monday".."sunday"|"today"|"tomorrow"|null, "time": "morning"|"lunch"|"afternoon"|"evening"|"night"|"HH:MM"|null, "occasion": short string or null}`,
      }, acc);
      ai = sanitize(raw, meta);
    } catch { /* fall back to heuristic */ }
  }
  const found: Partial<Filters> = { ...heuristic, ...Object.fromEntries(Object.entries(ai).filter(([, v]) => v !== undefined && !(Array.isArray(v) && !v.length))) };
  if (!(ai.tags?.length) && heuristic.tags?.length) found.tags = heuristic.tags;

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { homeArea: true } });
  const base: Filters = prev ?? { budgetNgwee: null, groupSize: 0, areaSlug: null, tags: [], day: null, time: null, occasion: null };
  const f: Filters = {
    budgetNgwee: found.budgetNgwee ?? base.budgetNgwee, groupSize: found.groupSize ?? base.groupSize,
    areaSlug: found.areaSlug ?? base.areaSlug, tags: base.tags, day: found.day ?? base.day, time: found.time ?? base.time, occasion: found.occasion ?? base.occasion,
  };
  if (found.tags?.length) f.tags = prev ? [...new Set([...base.tags, ...found.tags])] : found.tags;
  const lower = message.toLowerCase();
  // refinements are applied in code so they are deterministic
  if (prev?.budgetNgwee && found.budgetNgwee === undefined && /\b(cheaper|cheap|less|lower|tighter|save)\b/.test(lower)) f.budgetNgwee = Math.round(prev.budgetNgwee * 0.75);
  if (prev?.budgetNgwee && found.budgetNgwee === undefined && /\b(bit more|more budget|splurge|nicer|fancier)\b/.test(lower)) f.budgetNgwee = Math.round(prev.budgetNgwee * 1.25);
  if (!PRESENT('groupSize', f) || !f.groupSize) f.groupSize = 2;
  if (!f.areaSlug && user?.homeArea) f.areaSlug = user.homeArea.slug;
  if (!f.budgetNgwee && user?.defaultBudgetNgwee) f.budgetNgwee = user.defaultBudgetNgwee;
  return f;
}

// ---------- candidates and bundles ----------

const isDrinkSection = (n: string) => /drink|beverage|juice|soda|coffee|tea|beer|wine|cocktail|water/i.test(n);
const isDessertSection = (n: string) => /dessert|sweet|cake|ice ?cream|treat|pastr/i.test(n);
const isSideSection = (n: string) => /starter|appeti[sz]er|side|snack|extra|add[- ]?on/i.test(n);

const median = <T extends { priceNgwee: number }>(a: T[]) => [...a].sort((x, y) => x.priceNgwee - y.priceNgwee)[Math.floor(a.length / 2)];
const cheapest = <T extends { priceNgwee: number }>(a: T[]) => a.reduce((m, x) => (x.priceNgwee < m.priceNgwee ? x : m));

type MenuItemRow = { id: string; name: string; priceNgwee: number; section: { name: string } };

/** One main + one drink per person (plus dessert for the "treat" bundle), built only from real, available menu items. */
export function buildBundles(placeId: string, items: MenuItemRow[], group: number): Bundle[] {
  const drinks = items.filter((i) => isDrinkSection(i.section.name));
  const desserts = items.filter((i) => !isDrinkSection(i.section.name) && isDessertSection(i.section.name));
  let mains = items.filter((i) => !isDrinkSection(i.section.name) && !isDessertSection(i.section.name) && !isSideSection(i.section.name));
  if (!mains.length) mains = items.filter((i) => !isDrinkSection(i.section.name) && !isDessertSection(i.section.name));
  if (!mains.length && !drinks.length) return [];
  const line = (it: MenuItemRow, role: BundleItem['role']): BundleItem => ({ itemId: it.id, name: it.name, priceNgwee: it.priceNgwee, qty: group, role });
  const make = (kind: Bundle['kind'], main?: MenuItemRow, drink?: MenuItemRow, dessert?: MenuItemRow): Bundle | null => {
    const lines = [main && line(main, 'main'), drink && line(drink, 'drink'), dessert && line(dessert, 'dessert')].filter(Boolean) as BundleItem[];
    if (!lines.length) return null;
    return { id: `${placeId}:${kind}`, kind, items: lines, totalNgwee: lines.reduce((a, l) => a + l.priceNgwee * l.qty, 0) };
  };
  const candidates = [
    make('budget', mains.length ? cheapest(mains) : undefined, drinks.length ? cheapest(drinks) : undefined),
    make('standard', mains.length ? median(mains) : undefined, drinks.length ? median(drinks) : undefined),
    make('treat', mains.length ? median(mains) : undefined, drinks.length ? median(drinks) : undefined, desserts.length ? cheapest(desserts) : undefined),
  ].filter(Boolean) as Bundle[];
  const seen = new Set<number>();
  return candidates.filter((b) => (seen.has(b.totalNgwee) ? false : (seen.add(b.totalNgwee), true)));
}

/** Date for the requested day/time (Africa/Lusaka, UTC+2) so "open at that time" can be checked. */
export function targetDate(day: string | null, time: string | null, now = new Date()): Date | null {
  if (!day && !time) return null;
  const local = new Date(now.getTime() + 2 * 3600_000);
  let delta = 0;
  if (day === 'tomorrow') delta = 1;
  else if (day && DAYS.includes(day)) delta = (DAYS.indexOf(day) - local.getUTCDay() + 7) % 7;
  const hhmm = time ? TIMES[time] ?? time : null;
  const [h, m] = hhmm ? hhmm.split(':').map(Number) : [local.getUTCHours(), local.getUTCMinutes()];
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + delta, h, m) - 2 * 3600_000);
}

type Cand = {
  id: string; slug: string; name: string; area: string; areaSlug: string; category: string; thumb: string | null; rating: number | null; ratingCount: number;
  tags: string[]; bundles: Bundle[]; recentBillPpNgwee: number | null; fit: number;
};

async function loadPlaces() {
  return prisma.place.findMany({
    where: { status: 'LIVE', mergedIntoId: null, closedPermanently: false },
    include: {
      area: true, category: true, hours: true, tags: { include: { tag: true } },
      images: { where: { status: 'APPROVED' }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], take: 1 },
      items: { where: { isAvailable: true }, include: { section: true } },
    },
  });
}

async function recentBills(placeIds: string[]) {
  const since = new Date(Date.now() - 90 * 864e5);
  const rows = await prisma.review.findMany({
    where: { placeId: { in: placeIds }, status: 'APPROVED', createdAt: { gt: since }, amountPaidNgwee: { gt: 0 }, groupSize: { gt: 0 } },
    select: { placeId: true, amountPaidNgwee: true, groupSize: true },
  });
  const m = new Map<string, number[]>();
  for (const r of rows) m.set(r.placeId, [...(m.get(r.placeId) ?? []), r.amountPaidNgwee! / r.groupSize!]);
  return new Map([...m].map(([id, v]) => [id, Math.round(v.reduce((a, b) => a + b, 0) / v.length)]));
}

export async function selectCandidates(f: Filters) {
  const budget = f.budgetNgwee!;
  const all = await loadPlaces();
  const at = targetDate(f.day, f.time);
  const ratings = await ratingMap(all.map((p) => p.id));
  const bills = await recentBills(all.map((p) => p.id));
  const notes: string[] = [];

  const build = (p: (typeof all)[number]): Cand => {
    const r = ratings.get(p.id);
    return {
      id: p.id, slug: p.slug, name: p.name, area: p.area.name, areaSlug: p.area.slug, category: p.category.name,
      thumb: p.images[0] ? urls(p.images[0].variantKeys)?.thumb ?? null : null, rating: r?.rating ?? null, ratingCount: r?.ratingCount ?? 0,
      tags: p.tags.map((t) => t.tag.slug), bundles: buildBundles(p.id, p.items, f.groupSize), recentBillPpNgwee: bills.get(p.id) ?? null, fit: 0,
    };
  };
  const openOk = (p: (typeof all)[number]) => (at ? isOpenAt(p.hours, at) !== false : true);
  const score = (c: Cand) => {
    const best = Math.max(...c.bundles.filter((b) => b.totalNgwee <= budget).map((b) => b.totalNgwee), 0);
    const use = best / budget; // prefer using a sensible share of the budget
    const bill = c.recentBillPpNgwee != null && c.recentBillPpNgwee * f.groupSize > budget * 1.15 ? -0.6 : 0;
    const tagHits = f.tags.length ? f.tags.filter((t) => c.tags.includes(t)).length / f.tags.length : 0;
    return (c.rating ?? 3.5) / 5 * 0.45 + Math.min(use, 1) * 0.25 + tagHits * 0.2 + Math.min(c.ratingCount, 10) / 10 * 0.1 + bill;
  };
  const fits = (c: Cand) => c.bundles.some((b) => b.totalNgwee <= budget);

  const attempts: { area: string | null; tags: string[]; note?: string }[] = [{ area: f.areaSlug, tags: f.tags }];
  if (f.areaSlug) attempts.push({ area: null, tags: f.tags, note: `Nothing matched in that area, so I looked across Lusaka.` });
  if (f.tags.length) attempts.push({ area: null, tags: [], note: `I relaxed the vibe filters to find options within budget.` });

  for (const a of attempts) {
    const pool = all
      .filter((p) => (!a.area || p.area.slug === a.area) && a.tags.every((t) => p.tags.some((pt) => pt.tag.slug === t)) && openOk(p))
      .map(build).filter(fits);
    if (pool.length) {
      pool.forEach((c) => (c.fit = score(c)));
      pool.sort((x, y) => y.fit - x.fit);
      if (a.note) notes.push(a.note);
      return { candidates: pool.slice(0, 10), notes, overBudget: false };
    }
  }
  // closest option over budget
  const pool = all.filter(openOk).map(build).filter((c) => c.bundles.length);
  pool.sort((x, y) => Math.min(...x.bundles.map((b) => b.totalNgwee)) - Math.min(...y.bundles.map((b) => b.totalNgwee)));
  if (pool.length) notes.push('Nothing fits that budget, so these are the closest options over it.');
  return { candidates: pool.slice(0, 3), notes, overBudget: true };
}

// ---------- ranking ----------

const rankCache = new Map<string, { at: number; picks: { place_id: string; bundle_id?: string; reason: string }[] }>();
const CACHE_MS = 10 * 60_000;

const defaultBundle = (c: Cand, budget: number) => {
  const ok = c.bundles.filter((b) => b.totalNgwee <= budget);
  return ok.find((b) => b.kind === 'standard') ?? ok.sort((a, b) => b.totalNgwee - a.totalNgwee)[0] ?? c.bundles.sort((a, b) => a.totalNgwee - b.totalNgwee)[0];
};
const templateReason = (c: Cand, f: Filters) =>
  `${c.category} in ${c.area}${c.rating ? `, rated ${c.rating}/5` : ''}${f.tags.some((t) => c.tags.includes(t)) ? ` with the ${f.tags.filter((t) => c.tags.includes(t)).join(' & ')} vibe you asked for` : ''}.`;

async function rank(userId: string, f: Filters, cands: Cand[], acc: { tokensIn: number; tokensOut: number }) {
  const key = crypto.createHash('sha1').update(JSON.stringify([f, cands.map((c) => [c.id, c.bundles.map((b) => b.totalNgwee)])])).digest('hex');
  const hit = rankCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.picks;
  if (!aiConfigured() || cands.length <= 1) return null;
  try {
    const raw = await aiJson<unknown>('planner_rank', userId, {
      prompt: `You are a local outing planner in Lusaka, Zambia.
Pick the best 2-3 places for this request using ONLY the candidates below.
Never invent places, dishes or prices. Prices are in Zambian kwacha (ngwee in the data, 100 ngwee = K1).
Request: ${JSON.stringify(f)}
Candidates: ${JSON.stringify(cands.map((c) => ({ place_id: c.id, name: c.name, area: c.area, category: c.category, tags: c.tags, rating: c.rating, recent_bill_pp_ngwee: c.recentBillPpNgwee, bundles: c.bundles.map((b) => ({ bundle_id: b.id, kind: b.kind, total_ngwee: b.totalNgwee, items: b.items.map((i) => `${i.qty}x ${i.name}`) })) })))}
Return JSON: [{"place_id": "...", "bundle_id": "...", "reason": "max 20 words"}]`,
    }, acc);
    const arr = Array.isArray(raw) ? raw : (raw as { picks?: unknown })?.picks;
    if (!Array.isArray(arr)) return null;
    const picks = arr.filter((p) => p && typeof p.place_id === 'string').map((p) => ({ place_id: p.place_id as string, bundle_id: typeof p.bundle_id === 'string' ? p.bundle_id : undefined, reason: String(p.reason ?? '').slice(0, 160) }));
    rankCache.set(key, { at: Date.now(), picks });
    if (rankCache.size > 500) rankCache.delete(rankCache.keys().next().value!);
    return picks;
  } catch { return null; }
}

/** Server-side re-check: every id must exist and every total is recomputed from current DB prices. */
export async function recomputeBundle(placeId: string, items: { itemId: string; qty: number }[]) {
  const rows = await prisma.menuItem.findMany({ where: { id: { in: items.map((i) => i.itemId) }, placeId, isAvailable: true }, include: { section: true } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const lines: BundleItem[] = [];
  for (const i of items) {
    const r = byId.get(i.itemId);
    if (!r) return null;
    const role = isDrinkSection(r.section.name) ? 'drink' : isDessertSection(r.section.name) ? 'dessert' : 'main';
    lines.push({ itemId: r.id, name: r.name, priceNgwee: r.priceNgwee, qty: i.qty, role });
  }
  return { items: lines, totalNgwee: lines.reduce((a, l) => a + l.priceNgwee * l.qty, 0) };
}

// ---------- entry point ----------

export async function remainingToday(userId: string) {
  const used = await prisma.aiRequest.count({ where: { userId, kind: 'planner', createdAt: { gt: new Date(Date.now() - 864e5) } } });
  return Math.max(0, config.limits.plannerPerDay - used);
}

const kw = (n: number) => `K${(n / 100).toFixed(n % 100 === 0 ? 0 : 2)}`;

export async function chat(userId: string, message: string, prev: Filters | null): Promise<PlannerReply> {
  if ((await remainingToday(userId)) <= 0) throw tooMany(`Daily planner limit (${config.limits.plannerPerDay}) reached. Try again tomorrow.`);
  const t0 = Date.now();
  const acc = { tokensIn: 0, tokensOut: 0 };
  const [areas, tags] = await Promise.all([prisma.area.findMany({ select: { slug: true, name: true } }), prisma.tag.findMany({ select: { slug: true, name: true } })]);
  const filters = await parseRequest(userId, message, prev, { areas, tags }, acc);

  let reply: Omit<PlannerReply, 'remaining'>;
  let candidateIds: string[] = [];
  if (!filters.budgetNgwee) {
    reply = { filters, needs: 'budget', notes: [], options: [], message: 'What is your total budget? For example "K300 for 2 in Woodlands".' };
  } else {
    const { candidates, notes, overBudget } = await selectCandidates(filters);
    candidateIds = candidates.map((c) => c.id);
    if (!candidates.length) {
      reply = { filters, notes, options: [], message: 'I could not find any places with a menu matching that. Try a different area or time.' };
    } else {
      const picks = overBudget ? null : await rank(userId, filters, candidates, acc);
      const byId = new Map(candidates.map((c) => [c.id, c]));
      let chosen: { c: Cand; reason: string; bundleId?: string }[] = [];
      const used = new Set<string>();
      for (const p of picks ?? []) {
        const c = byId.get(p.place_id);
        if (!c || used.has(c.id) || chosen.length >= 3) continue; // unknown or repeated ids are dropped
        used.add(c.id);
        chosen.push({ c, reason: p.reason || templateReason(c, filters), bundleId: p.bundle_id });
      }
      if (!chosen.length) {
        if (picks) notes.push('The AI ranking was unavailable, so these are the top matches.');
        chosen = candidates.slice(0, 3).map((c) => ({ c, reason: templateReason(c, filters) }));
      }
      const options: PlanOption[] = [];
      for (const { c, reason, bundleId } of chosen) {
        let bundle = c.bundles.find((b) => b.id === bundleId && (overBudget || b.totalNgwee <= filters.budgetNgwee!)) ?? defaultBundle(c, filters.budgetNgwee!);
        if (overBudget) bundle = [...c.bundles].sort((a, b) => a.totalNgwee - b.totalNgwee)[0];
        const verified = await recomputeBundle(c.id, bundle.items.map((i) => ({ itemId: i.itemId, qty: i.qty })));
        if (!verified) continue; // menu changed under us; skip rather than show a wrong price
        const final: Bundle = { ...bundle, items: verified.items, totalNgwee: verified.totalNgwee };
        const over = Math.max(0, final.totalNgwee - filters.budgetNgwee!);
        if (!overBudget && over > 0) continue; // price moved above budget after recheck
        options.push({
          placeId: c.id, slug: c.slug, name: c.name, area: c.area, category: c.category, thumb: c.thumb, rating: c.rating, tags: c.tags,
          reason, bundle: final, overBudgetNgwee: over, recentBillPpNgwee: c.recentBillPpNgwee,
        });
      }
      if (options.length) {
        const head = overBudget
          ? `Nothing fits ${kw(filters.budgetNgwee)}. The closest is ${kw(options[0].overBudgetNgwee)} over.`
          : `Here ${options.length === 1 ? 'is 1 option' : `are ${options.length} options`} within ${kw(filters.budgetNgwee)} for ${filters.groupSize}.`;
        reply = { filters, notes, options, message: head };
      } else reply = { filters, notes, options: [], message: 'Prices changed while I was planning. Please try again.' };
    }
  }

  await prisma.aiRequest.create({
    data: {
      userId, kind: 'planner', prompt: message.slice(0, 2000), parsedFilters: filters as object, candidatePlaceIds: candidateIds,
      response: { message: reply.message, options: reply.options.map((o) => ({ placeId: o.placeId, bundleId: o.bundle.id, totalNgwee: o.bundle.totalNgwee })) } as object,
      tokensIn: acc.tokensIn, tokensOut: acc.tokensOut, latencyMs: Date.now() - t0,
    },
  });
  if (reply.options.length) await prisma.placeEvent.createMany({ data: reply.options.map((o) => ({ placeId: o.placeId, userId, type: 'ai_shown' })) });
  return { ...reply, remaining: await remainingToday(userId) };
}
