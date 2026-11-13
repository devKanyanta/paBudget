import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { requireRole } from '../middleware/auth.js';
import { parse, wrap } from '../middleware/misc.js';
import * as subs from '../services/submissions.js';
import * as places from '../services/places.js';
import { urls } from '../services/images.js';
import { badRequest, notFound } from '../lib/errors.js';
import { slugify } from '../lib/util.js';

export const adminRouter = Router();
adminRouter.use(requireRole('ADMIN'));

// ---- moderation queue ----
adminRouter.get('/submissions', wrap(async (req, res) => {
  const b = parse(z.object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'AUTO_PUBLISHED']).default('PENDING'),
    type: z.string().optional(), spot: z.enum(['true']).optional(), limit: z.coerce.number().int().min(1).max(100).default(30), offset: z.coerce.number().int().min(0).default(0),
  }), req.query);
  const where: Prisma.SubmissionWhereInput = { status: b.status, ...(b.type ? { type: b.type as any } : {}), ...(b.spot ? { spotCheck: true } : {}) };
  const [total, rows] = await Promise.all([
    prisma.submission.count({ where }),
    prisma.submission.findMany({
      where, take: b.limit, skip: b.offset,
      orderBy: b.status === 'PENDING' ? [{ aiScore: { sort: 'desc', nulls: 'last' } }, { createdAt: 'asc' }] : [{ createdAt: 'desc' }], // lowest-risk first for batch approve
      include: { user: { select: { id: true, name: true, stats: true } }, images: true },
    }),
  ]);
  const placeIds = rows.map((r) => r.targetPlaceId).filter(Boolean) as string[];
  const pl = await prisma.place.findMany({ where: { id: { in: placeIds } }, select: { id: true, name: true } });
  const pn = new Map(pl.map((p) => [p.id, p.name]));
  res.json({
    total,
    items: rows.map((r) => ({
      id: r.id, type: r.type, status: r.status, payload: r.payload, aiScore: r.aiScore, aiReasons: r.aiReasons, createdAt: r.createdAt,
      rejectReason: r.rejectReason, spotCheck: r.spotCheck, placeId: r.targetPlaceId, placeName: r.targetPlaceId ? pn.get(r.targetPlaceId) ?? null : null,
      user: { id: r.user.id, name: r.user.name, trustLevel: r.user.stats?.trustLevel ?? 'NEW', approved: r.user.stats?.approvedCount ?? 0, rejected: r.user.stats?.rejectedCount ?? 0 },
      images: r.images.map((i) => ({ id: i.id, ...(urls(i.variantKeys) ?? {}) })),
    })),
  });
}));

adminRouter.post('/submissions/:id/approve', wrap(async (req, res) => {
  const b = parse(z.object({ payload: z.unknown().optional(), note: z.string().max(500).optional() }), req.body ?? {});
  res.json(await subs.approve(req.user!.id, req.params.id as string, b.payload, b.note));
}));
adminRouter.post('/submissions/:id/reject', wrap(async (req, res) => {
  const b = parse(z.object({ reason: z.string().min(3).max(500) }), req.body);
  await subs.reject(req.user!.id, req.params.id as string, b.reason);
  res.status(204).end();
}));
adminRouter.post('/submissions/:id/revoke', wrap(async (req, res) => {
  const b = parse(z.object({ reason: z.string().min(3).max(500) }), req.body);
  await subs.revokeAutoPublished(req.user!.id, req.params.id as string, b.reason);
  res.status(204).end();
}));
adminRouter.post('/submissions/:id/spot-checked', wrap(async (req, res) => {
  await prisma.submission.update({ where: { id: req.params.id as string }, data: { spotCheck: false } });
  await prisma.moderationLog.create({ data: { adminId: req.user!.id, submissionId: req.params.id as string, action: 'spot_check_ok' } });
  res.status(204).end();
}));
adminRouter.post('/submissions/batch', wrap(async (req, res) => {
  const b = parse(z.object({ action: z.enum(['approve', 'reject']), ids: z.array(z.string().uuid()).min(1).max(100), reason: z.string().min(3).optional() }), req.body);
  if (b.action === 'reject' && !b.reason) throw badRequest('reason is required');
  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const id of b.ids) {
    try {
      if (b.action === 'approve') await subs.approve(req.user!.id, id); else await subs.reject(req.user!.id, id, b.reason!);
      results.push({ id, ok: true });
    } catch (e: any) { results.push({ id, ok: false, error: e.message }); }
  }
  res.json({ results });
}));

