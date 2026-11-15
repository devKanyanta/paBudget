import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../db.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { parse, wrap } from '../middleware/misc.js';
import { POINTS } from '../services/submissions.js';
import { BADGES, ensureBadges } from '../services/badges.js';

// ---- leaderboard & badges (FR-80) ----
export const leaderboardRouter = Router();
leaderboardRouter.get('/', optionalAuth, wrap(async (req, res) => {
  const b = parse(z.object({ area: z.string().optional(), period: z.enum(['all', 'month']).default('all') }), req.query);
  const since = b.period === 'month' ? new Date(Date.now() - 30 * 864e5) : undefined;
  const subs = await prisma.submission.findMany({
    where: {
      status: { in: ['APPROVED', 'AUTO_PUBLISHED'] }, user: { deletedAt: null, stats: { trustLevel: { not: 'BANNED' } } },
      ...(since ? { createdAt: { gt: since } } : {}),
      ...(b.area ? { targetPlaceId: { in: (await prisma.place.findMany({ where: { area: { slug: b.area } }, select: { id: true } })).map((p) => p.id) } } : {}),
    },
    select: { userId: true, type: true },
  });
  const pts = new Map<string, number>();
  for (const s of subs) pts.set(s.userId, (pts.get(s.userId) ?? 0) + POINTS[s.type]);
  const top = [...pts].filter(([, p]) => p > 0).sort((a, c) => c[1] - a[1]).slice(0, 20);
  const users = await prisma.user.findMany({ where: { id: { in: top.map(([id]) => id) } }, select: { id: true, name: true, badges: { select: { badgeId: true } } } });
  const u = new Map(users.map((x) => [x.id, x]));
  res.json(top.map(([id, points], i) => ({ rank: i + 1, name: u.get(id)?.name ?? 'Contributor', points, badges: u.get(id)?.badges.length ?? 0, isMe: id === req.user?.id })));
}));

export const badgesRouter = Router();
badgesRouter.get('/', requireAuth, wrap(async (req, res) => {
  await ensureBadges();
  const [all, mine] = await Promise.all([prisma.badge.findMany({ orderBy: { name: 'asc' } }), prisma.userBadge.findMany({ where: { userId: req.user!.id } })]);
  const earned = new Map(mine.map((m) => [m.badgeId, m.earnedAt]));
  const rule = new Map(BADGES.map((b) => [b.name, b.rule]));
  res.json(all.map((b) => ({ id: b.id, name: b.name, rule: rule.get(b.name) ?? b.rule, earnedAt: earned.get(b.id) ?? null })));
}));

// ---- data export (NFR-07) ----
export const exportRouter = Router();
exportRouter.get('/', requireAuth, wrap(async (req, res) => {
  const id = req.user!.id;
  const [user, favourites, reviews, submissions, plans, ai, badges] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id }, include: { stats: true } }),
    prisma.favourite.findMany({ where: { userId: id }, include: { place: { select: { name: true, slug: true } } } }),
    prisma.review.findMany({ where: { userId: id }, include: { place: { select: { name: true } } } }),
    prisma.submission.findMany({ where: { userId: id } }),
    prisma.plan.findMany({ where: { userId: id }, include: { stops: true } }),
    prisma.aiRequest.findMany({ where: { userId: id }, select: { kind: true, prompt: true, createdAt: true } }),
    prisma.userBadge.findMany({ where: { userId: id }, include: { badge: true } }),
  ]);
  res.set('Content-Disposition', 'attachment; filename="pabudget-my-data.json"').json({
    exportedAt: new Date().toISOString(),
    profile: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, createdAt: user.createdAt, homeAreaId: user.homeAreaId, defaultBudgetNgwee: user.defaultBudgetNgwee },
    contributor: user.stats && { trustLevel: user.stats.trustLevel, points: user.stats.points, approved: user.stats.approvedCount, rejected: user.stats.rejectedCount },
    badges: badges.map((b) => ({ name: b.badge.name, earnedAt: b.earnedAt })),
    favourites: favourites.map((f) => ({ place: f.place.name, slug: f.place.slug, createdAt: f.createdAt })),
    reviews: reviews.map((r) => ({ place: r.place.name, rating: r.rating, body: r.body, status: r.status, createdAt: r.createdAt })),
    submissions: submissions.map((s) => ({ id: s.id, type: s.type, status: s.status, payload: s.payload, createdAt: s.createdAt })),
    plans: plans.map((p) => ({ title: p.title, budgetNgwee: p.budgetNgwee, groupSize: p.groupSize, stops: p.stops.map((s) => ({ placeId: s.placeId, totalNgwee: s.estimatedTotalNgwee, items: s.items })), createdAt: p.createdAt })),
    plannerRequests: ai.filter((a) => a.kind === 'planner'),
  });
}));

// ---- takedown requests (NFR-16): public form, 72 h SLA ----
export const takedownRouter = Router();
takedownRouter.post('/', rateLimit({ windowMs: 3600_000, limit: process.env.NODE_ENV === 'test' ? 10_000 : 10, standardHeaders: true, legacyHeaders: false }), wrap(async (req, res) => {
  const b = parse(z.object({
    targetType: z.enum(['place', 'image', 'review', 'other']), targetId: z.string().max(80).optional(),
    reason: z.string().trim().min(10).max(2000), contactName: z.string().trim().min(2).max(100), contactEmail: z.string().email(),
  }), req.body);
  const t = await prisma.takedown.create({ data: { ...b, dueAt: new Date(Date.now() + 72 * 3600_000) } });
  res.status(201).json({ id: t.id, dueAt: t.dueAt });
}));
