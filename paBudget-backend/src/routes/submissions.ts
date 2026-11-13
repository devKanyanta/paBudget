import { Router } from 'express';
import { z } from 'zod';
import type { SubmissionType } from '@prisma/client';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { parse, wrap } from '../middleware/misc.js';
import * as subs from '../services/submissions.js';
import * as screening from '../services/screening.js';
import * as images from '../services/images.js';
import * as storage from '../services/storage.js';
import { extractMenu } from '../services/ai.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';

export const submissionsRouter = Router();
submissionsRouter.use(requireAuth);

const TYPE_MAP: Record<string, SubmissionType> = {
  place: 'NEW_PLACE', menu: 'MENU', photos: 'PHOTOS', review: 'REVIEW', edit: 'EDIT', flag: 'FLAG', claim: 'CLAIM',
};

const present = (s: any) => ({
  id: s.id, type: s.type, status: s.status, placeId: s.targetPlaceId, rejectReason: s.rejectReason, createdAt: s.createdAt, reviewedAt: s.reviewedAt,
  summary: s.payload?.name ?? s.payload?.body?.slice?.(0, 60) ?? s.payload?.reason ?? null,
});

submissionsRouter.get('/mine', wrap(async (req, res) => {
  const rows = await prisma.submission.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 100 });
  const stats = await prisma.contributorStats.findUnique({ where: { userId: req.user!.id } });
  res.json({ stats: stats && { trustLevel: stats.trustLevel, points: stats.points, approved: stats.approvedCount, rejected: stats.rejectedCount }, items: rows.map(present) });
}));

// Duplicate check shown before saving a new place (FR-71)
submissionsRouter.get('/duplicates', wrap(async (req, res) => {
  const b = parse(z.object({ name: z.string().min(1), lat: z.coerce.number(), lng: z.coerce.number() }), req.query);
  res.json(await screening.findDuplicates(b.name, b.lat, b.lng));
}));

// AI menu extraction from an uploaded menu photo; returns an editable draft (FR-72). Nothing is saved.
submissionsRouter.post('/menu-extract', wrap(async (req, res) => {
  const b = parse(z.object({ imageId: z.string().uuid() }), req.body);
  const img = await prisma.image.findUnique({ where: { id: b.imageId } });
  if (!img || img.uploadedById !== req.user!.id) throw forbidden();
  if (!img.processedAt) throw badRequest('Complete the upload first');
  const key = (img.variantKeys as any)?.['800'] ?? img.r2Key;
  const buf = await storage.getObject(key);
  if (!buf) throw notFound('Image missing');
  const mimeType = key.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  res.json(await extractMenu(req.user!.id, { mimeType, data: buf }));
}));

submissionsRouter.post('/:kind', wrap(async (req, res) => {
  const type = TYPE_MAP[req.params.kind as string];
  if (!type) throw notFound();
  const { placeId, ...payload } = req.body ?? {};
  const sub = await subs.createSubmission(req.user!.id, type, payload, placeId);
  res.status(201).json(present(sub));
}));

void images;
