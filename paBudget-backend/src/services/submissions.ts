import { z } from 'zod';
import { Prisma, type Submission, type SubmissionType } from '@prisma/client';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { badRequest, forbidden, notFound, tooMany } from '../lib/errors.js';
import { slugify, priceLevelFor } from '../lib/util.js';
import { screen } from './screening.js';
import { computeAvgSpend } from './avgspend.js';
import * as storage from './storage.js';
import { awardBadges } from './badges.js';

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const hours = z.array(z.object({ weekday: z.number().int().min(0).max(6), opensAt: hhmm, closesAt: hhmm })).max(21);
const price = z.number().int().min(0).max(10_000_000);
const menu = z.object({
  mode: z.enum(['merge', 'replace']).default('merge'),
  sections: z.array(z.object({ name: z.string().min(1).max(60), items: z.array(z.object({ name: z.string().min(1).max(100), description: z.string().max(200).optional(), priceNgwee: price })).min(1).max(150) })).min(1).max(20),
});
const ids = z.array(z.string().uuid());

export const payloadSchemas = {
  NEW_PLACE: z.object({
    name: z.string().min(2).max(100), areaId: z.string().uuid(), categoryId: z.string().uuid(),
    lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180),
    description: z.string().max(1000).optional(), address: z.string().max(200).optional(),
    phone: z.string().max(20).optional(), whatsapp: z.string().max(20).optional(),
    hours: hours.optional(), tagSlugs: z.array(z.string()).max(12).optional(),
    imageIds: ids.min(1).max(10), menu: menu.optional(), confirmNotDuplicate: z.boolean().optional(),
  }),
  MENU: menu,
  PHOTOS: z.object({ imageIds: ids.min(1).max(10), caption: z.string().max(200).optional() }),
  REVIEW: z.object({
    rating: z.number().int().min(1).max(5), body: z.string().max(1500).optional(), itemsOrdered: z.string().max(300).optional(),
    amountPaidNgwee: price.optional(), groupSize: z.number().int().min(1).max(100).optional(),
    vibeTags: z.array(z.string()).max(8).optional(), imageIds: ids.max(4).optional(),
  }),
  EDIT: z.object({
    phone: z.string().max(20).optional(), whatsapp: z.string().max(20).optional(), address: z.string().max(200).optional(),
    description: z.string().max(1000).optional(), hours: hours.optional(), lat: z.number().optional(), lng: z.number().optional(),
    closedPermanently: z.boolean().optional(), priceLevel: z.number().int().min(1).max(3).optional(),
    itemPrices: z.array(z.object({ itemId: z.string().uuid(), priceNgwee: price })).max(50).optional(),
  }).refine((o) => Object.keys(o).length > 0, 'Nothing to change'),
  FLAG: z.object({ targetType: z.enum(['place', 'image', 'review']), targetId: z.string().uuid(), reason: z.string().min(3).max(500) }),
  CLAIM: z.object({ message: z.string().min(3).max(500), contactPhone: z.string().max(20) }),
} satisfies Record<SubmissionType, z.ZodType>;

const POINTS: Record<SubmissionType, number> = { NEW_PLACE: 20, MENU: 15, PHOTOS: 5, REVIEW: 5, EDIT: 3, FLAG: 1, CLAIM: 0 };
const AUTO_TYPES: SubmissionType[] = ['REVIEW', 'PHOTOS', 'EDIT', 'MENU'];

type Tx = Prisma.TransactionClient;