adminRouter.get('/moderation-log', wrap(async (req, res) => {
  const rows = await prisma.moderationLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { admin: { select: { name: true } } } });
  res.json(rows.map((r) => ({ id: r.id, admin: r.admin.name, submissionId: r.submissionId, action: r.action, note: r.note, createdAt: r.createdAt })));
}));

// ---- places ----
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const placeBody = z.object({
  name: z.string().min(2).max(100), categoryId: z.string().uuid(), areaId: z.string().uuid(),
  lat: z.number(), lng: z.number(), description: z.string().max(1000).nullish(), address: z.string().max(200).nullish(),
  phone: z.string().max(20).nullish(), whatsapp: z.string().max(20).nullish(), priceLevel: z.number().int().min(1).max(3).optional(),
  status: z.enum(['DRAFT', 'PENDING', 'LIVE', 'HIDDEN']).default('LIVE'), isFeatured: z.boolean().optional(),
  hours: z.array(z.object({ weekday: z.number().int().min(0).max(6), opensAt: hhmm, closesAt: hhmm })).optional(),
  tagSlugs: z.array(z.string()).optional(),
  menu: z.array(z.object({ name: z.string().min(1), items: z.array(z.object({ name: z.string().min(1), description: z.string().optional(), priceNgwee: z.number().int().min(0) })) })).optional(),
  imageIds: z.array(z.string().uuid()).optional(),
});

async function uniqueSlug(name: string, ignoreId?: string) {
  let slug = slugify(name), n = 1;
  for (;;) {
    const hit = await prisma.place.findUnique({ where: { slug } });
    if (!hit || hit.id === ignoreId) return slug;
    slug = `${slugify(name)}-${++n}`;
  }
}

adminRouter.get('/places', wrap(async (req, res) => {
  const b = parse(z.object({ status: z.enum(['DRAFT', 'PENDING', 'LIVE', 'HIDDEN']).optional(), q: z.string().optional() }), req.query);
  const rows = await prisma.place.findMany({
    where: { ...(b.status ? { status: b.status } : {}), ...(b.q ? { name: { contains: b.q, mode: 'insensitive' } } : {}), mergedIntoId: null },
    orderBy: { createdAt: 'desc' }, take: 200, include: { area: true, category: true, _count: { select: { items: true, images: true } } },
  });
  res.json(rows.map((p) => ({ id: p.id, name: p.name, slug: p.slug, status: p.status, area: p.area.name, category: p.category.name, source: p.source, menuItems: p._count.items, images: p._count.images, isFeatured: p.isFeatured })));
}));

adminRouter.get('/places/:id', wrap(async (req, res) => {
  const p = await prisma.place.findUnique({
    where: { id: req.params.id as string },
    include: { hours: true, tags: { include: { tag: true } }, images: { orderBy: { sortOrder: 'asc' } }, sections: { orderBy: { sortOrder: 'asc' }, include: { items: { orderBy: { priceNgwee: 'asc' } } } } },
  });
  if (!p) throw notFound();
  res.json({
    id: p.id, name: p.name, slug: p.slug, status: p.status, categoryId: p.categoryId, areaId: p.areaId, lat: p.lat, lng: p.lng,
    description: p.description, address: p.address, phone: p.phone, whatsapp: p.whatsapp, isFeatured: p.isFeatured, priceLevel: p.priceLevel,
    hours: p.hours.map((h) => ({ weekday: h.weekday, opensAt: h.opensAt, closesAt: h.closesAt })), tagSlugs: p.tags.map((t) => t.tag.slug),
    images: p.images.map((i) => ({ id: i.id, status: i.status, ...(urls(i.variantKeys) ?? {}) })),
    menu: p.sections.map((s) => ({ name: s.name, items: s.items.map((i) => ({ id: i.id, name: i.name, priceNgwee: i.priceNgwee, isAvailable: i.isAvailable })) })),
  });
}));

