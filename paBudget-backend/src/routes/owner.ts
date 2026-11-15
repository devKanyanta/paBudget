import { Router, type Request } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { parse, wrap } from '../middleware/misc.js';
import * as subs from '../services/submissions.js';
import * as places from '../services/places.js';
import { screen } from '../services/screening.js';
import { urls } from '../services/images.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';

/** Owner dashboard API (FR-50..58). Owners are admin-verified via the CLAIM flow, so their edits apply directly. */
export const ownerRouter = Router();
ownerRouter.use(requireAuth);

async function ownedPlace(req: Request) {
  const placeId = req.params.id as string;
  if (req.user!.role !== 'ADMIN') {
    const o = await prisma.placeOwner.findUnique({ where: { placeId_userId: { placeId, userId: req.user!.id } } });
    if (!o?.verifiedAt) throw forbidden('You do not manage this place');
  }
  const place = await prisma.place.findUnique({ where: { id: placeId } });
  if (!place || place.mergedIntoId) throw notFound('Place not found');
  return place;
}

const EVENT_TYPES = ['view', 'menu_view', 'ai_shown', 'directions', 'call', 'whatsapp'] as const;

async function statsFor(placeId: string, days: number) {
  const since = new Date(Date.now() - days * 864e5);
  const events = await prisma.placeEvent.findMany({ where: { placeId, createdAt: { gt: since } }, select: { type: true, createdAt: true } });
  const totals: Record<string, number> = Object.fromEntries(EVENT_TYPES.map((t) => [t, 0]));
  const daily = new Map<string, number>();
  for (const e of events) {
    totals[e.type] = (totals[e.type] ?? 0) + 1;
    if (e.type === 'view') { const d = new Date(e.createdAt.getTime() + 2 * 3600_000).toISOString().slice(0, 10); daily.set(d, (daily.get(d) ?? 0) + 1); }
  }
  const series = Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() + 2 * 3600_000 - (days - 1 - i) * 864e5).toISOString().slice(0, 10);
    return { date: d, views: daily.get(d) ?? 0 };
  });
  return { days, totals, series };
}

ownerRouter.get('/places', wrap(async (req, res) => {
  const where = req.user!.role === 'ADMIN' ? {} : { owners: { some: { userId: req.user!.id, verifiedAt: { not: null } } } };
  const rows = await prisma.place.findMany({ where: { ...where, mergedIntoId: null }, include: { area: true, owners: { where: { userId: req.user!.id } } }, orderBy: { name: 'asc' }, take: 100 });
  const out = await Promise.all(rows.map(async (p) => {
    const s = await statsFor(p.id, 30);
    return { id: p.id, name: p.name, slug: p.slug, area: p.area.name, status: p.status, views30d: s.totals.view };
  }));
  res.json(out);
}));