export async function createSubmission(userId: string, type: SubmissionType, rawPayload: unknown, targetPlaceId?: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { stats: true } });
  if (!user.phoneVerifiedAt) throw forbidden('Verify your phone number to contribute');
  const stats = user.stats ?? (await prisma.contributorStats.create({ data: { userId } }));
  if (stats.trustLevel === 'BANNED') throw forbidden('Your account cannot contribute');

  const day = new Date(Date.now() - 864e5);
  if ((await prisma.submission.count({ where: { userId, createdAt: { gt: day } } })) >= config.limits.submissionsPerDay) throw tooMany('Daily submission limit reached');
  if (type === 'NEW_PLACE' && (await prisma.submission.count({ where: { userId, type, createdAt: { gt: day } } })) >= config.limits.newPlacesPerDay) throw tooMany('Daily new-place limit reached');

  const payload = payloadSchemas[type].parse(rawPayload) as any;

  if (type !== 'NEW_PLACE' && type !== 'CLAIM' && type !== 'FLAG' && !targetPlaceId) throw badRequest('placeId is required');
  if (type === 'CLAIM' && !targetPlaceId) throw badRequest('placeId is required');
  let place = null;
  if (targetPlaceId) {
    place = await prisma.place.findFirst({ where: { id: targetPlaceId, status: 'LIVE' }, include: { owners: true } });
    if (!place) throw notFound('Place not found');
  }
  if (type === 'REVIEW') {
    if (await prisma.review.findUnique({ where: { placeId_userId: { placeId: targetPlaceId!, userId } } })) throw badRequest('You already reviewed this place');
    if (await prisma.submission.findFirst({ where: { userId, type, targetPlaceId, status: 'PENDING' } })) throw badRequest('You already have a pending review for this place');
    if (place!.owners.some((o) => o.userId === userId)) throw forbidden('Owners cannot review their own place');
  }
  if (type === 'CLAIM' && (await prisma.submission.findFirst({ where: { userId, type, targetPlaceId, status: 'PENDING' } }))) throw badRequest('You already have a pending claim');
  if (type === 'NEW_PLACE') {
    const [area, cat] = await Promise.all([prisma.area.findUnique({ where: { id: payload.areaId } }), prisma.category.findUnique({ where: { id: payload.categoryId } })]);
    if (!area || !cat) throw badRequest('Unknown area or category');
  }

  // images must belong to this user and be processed
  const imageIds: string[] = payload.imageIds ?? [];
  if (imageIds.length) {
    const imgs = await prisma.image.findMany({ where: { id: { in: imageIds }, uploadedById: userId, processedAt: { not: null }, submissionId: null } });
    if (imgs.length !== new Set(imageIds).size) throw badRequest('One or more photos are missing, not yours, or not yet processed');
  }

  const s = await screen(userId, type, payload, targetPlaceId);
  const base = { userId, type, targetPlaceId: targetPlaceId ?? null, payload, aiScore: s.score, aiReasons: s.reasons };

  if (s.autoReject) {
    const sub = await prisma.submission.create({ data: { ...base, status: 'REJECTED', rejectReason: s.autoReject, reviewedAt: new Date() } });
    await prisma.image.updateMany({ where: { id: { in: imageIds } }, data: { submissionId: sub.id, status: 'REJECTED' } });
    await afterDecision(userId, type, false);
    return sub;
  }

  const trusted = stats.trustLevel === 'TRUSTED';
  const eligible = trusted && AUTO_TYPES.includes(type) && s.score >= config.trust.autoPublishMinScore && !(type === 'EDIT' && payload.closedPermanently);
  if (eligible) {
    const spot = Math.random() < config.trust.spotCheckRate;
    return prisma.$transaction(async (tx) => {
      const sub = await tx.submission.create({ data: { ...base, status: 'AUTO_PUBLISHED', spotCheck: spot, reviewedAt: new Date() } });
      await tx.image.updateMany({ where: { id: { in: imageIds } }, data: { submissionId: sub.id } });
      await applySubmission(tx, sub);
      return sub;
    }).then(async (sub) => { await afterDecision(userId, type, true); return sub; });
  }

  const sub = await prisma.submission.create({ data: { ...base, status: 'PENDING' } });
  await prisma.image.updateMany({ where: { id: { in: imageIds } }, data: { submissionId: sub.id } });
  return sub;
}