adminRouter.post('/places', wrap(async (req, res) => {
  const b = parse(placeBody, req.body);
  const tags = b.tagSlugs?.length ? await prisma.tag.findMany({ where: { slug: { in: b.tagSlugs } } }) : [];
  const place = await prisma.place.create({
    data: {
      name: b.name, slug: await uniqueSlug(b.name), categoryId: b.categoryId, areaId: b.areaId, lat: b.lat, lng: b.lng,
      description: b.description, address: b.address, phone: b.phone, whatsapp: b.whatsapp, priceLevel: b.priceLevel ?? 1,
      status: b.status, isFeatured: b.isFeatured ?? false, source: 'SEED', createdById: req.user!.id,
      hours: b.hours?.length ? { create: b.hours } : undefined, tags: tags.length ? { create: tags.map((t) => ({ tagId: t.id })) } : undefined,
    },
  });
  if (b.menu?.length) {
    await prisma.$transaction((tx) => subs.applyMenu(tx, place.id, { mode: 'merge', sections: b.menu!.filter((s) => s.items.length) }));
  }
  if (b.imageIds?.length) {
    await prisma.image.updateMany({ where: { id: { in: b.imageIds } }, data: { placeId: place.id, ownerType: 'PLACE', ownerId: place.id, status: 'APPROVED' } });
  }
  await prisma.moderationLog.create({ data: { adminId: req.user!.id, action: 'place_create', note: place.name } });
  res.status(201).json({ id: place.id, slug: place.slug });
}));

adminRouter.put('/places/:id', wrap(async (req, res) => {
  const id = req.params.id as string;
  const b = parse(placeBody.partial(), req.body);
  const cur = await prisma.place.findUnique({ where: { id } });
  if (!cur) throw notFound();
  const { hours, tagSlugs, menu, imageIds, ...fields } = b;
  await prisma.$transaction(async (tx) => {
    await tx.place.update({ where: { id }, data: { ...fields, ...(fields.name && fields.name !== cur.name ? { slug: await uniqueSlug(fields.name, id) } : {}) } });
    if (hours) { await tx.placeHour.deleteMany({ where: { placeId: id } }); await tx.placeHour.createMany({ data: hours.map((h) => ({ ...h, placeId: id })) }); }
    if (tagSlugs) {
      const tags = await tx.tag.findMany({ where: { slug: { in: tagSlugs } } });
      await tx.placeTag.deleteMany({ where: { placeId: id } });
      await tx.placeTag.createMany({ data: tags.map((t) => ({ placeId: id, tagId: t.id })) });
    }
    if (menu?.length) await subs.applyMenu(tx, id, { mode: 'merge', sections: menu.filter((s) => s.items.length) });
    if (imageIds?.length) await tx.image.updateMany({ where: { id: { in: imageIds } }, data: { placeId: id, ownerType: 'PLACE', ownerId: id, status: 'APPROVED' } });
    await tx.moderationLog.create({ data: { adminId: req.user!.id, action: 'place_edit', note: cur.name } });
  });
  res.status(204).end();
}));

adminRouter.post('/places/:id/merge', wrap(async (req, res) => {
  const fromId = req.params.id as string;
  const { intoId } = parse(z.object({ intoId: z.string().uuid() }), req.body);
  if (fromId === intoId) throw badRequest('Cannot merge a place into itself');
  const [from, into] = await Promise.all([prisma.place.findUnique({ where: { id: fromId } }), prisma.place.findUnique({ where: { id: intoId } })]);
  if (!from || !into) throw notFound();
  await prisma.$transaction(async (tx) => {
    await tx.image.updateMany({ where: { placeId: fromId }, data: { placeId: intoId, ownerId: intoId } });
    await tx.menuSection.updateMany({ where: { placeId: fromId }, data: { placeId: intoId } });
    await tx.menuItem.updateMany({ where: { placeId: fromId }, data: { placeId: intoId } });
    // reviews: one per user per place, so skip those that would collide
    const mine = await tx.review.findMany({ where: { placeId: intoId }, select: { userId: true } });
    const taken = new Set(mine.map((r) => r.userId));
    const moving = await tx.review.findMany({ where: { placeId: fromId } });
    for (const r of moving) {
      if (taken.has(r.userId)) await tx.review.update({ where: { id: r.id }, data: { status: 'REJECTED' } });
      else await tx.review.update({ where: { id: r.id }, data: { placeId: intoId } });
    }
    const favs = await tx.favourite.findMany({ where: { placeId: fromId } });
    for (const f of favs) await tx.favourite.upsert({ where: { userId_placeId: { userId: f.userId, placeId: intoId } }, create: { userId: f.userId, placeId: intoId }, update: {} });
    await tx.favourite.deleteMany({ where: { placeId: fromId } });
    await tx.submission.updateMany({ where: { targetPlaceId: fromId }, data: { targetPlaceId: intoId } });
    await tx.place.update({ where: { id: fromId }, data: { status: 'HIDDEN', mergedIntoId: intoId } });
    await tx.moderationLog.create({ data: { adminId: req.user!.id, action: 'place_merge', note: `${from.name} -> ${into.name}` } });
  });
  await places.recalcAvgSpend(intoId);
  res.status(204).end();
}));