ownerRouter.get('/places/:id', wrap(async (req, res) => {
  const place = await ownedPlace(req);
  const detail = await prisma.place.findUniqueOrThrow({
    where: { id: place.id },
    include: {
      hours: true, tags: { include: { tag: true } }, images: { where: { status: 'APPROVED' }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      sections: { orderBy: { sortOrder: 'asc' }, include: { items: { orderBy: { priceNgwee: 'asc' } } } },
      deals: { orderBy: { endsAt: 'desc' } },
    },
  });
  res.json({
    id: detail.id, name: detail.name, slug: detail.slug, status: detail.status, categoryId: detail.categoryId, areaId: detail.areaId, lat: detail.lat, lng: detail.lng,
    description: detail.description, address: detail.address, phone: detail.phone, whatsapp: detail.whatsapp, avgSpendPpNgwee: detail.avgSpendPpNgwee,
    hours: detail.hours.map((h) => ({ weekday: h.weekday, opensAt: h.opensAt, closesAt: h.closesAt })), tagSlugs: detail.tags.map((t) => t.tag.slug),
    images: detail.images.map((i) => ({ id: i.id, ...(urls(i.variantKeys) ?? {}) })),
    menu: detail.sections.map((s) => ({ name: s.name, items: s.items.map((i) => ({ id: i.id, name: i.name, description: i.description, priceNgwee: i.priceNgwee, isAvailable: i.isAvailable })) })),
    deals: detail.deals,
  });
}));

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
ownerRouter.patch('/places/:id', wrap(async (req, res) => {
  const place = await ownedPlace(req);
  const b = parse(z.object({
    description: z.string().max(1000).nullable().optional(), address: z.string().max(200).nullable().optional(),
    phone: z.string().max(20).nullable().optional(), whatsapp: z.string().max(20).nullable().optional(),
    hours: z.array(z.object({ weekday: z.number().int().min(0).max(6), opensAt: hhmm, closesAt: hhmm })).max(21).optional(),
    tagSlugs: z.array(z.string()).max(12).optional(),
  }), req.body);
  const { hours, tagSlugs, ...fields } = b;
  for (const t of [fields.description, fields.address]) if (t && (await screen(req.user!.id, 'EDIT', { description: t })).autoReject) throw badRequest('Text contains language that is not allowed');
  await prisma.$transaction(async (tx) => {
    if (Object.keys(fields).length) await tx.place.update({ where: { id: place.id }, data: fields });
    if (hours) { await tx.placeHour.deleteMany({ where: { placeId: place.id } }); await tx.placeHour.createMany({ data: hours.map((h) => ({ ...h, placeId: place.id })) }); }
    if (tagSlugs) {
      const tags = await tx.tag.findMany({ where: { slug: { in: tagSlugs } } });
      await tx.placeTag.deleteMany({ where: { placeId: place.id } });
      await tx.placeTag.createMany({ data: tags.map((t) => ({ placeId: place.id, tagId: t.id })) });
    }
  });
  res.status(204).end();
}));

// ---- menu (FR-52): the submitted menu becomes the whole menu; omitted items are marked unavailable ----
const price = z.number().int().min(0).max(10_000_000);
ownerRouter.put('/places/:id/menu', wrap(async (req, res) => {
  const place = await ownedPlace(req);
  const b = parse(z.object({
    mode: z.enum(['merge', 'replace']).default('replace'),
    sections: z.array(z.object({ name: z.string().min(1).max(60), items: z.array(z.object({ name: z.string().min(1).max(100), description: z.string().max(200).optional(), priceNgwee: price })).max(150) })).max(20),
  }), req.body);
  const sections = b.sections.filter((s) => s.items.length);
  await prisma.$transaction(async (tx) => {
    if (!sections.length && b.mode === 'replace') {
      await tx.menuItem.updateMany({ where: { placeId: place.id }, data: { isAvailable: false } });
      return;
    }
    await subs.applyMenu(tx, place.id, { mode: b.mode, sections });
  });
  await places.recalcAvgSpend(place.id);
  res.status(204).end();
}));
ownerRouter.patch('/places/:id/items/:itemId', wrap(async (req, res) => {
  const place = await ownedPlace(req);
  const b = parse(z.object({ priceNgwee: price.optional(), isAvailable: z.boolean().optional(), name: z.string().min(1).max(100).optional() }), req.body);
  const r = await prisma.menuItem.updateMany({ where: { id: req.params.itemId as string, placeId: place.id }, data: { ...b, lastConfirmedAt: new Date() } });
  if (!r.count) throw notFound('Item not found');
  await places.recalcAvgSpend(place.id);
  res.status(204).end();
}));

// ---- photos (FR-54) ----
ownerRouter.post('/places/:id/photos', wrap(async (req, res) => {
  const place = await ownedPlace(req);
  const b = parse(z.object({ imageIds: z.array(z.string().uuid()).min(1).max(10) }), req.body);
  const imgs = await prisma.image.findMany({ where: { id: { in: b.imageIds }, uploadedById: req.user!.id, processedAt: { not: null }, placeId: null, submissionId: null } });
  if (imgs.length !== new Set(b.imageIds).size) throw badRequest('One or more photos are missing, not yours, or already used');
  if ((await screen(req.user!.id, 'PHOTOS', { imageIds: b.imageIds })).autoReject) throw badRequest('A photo was flagged as unsafe content');
  const last = await prisma.image.aggregate({ where: { placeId: place.id, status: 'APPROVED' }, _max: { sortOrder: true } });
  let order = (last._max.sortOrder ?? -1) + 1;
  for (const id of b.imageIds) await prisma.image.update({ where: { id }, data: { placeId: place.id, ownerType: 'PLACE', ownerId: place.id, status: 'APPROVED', sortOrder: order++ } });
  res.status(204).end();
}));
ownerRouter.put('/places/:id/photos/order', wrap(async (req, res) => {
  const place = await ownedPlace(req);
  const b = parse(z.object({ imageIds: z.array(z.string().uuid()).min(1).max(50) }), req.body);
  await prisma.$transaction(b.imageIds.map((id, i) => prisma.image.updateMany({ where: { id, placeId: place.id }, data: { sortOrder: i } })));
  res.status(204).end();
}));
ownerRouter.delete('/places/:id/photos/:imageId', wrap(async (req, res) => {
  const place = await ownedPlace(req);
  await prisma.image.updateMany({ where: { id: req.params.imageId as string, placeId: place.id }, data: { status: 'REJECTED' } });
  res.status(204).end();
}));

// ---- reviews (FR-58) ----
ownerRouter.get('/places/:id/reviews', wrap(async (req, res) => {
  const place = await ownedPlace(req);
  const rows = await prisma.review.findMany({ where: { placeId: place.id, status: 'APPROVED' }, orderBy: { createdAt: 'desc' }, take: 100, include: { user: { select: { name: true } } } });
  res.json(rows.map((r) => ({ id: r.id, rating: r.rating, body: r.body, author: r.user.name, createdAt: r.createdAt, ownerReply: r.ownerReply })));
}));
ownerRouter.put('/places/:id/reviews/:reviewId/reply', wrap(async (req, res) => {
  const place = await ownedPlace(req);
  const b = parse(z.object({ reply: z.string().trim().max(500).nullable() }), req.body);
  if (b.reply && (await screen(req.user!.id, 'EDIT', { description: b.reply })).autoReject) throw badRequest('Reply contains language that is not allowed');
  const r = await prisma.review.updateMany({ where: { id: req.params.reviewId as string, placeId: place.id, status: 'APPROVED' }, data: { ownerReply: b.reply || null } });
  if (!r.count) throw notFound('Review not found');
  res.status(204).end();
}));

// ---- deals (FR-55) ----
const dealBody = z.object({ title: z.string().trim().min(3).max(100), priceNgwee: price, startsAt: z.coerce.date(), endsAt: z.coerce.date() })
  .refine((d) => d.endsAt > d.startsAt, 'End must be after start');
ownerRouter.post('/places/:id/deals', wrap(async (req, res) => {
  const place = await ownedPlace(req);
  const b = parse(dealBody, req.body);
  if ((await screen(req.user!.id, 'EDIT', { description: b.title })).autoReject) throw badRequest('Title contains language that is not allowed');
  res.status(201).json(await prisma.deal.create({ data: { ...b, placeId: place.id } }));
}));
ownerRouter.delete('/places/:id/deals/:dealId', wrap(async (req, res) => {
  const place = await ownedPlace(req);
  await prisma.deal.deleteMany({ where: { id: req.params.dealId as string, placeId: place.id } });
  res.status(204).end();
}));

// ---- stats (FR-56) ----
ownerRouter.get('/places/:id/stats', wrap(async (req, res) => {
  const place = await ownedPlace(req);
  const b = parse(z.object({ days: z.coerce.number().int().min(1).max(90).default(30) }), req.query);
  res.json(await statsFor(place.id, b.days));
}));