/** Writes an approved payload into the real tables (idempotent per submission; call inside a transaction). */
export async function applySubmission(tx: Tx, sub: Submission, override?: any) {
  const p: any = override ?? sub.payload;
  const approveImages = (placeId: string | null) =>
    tx.image.updateMany({ where: { submissionId: sub.id }, data: { status: 'APPROVED', placeId, ownerType: 'PLACE', ownerId: placeId } });

  switch (sub.type) {
    case 'NEW_PLACE': {
      let slug = slugify(p.name), n = 1;
      while (await tx.place.findUnique({ where: { slug } })) slug = `${slugify(p.name)}-${++n}`;
      const tags = p.tagSlugs?.length ? await tx.tag.findMany({ where: { slug: { in: p.tagSlugs } } }) : [];
      const place = await tx.place.create({
        data: {
          name: p.name, slug, categoryId: p.categoryId, areaId: p.areaId, lat: p.lat, lng: p.lng, description: p.description,
          address: p.address, phone: p.phone, whatsapp: p.whatsapp, status: 'LIVE', source: 'COMMUNITY', createdById: sub.userId,
          hours: p.hours?.length ? { create: p.hours } : undefined,
          tags: tags.length ? { create: tags.map((t) => ({ tagId: t.id })) } : undefined,
        },
      });
      await approveImages(place.id);
      if (p.menu) await applyMenu(tx, place.id, p.menu);
      await tx.submission.update({ where: { id: sub.id }, data: { targetPlaceId: place.id } });
      break;
    }
    case 'MENU': await applyMenu(tx, sub.targetPlaceId!, p); break;
    case 'PHOTOS': await approveImages(sub.targetPlaceId!); break;
    case 'REVIEW': {
      await tx.review.create({
        data: {
          placeId: sub.targetPlaceId!, userId: sub.userId, rating: p.rating, body: p.body, itemsOrdered: p.itemsOrdered,
          amountPaidNgwee: p.amountPaidNgwee, groupSize: p.groupSize, vibeTags: p.vibeTags ?? [], imageIds: p.imageIds ?? [], status: 'APPROVED',
        },
      });
      await approveImages(sub.targetPlaceId!);
      break;
    }
    case 'EDIT': {
      const { hours, itemPrices, ...fields } = p;
      if (Object.keys(fields).length) await tx.place.update({ where: { id: sub.targetPlaceId! }, data: { ...fields, ...(fields.closedPermanently ? { status: 'LIVE' } : {}) } });
      if (hours) {
        await tx.placeHour.deleteMany({ where: { placeId: sub.targetPlaceId! } });
        await tx.placeHour.createMany({ data: hours.map((h: any) => ({ ...h, placeId: sub.targetPlaceId! })) });
      }
      if (itemPrices?.length) {
        for (const ip of itemPrices) await tx.menuItem.updateMany({ where: { id: ip.itemId, placeId: sub.targetPlaceId! }, data: { priceNgwee: ip.priceNgwee, lastConfirmedAt: new Date(), confirmCount: { increment: 1 } } });
        await recalcWithTx(tx, sub.targetPlaceId!);
      }
      break;
    }
    case 'FLAG': {
      if (p.targetType === 'place') await tx.place.updateMany({ where: { id: p.targetId }, data: { status: 'HIDDEN' } });
      if (p.targetType === 'image') await tx.image.updateMany({ where: { id: p.targetId }, data: { status: 'REJECTED' } });
      if (p.targetType === 'review') await tx.review.updateMany({ where: { id: p.targetId }, data: { status: 'REJECTED' } });
      break;
    }
    case 'CLAIM': {
      await tx.placeOwner.upsert({
        where: { placeId_userId: { placeId: sub.targetPlaceId!, userId: sub.userId } },
        create: { placeId: sub.targetPlaceId!, userId: sub.userId, verifiedAt: new Date() }, update: { verifiedAt: new Date() },
      });
      await tx.user.updateMany({ where: { id: sub.userId, role: 'USER' }, data: { role: 'OWNER' } });
      break;
    }
  }
}

async function recalcWithTx(_tx: Tx, placeId: string) {
  const items = await _tx.menuItem.findMany({ where: { placeId, isAvailable: true }, include: { section: true } });
  if (!items.length) return;
  const avg = computeAvgSpend(items.map((i) => ({ price: i.priceNgwee, section: i.section.name })));
  await _tx.place.update({ where: { id: placeId }, data: { avgSpendPpNgwee: avg, priceLevel: priceLevelFor(avg), menuUpdatedAt: new Date() } });
}

export async function applyMenu(tx: Tx, placeId: string, menu: z.infer<typeof payloadSchemas.MENU>) {
  const existing = await tx.menuSection.findMany({ where: { placeId }, include: { items: true } });
  const seen = new Set<string>();
  let order = existing.length;
  for (const s of menu.sections) {
    let sec = existing.find((e) => e.name.toLowerCase() === s.name.toLowerCase());
    if (!sec) sec = { ...(await tx.menuSection.create({ data: { placeId, name: s.name, sortOrder: order++ } })), items: [] };
    for (const it of s.items) {
      const found = sec.items.find((e) => e.name.toLowerCase() === it.name.toLowerCase());
      if (found) {
        seen.add(found.id);
        await tx.menuItem.update({ where: { id: found.id }, data: { priceNgwee: it.priceNgwee, description: it.description ?? found.description, isAvailable: true, lastConfirmedAt: new Date(), confirmCount: { increment: 1 } } });
      } else {
        const created = await tx.menuItem.create({ data: { sectionId: sec.id, placeId, name: it.name, description: it.description, priceNgwee: it.priceNgwee } });
        seen.add(created.id);
      }
    }
  }
  if (menu.mode === 'replace') {
    await tx.menuItem.updateMany({ where: { placeId, id: { notIn: [...seen] } }, data: { isAvailable: false } });
  }
  await recalcWithTx(tx, placeId);
}

