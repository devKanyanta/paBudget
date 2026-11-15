import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { signAccess } from '../middleware/auth.js';
import { badRequest, conflict, unauthorized } from '../lib/errors.js';
import type { User } from '@prisma/client';

const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export function normalizePhone(p: string) {
  let s = p.replace(/[\s-]/g, '');
  if (s.startsWith('0')) s = '+260' + s.slice(1);
  else if (s.startsWith('260')) s = '+' + s;
  if (!/^\+\d{8,15}$/.test(s)) throw badRequest('Invalid phone number');
  return s;
}

export const publicUser = (u: User) => ({
  id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role,
  homeAreaId: u.homeAreaId, defaultBudgetNgwee: u.defaultBudgetNgwee,
});

export async function issueTokens(user: User) {
  const refresh = crypto.randomBytes(48).toString('hex');
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: sha(refresh), expiresAt: new Date(Date.now() + config.refreshTtlDays * 864e5) },
  });
  return { accessToken: signAccess({ id: user.id, role: user.role }), refreshToken: refresh, expiresIn: config.accessTtlSec, user: publicUser(user) };
}

export async function register(i: { name: string; email?: string; phone?: string; password: string }) {
  if (!i.email && !i.phone) throw badRequest('Email or phone is required');
  const email = i.email?.toLowerCase();
  const phone = i.phone ? normalizePhone(i.phone) : undefined;
  if (email && (await prisma.user.findUnique({ where: { email } }))) throw conflict('Email already registered');
  if (phone && (await prisma.user.findUnique({ where: { phone } }))) throw conflict('Phone already registered');
  const user = await prisma.user.create({
    data: { name: i.name, email, phone, passwordHash: await bcrypt.hash(i.password, 10), stats: { create: {} } },
  });
  return issueTokens(user);
}

export async function login(i: { email?: string; phone?: string; password: string }) {
  const where = i.email ? { email: i.email.toLowerCase() } : i.phone ? { phone: normalizePhone(i.phone) } : null;
  if (!where) throw badRequest('Email or phone is required');
  const user = await prisma.user.findUnique({ where });
  if (!user || user.deletedAt || !user.passwordHash || !(await bcrypt.compare(i.password, user.passwordHash))) throw unauthorized('Wrong credentials');
  return issueTokens(user);
}

export async function refresh(token: string) {
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash: sha(token) }, include: { user: true } });
  if (!row || row.revokedAt || row.expiresAt < new Date() || row.user.deletedAt) {
    if (row && row.revokedAt) await prisma.refreshToken.updateMany({ where: { userId: row.userId }, data: { revokedAt: new Date() } }); // reuse => revoke family
    throw unauthorized('Invalid refresh token');
  }
  await prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
  return issueTokens(row.user);
}

export async function logout(token: string) {
  await prisma.refreshToken.updateMany({ where: { tokenHash: sha(token) }, data: { revokedAt: new Date() } });
}

/** FR-05: delete account & personal data. Contributions stay but are detached from identity. */
export async function deleteAccount(userId: string) {
  await prisma.$transaction([
    prisma.refreshToken.deleteMany({ where: { userId } }),
    prisma.favourite.deleteMany({ where: { userId } }),
    prisma.plan.deleteMany({ where: { userId } }),
    prisma.aiRequest.updateMany({ where: { userId }, data: { userId: null, prompt: null } }),
    prisma.placeOwner.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: { name: 'Deleted user', email: null, phone: null, passwordHash: null, deletedAt: new Date(), homeAreaId: null, defaultBudgetNgwee: null },
    }),
  ]);
}
