import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { parse, wrap } from '../middleware/misc.js';
import * as planner from '../services/planner.js';
import { badRequest, notFound } from '../lib/errors.js';
import { urls } from '../services/images.js';

const filters = z.object({
  budgetNgwee: z.number().int().positive().nullable(), groupSize: z.number().int().min(1).max(100), areaSlug: z.string().nullable(),
  tags: z.array(z.string()).max(12), day: z.string().nullable(), time: z.string().nullable(), occasion: z.string().nullable(),
});

export const plannerRouter = Router();
plannerRouter.use(requireAuth);

plannerRouter.post('/chat', wrap(async (req, res) => {
  const b = parse(z.object({ message: z.string().trim().min(2).max(500), filters: filters.optional() }), req.body);
  res.json(await planner.chat(req.user!.id, b.message, b.filters ?? null));
}));
plannerRouter.get('/quota', wrap(async (req, res) => {
  res.json({ remaining: await planner.remainingToday(req.user!.id) });
}));

// ---- saved plans (FR-35) ----
export const plansRouter = Router();

const planBody = z.object({
  title: z.string().trim().min(1).max(80).optional(), budgetNgwee: z.number().int().positive(), groupSize: z.number().int().min(1).max(100),
  stops: z.array(z.object({ placeId: z.string().uuid(), items: z.array(z.object({ itemId: z.string().uuid(), qty: z.number().int().min(1).max(100) })).min(1).max(12) })).min(1).max(4),
});

plansRouter.post('/', requireAuth, wrap(async (req, res) => {
  const b = parse(planBody, req.body);
  const stops = [];
  for (const s of b.stops) {
    const v = await planner.recomputeBundle(s.placeId, s.items); // totals always come from the database
    if (!v) throw badRequest('A menu item no longer exists or is unavailable');
    stops.push({ placeId: s.placeId, estimatedTotalNgwee: v.totalNgwee, items: v.items });
  }
  const place = await prisma.place.findUnique({ where: { id: b.stops[0].placeId }, select: { name: true } });
  const plan = await prisma.plan.create({
    data: {
      userId: req.user!.id, title: b.title ?? `Outing at ${place?.name ?? 'a great spot'}`, budgetNgwee: b.budgetNgwee, groupSize: b.groupSize,
      stops: { create: stops.map((s, i) => ({ placeId: s.placeId, sortOrder: i, estimatedTotalNgwee: s.estimatedTotalNgwee, items: s.items as object[] })) },
    },
  });
  res.status(201).json(await presentPlan(plan.id));
}));

plansRouter.get('/', requireAuth, wrap(async (req, res) => {
  const rows = await prisma.plan.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true } });
  res.json(await Promise.all(rows.map((r) => presentPlan(r.id))));
}));
plansRouter.delete('/:id', requireAuth, wrap(async (req, res) => {
  await prisma.plan.deleteMany({ where: { id: req.params.id as string, userId: req.user!.id } });
  res.status(204).end();
}));
// public: anyone with the link can view (the token is unguessable)
plansRouter.get('/shared/:token', wrap(async (req, res) => {
  const p = await prisma.plan.findUnique({ where: { shareToken: req.params.token as string }, select: { id: true } });
  if (!p) throw notFound('Plan not found');
  res.set('Cache-Control', 'public, max-age=60');
  res.json(await presentPlan(p.id));
}));

async function presentPlan(id: string) {
  const p = await prisma.plan.findUniqueOrThrow({
    where: { id },
    include: { user: { select: { name: true } }, stops: { orderBy: { sortOrder: 'asc' }, include: { place: { include: { area: true, images: { where: { status: 'APPROVED' }, take: 1, orderBy: { sortOrder: 'asc' } } } } } } },
  });
  return {
    id: p.id, title: p.title, budgetNgwee: p.budgetNgwee, groupSize: p.groupSize, shareToken: p.shareToken, createdAt: p.createdAt, by: p.user.name,
    totalNgwee: p.stops.reduce((a, s) => a + s.estimatedTotalNgwee, 0),
    stops: p.stops.map((s) => ({
      placeId: s.placeId, slug: s.place.slug, name: s.place.name, area: s.place.area.name, status: s.place.status,
      thumb: s.place.images[0] ? urls(s.place.images[0].variantKeys)?.thumb ?? null : null, totalNgwee: s.estimatedTotalNgwee, items: s.items,
    })),
  };
}