// ---------- moderation decisions ----------

export async function afterDecision(userId: string, type: SubmissionType, approved: boolean) {
  const stats = await prisma.contributorStats.upsert({ where: { userId }, create: { userId }, update: {} });
  const data: Prisma.ContributorStatsUpdateInput = approved
    ? { approvedCount: { increment: 1 }, points: { increment: POINTS[type] } }
    : { rejectedCount: { increment: 1 } };
  const upd = await prisma.contributorStats.update({ where: { userId }, data });
  if (stats.trustLevel === 'BANNED') return;
  const t = config.trust;
  if (upd.trustLevel === 'NEW' && upd.approvedCount >= t.promoteApproved && upd.rejectedCount / (upd.approvedCount + upd.rejectedCount) < t.promoteMaxRejectRate) {
    await prisma.contributorStats.update({ where: { userId }, data: { trustLevel: 'TRUSTED', lastPromotedAt: new Date() } });
  } else if (upd.trustLevel === 'TRUSTED' && !approved) {
    const recent = await prisma.submission.count({ where: { userId, status: 'REJECTED', reviewedAt: { gt: new Date(Date.now() - t.demoteWindowDays * 864e5) } } });
    if (recent >= t.demoteRejections) await prisma.contributorStats.update({ where: { userId }, data: { trustLevel: 'NEW' } });
  }
  if (approved) await awardBadges(userId);
}

export async function approve(adminId: string, id: string, override?: unknown, note?: string) {
  const sub = await prisma.submission.findUnique({ where: { id } });
  if (!sub) throw notFound('Submission not found');
  if (sub.status !== 'PENDING') throw badRequest(`Submission is already ${sub.status.toLowerCase()}`);
  const edited = override !== undefined ? (payloadSchemas[sub.type].parse(override) as any) : undefined;
  await prisma.$transaction(async (tx) => {
    await applySubmission(tx, sub, edited);
    await tx.submission.update({ where: { id }, data: { status: 'APPROVED', reviewedById: adminId, reviewedAt: new Date(), ...(edited ? { payload: edited } : {}) } });
    await tx.moderationLog.create({ data: { adminId, submissionId: id, action: edited ? 'edit_approve' : 'approve', note } });
  });
  await afterDecision(sub.userId, sub.type, true);
  return prisma.submission.findUniqueOrThrow({ where: { id } });
}

export async function reject(adminId: string, id: string, reason: string) {
  const sub = await prisma.submission.findUnique({ where: { id } });
  if (!sub) throw notFound('Submission not found');
  if (sub.status !== 'PENDING') throw badRequest(`Submission is already ${sub.status.toLowerCase()}`);
  const imgs = await prisma.image.findMany({ where: { submissionId: id } });
  await prisma.$transaction([
    prisma.submission.update({ where: { id }, data: { status: 'REJECTED', rejectReason: reason, reviewedById: adminId, reviewedAt: new Date() } }),
    prisma.image.updateMany({ where: { submissionId: id }, data: { status: 'REJECTED' } }),
    prisma.moderationLog.create({ data: { adminId, submissionId: id, action: 'reject', note: reason } }),
  ]);
  for (const i of imgs) for (const k of Object.values((i.variantKeys as Record<string, string>) ?? {})) await storage.deleteObject(k);
  await afterDecision(sub.userId, sub.type, false);
}

/** A spot-checked auto-published item the admin disagrees with: hide content and count against the contributor. */
export async function revokeAutoPublished(adminId: string, id: string, reason: string) {
  const sub = await prisma.submission.findUnique({ where: { id } });
  if (!sub || sub.status !== 'AUTO_PUBLISHED') throw badRequest('Not an auto-published submission');
  await prisma.$transaction([
    prisma.review.updateMany({ where: { placeId: sub.targetPlaceId ?? '', userId: sub.userId }, data: { status: 'REJECTED' } }),
    prisma.image.updateMany({ where: { submissionId: id }, data: { status: 'REJECTED' } }),
    prisma.submission.update({ where: { id }, data: { status: 'REJECTED', rejectReason: reason, reviewedById: adminId, reviewedAt: new Date(), spotCheck: false } }),
    prisma.moderationLog.create({ data: { adminId, submissionId: id, action: 'revoke', note: reason } }),
  ]);
  await afterDecision(sub.userId, sub.type, false);
}
