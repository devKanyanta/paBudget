import type { NextFunction, Request, Response, RequestHandler } from 'express';
import { ZodError, type ZodType } from 'zod';
import { HttpError } from '../lib/errors.js';
import { reportError } from '../lib/sentry.js';

export const wrap = (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler => (req, res, next) => {
  fn(req, res).catch(next);
};

export function parse<T>(schema: ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'validation_failed', message: 'Invalid input', issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
  }
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.code ?? 'error', message: err.message });
  console.error(err);
  reportError(err);
  res.status(500).json({ error: 'internal', message: 'Internal server error' });
}
