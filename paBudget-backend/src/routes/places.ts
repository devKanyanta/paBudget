import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { parse, wrap } from '../middleware/misc.js';
import * as places from '../services/places.js';
import { notFound } from '../lib/errors.js';

export const placesRouter = Router();

const num = z.coerce.number();
const listSchema = z.object({
  q: z.string().trim().min(1).max(80).optional(), area: z.string().optional(), category: z.string().optional(),
  tags: z.string().transform((s) => s.split(',').filter(Boolean)).optional(),
  maxPp: num.int().min(0).optional(), groupSize: num.int().min(1).max(100).optional(), totalBudget: num.int().min(0).optional(),
  openNow: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  lat: num.min(-90).max(90).optional(), lng: num.min(-180).max(180).optional(),
  sort: z.enum(['cheapest', 'nearest', 'rating', 'newest']).optional(),
  limit: num.int().min(1).max(50).default(20), offset: num.int().min(0).default(0),
});

placesRouter.get('/', wrap(async (req, res) => {
  const b = parse(listSchema, req.query);
  res.set('Cache-Control', 'public, max-age=30');
  res.json(await places.listPlaces({
    q: b.q, area: b.area, category: b.category, tags: b.tags, maxPpNgwee: b.maxPp, groupSize: b.groupSize, totalBudgetNgwee: b.totalBudget,
    openNow: b.openNow, lat: b.lat, lng: b.lng, sort: b.sort, limit: b.limit, offset: b.offset,
  }));
}));

placesRouter.get('/:idOrSlug', wrap(async (req, res) => {
  res.set('Cache-Control', 'public, max-age=30');
  res.json(await places.getPlace(req.params.idOrSlug as string));
}));

placesRouter.get('/:id/reviews', wrap(async (req, res) => {
  const b = parse(z.object({ limit: num.int().min(1).max(50).default(20), offset: num.int().min(0).default(0) }), req.query);
  res.json(await places.placeReviews(req.params.id as string, b.limit, b.offset));
}));

placesRouter.put('/:id/favourite', requireAuth, wrap(async (req, res) => {
  const placeId = req.params.id as string;
  if (!(await prisma.place.findFirst({ where: { id: placeId, status: 'LIVE' } }))) throw notFound();
  await prisma.favourite.upsert({ where: { userId_placeId: { userId: req.user!.id, placeId } }, create: { userId: req.user!.id, placeId }, update: {} });
  res.status(204).end();
}));
placesRouter.delete('/:id/favourite', requireAuth, wrap(async (req, res) => {
  await prisma.favourite.deleteMany({ where: { userId: req.user!.id, placeId: req.params.id as string } });
  res.status(204).end();
}));

placesRouter.post('/:id/events', optionalAuth, wrap(async (req, res) => {
  const b = parse(z.object({ type: z.enum(['view', 'menu_view', 'call', 'directions', 'whatsapp', 'ai_shown']) }), req.body);
  const placeId = req.params.id as string;
  if (!(await prisma.place.findFirst({ where: { id: placeId, status: 'LIVE' }, select: { id: true } }))) throw notFound();
  await prisma.placeEvent.create({ data: { placeId, userId: req.user?.id, type: b.type } });
  res.status(204).end();
}));

export const metaRouter = Router();
metaRouter.get('/', wrap(async (_req, res) => {
  const [areas, categories, tags] = await Promise.all([
    prisma.area.findMany({ orderBy: { name: 'asc' } }), prisma.category.findMany({ orderBy: { name: 'asc' } }), prisma.tag.findMany({ orderBy: { name: 'asc' } }),
  ]);
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ areas, categories, tags });
}));

export const favouritesRouter = Router();
favouritesRouter.get('/', requireAuth, wrap(async (req, res) => {
  const favs = await prisma.favourite.findMany({ where: { userId: req.user!.id, place: { status: 'LIVE' } }, orderBy: { createdAt: 'desc' }, select: { placeId: true } });
  const ids = favs.map((f) => f.placeId);
  res.json((await places.listPlaces({ ids, limit: 200, offset: 0, sort: 'newest' })).items);
}));
