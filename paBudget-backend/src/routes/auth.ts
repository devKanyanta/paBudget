import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../db.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { parse, wrap } from '../middleware/misc.js';
import * as auth from '../services/auth.js';

export const authRouter = Router();
const limiter = rateLimit({ windowMs: 15 * 60_000, limit: process.env.NODE_ENV === 'test' ? 10_000 : 30, standardHeaders: true, legacyHeaders: false });
authRouter.use(limiter);

const pw = z.string().min(8).max(100);

authRouter.post('/register', wrap(async (req, res) => {
  const b = parse(z.object({ name: z.string().min(1).max(80), email: z.string().email().optional(), phone: z.string().optional(), password: pw }), req.body);
  res.status(201).json(await auth.register(b));
}));
authRouter.post('/login', wrap(async (req, res) => {
  const b = parse(z.object({ email: z.string().email().optional(), phone: z.string().optional(), password: z.string() }), req.body);
  res.json(await auth.login(b));
}));
authRouter.post('/otp/request', wrap(async (req, res) => {
  const b = parse(z.object({ phone: z.string() }), req.body);
  await auth.requestOtp(b.phone);
  res.status(204).end();
}));
authRouter.post('/otp/verify', optionalAuth, wrap(async (req, res) => {
  const b = parse(z.object({ phone: z.string(), code: z.string().length(6), name: z.string().max(80).optional() }), req.body);
  res.json(await auth.verifyOtp(b, req.user?.id));
}));
authRouter.post('/refresh', wrap(async (req, res) => {
  const b = parse(z.object({ refreshToken: z.string() }), req.body);
  res.json(await auth.refresh(b.refreshToken));
}));
authRouter.post('/logout', wrap(async (req, res) => {
  const b = parse(z.object({ refreshToken: z.string() }), req.body);
  await auth.logout(b.refreshToken);
  res.status(204).end();
}));

export const meRouter = Router();
meRouter.use(requireAuth);
meRouter.get('/', wrap(async (req, res) => {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }, include: { stats: true } });
  res.json({ ...auth.publicUser(u), trustLevel: u.stats?.trustLevel ?? 'NEW', points: u.stats?.points ?? 0 });
}));
meRouter.patch('/', wrap(async (req, res) => {
  const b = parse(z.object({ name: z.string().min(1).max(80).optional(), homeAreaId: z.string().uuid().nullable().optional(), defaultBudgetNgwee: z.number().int().min(0).nullable().optional() }), req.body);
  const u = await prisma.user.update({ where: { id: req.user!.id }, data: b });
  res.json(auth.publicUser(u));
}));
meRouter.delete('/', wrap(async (req, res) => {
  await auth.deleteAccount(req.user!.id);
  res.status(204).end();
}));
