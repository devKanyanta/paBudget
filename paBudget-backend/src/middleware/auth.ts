import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { config } from '../config.js';
import { forbidden, unauthorized } from '../lib/errors.js';

export type AuthUser = { id: string; role: Role };
declare global { namespace Express { interface Request { user?: AuthUser } } }

export const signAccess = (u: AuthUser) => jwt.sign({ sub: u.id, role: u.role }, config.jwtSecret, { expiresIn: config.accessTtlSec });

function parse(req: Request): AuthUser | null {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  try {
    const p = jwt.verify(h.slice(7), config.jwtSecret) as { sub: string; role: Role };
    return { id: p.sub, role: p.role };
  } catch { return null; }
}

export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => { req.user = parse(req) ?? undefined; next(); };
export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const u = parse(req);
  if (!u) return next(unauthorized());
  req.user = u; next();
};
export const requireRole = (...roles: Role[]) => (req: Request, res: Response, next: NextFunction) =>
  requireAuth(req, res, (err?: unknown) => {
    if (err) return next(err);
    if (!roles.includes(req.user!.role)) return next(forbidden());
    next();
  });
