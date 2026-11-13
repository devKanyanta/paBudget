import express, { Router } from 'express';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import { requireAuth } from '../middleware/auth.js';
import { parse, wrap } from '../middleware/misc.js';
import { config, hasR2 } from '../config.js';
import * as images from '../services/images.js';
import * as storage from '../services/storage.js';
import { forbidden, badRequest } from '../lib/errors.js';
import { prisma } from '../db.js';

export const uploadsRouter = Router();

uploadsRouter.post('/presign', requireAuth, wrap(async (req, res) => {
  const b = parse(z.object({ contentType: z.string(), size: z.number().int().positive(), purpose: z.enum(['photo', 'menu-scan']).default('photo') }), req.body);
  res.json(await images.presign(req.user!.id, b));
}));

uploadsRouter.post('/:id/complete', requireAuth, wrap(async (req, res) => {
  res.json(await images.complete(req.user!.id, req.params.id as string));
}));

// Local-dev stand-in for the R2 presigned PUT target. Disabled when R2 is configured.
export const localRawUpload = Router();
localRawUpload.put('/raw/*key', express.raw({ type: () => true, limit: config.maxUploadBytes }), wrap(async (req, res) => {
  if (hasR2()) throw forbidden();
  const key = ([] as string[]).concat((req.params as any).key).join('/');
  const img = await prisma.image.findFirst({ where: { r2Key: key } });
  if (!img || img.processedAt) throw forbidden('Unknown upload target');
  if (!Buffer.isBuffer(req.body) || !req.body.length) throw badRequest('Empty body');
  await storage.putObject(key, req.body, String(req.headers['content-type'] ?? 'application/octet-stream'));
  res.status(200).end();
}));

export const filesRouter = Router();
filesRouter.get('/*key', wrap(async (req, res) => {
  const key = ([] as string[]).concat((req.params as any).key).join('/');
  if (!key.startsWith('images/')) throw forbidden(); // menu scans / incoming are private
  const buf = await storage.getObject(key);
  if (!buf) return void res.status(404).end();
  res.set('Cache-Control', 'public, max-age=31536000, immutable').type(path.extname(key) || 'webp').send(buf);
}));
void fs;