// ---- reference data ----
const refCrud = <T extends 'area' | 'category' | 'tag'>(model: T, schema: z.ZodObject<any>) => {
  const m = () => (prisma as any)[model];
  adminRouter.post(`/${model === 'category' ? 'categories' : model + 's'}`, wrap(async (req, res) => {
    const b = parse(schema, req.body) as { name: string };
    res.status(201).json(await m().create({ data: { ...b, slug: slugify(b.name) } }));
  }));
  adminRouter.put(`/${model === 'category' ? 'categories' : model + 's'}/:id`, wrap(async (req, res) => {
    res.json(await m().update({ where: { id: req.params.id as string }, data: parse(schema.partial(), req.body) }));
  }));
  adminRouter.delete(`/${model === 'category' ? 'categories' : model + 's'}/:id`, wrap(async (req, res) => {
    try { await m().delete({ where: { id: req.params.id as string } }); } catch { throw badRequest('In use; cannot delete'); }
    res.status(204).end();
  }));
};
refCrud('area', z.object({ name: z.string().min(2), city: z.string().default('Lusaka'), lat: z.number(), lng: z.number() }));
refCrud('category', z.object({ name: z.string().min(2) }));
refCrud('tag', z.object({ name: z.string().min(2), type: z.enum(['VIBE', 'FEATURE']) }));

// ---- users & trust ----
adminRouter.get('/users', wrap(async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const rows = await prisma.user.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] } : {},
    include: { stats: true }, orderBy: { createdAt: 'desc' }, take: 100,
  });
  res.json(rows.map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, trustLevel: u.stats?.trustLevel ?? 'NEW', points: u.stats?.points ?? 0, approved: u.stats?.approvedCount ?? 0, rejected: u.stats?.rejectedCount ?? 0 })));
}));
adminRouter.put('/users/:id/trust', wrap(async (req, res) => {
  const b = parse(z.object({ trustLevel: z.enum(['NEW', 'TRUSTED', 'BANNED']) }), req.body);
  const userId = req.params.id as string;
  await prisma.contributorStats.upsert({ where: { userId }, create: { userId, trustLevel: b.trustLevel }, update: { trustLevel: b.trustLevel, lastPromotedAt: b.trustLevel === 'TRUSTED' ? new Date() : undefined } });
  if (b.trustLevel === 'BANNED') await prisma.refreshToken.updateMany({ where: { userId }, data: { revokedAt: new Date() } });
  await prisma.moderationLog.create({ data: { adminId: req.user!.id, action: `trust_${b.trustLevel.toLowerCase()}`, note: userId } });
  res.status(204).end();
}));
adminRouter.put('/users/:id/role', wrap(async (req, res) => {
  const b = parse(z.object({ role: z.enum(['USER', 'OWNER', 'ADMIN']) }), req.body);
  await prisma.user.update({ where: { id: req.params.id as string }, data: { role: b.role } });
  await prisma.moderationLog.create({ data: { adminId: req.user!.id, action: `role_${b.role.toLowerCase()}`, note: req.params.id as string } });
  res.status(204).end();
}));

adminRouter.get('/stats', wrap(async (_req, res) => {
  const day = new Date(Date.now() - 864e5);
  const [users, live, pending, today, rejected, approved] = await Promise.all([
    prisma.user.count(), prisma.place.count({ where: { status: 'LIVE' } }), prisma.submission.count({ where: { status: 'PENDING' } }),
    prisma.submission.count({ where: { createdAt: { gt: day } } }),
    prisma.submission.count({ where: { status: 'REJECTED' } }), prisma.submission.count({ where: { status: { in: ['APPROVED', 'AUTO_PUBLISHED'] } } }),
  ]);
  res.json({ users, livePlaces: live, pendingSubmissions: pending, submissionsLast24h: today, approvalRate: approved + rejected ? approved / (approved + rejected) : null });
}));
