import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/misc.js';
import { authRouter, meRouter } from './routes/auth.js';
import { placesRouter, metaRouter, favouritesRouter } from './routes/places.js';
import { uploadsRouter, localRawUpload, filesRouter } from './routes/uploads.js';
import { submissionsRouter } from './routes/submissions.js';
import { adminRouter } from './routes/admin.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors());
  app.get('/health', (_req, res) => void res.json({ ok: true }));

  // raw binary PUT must be registered before the JSON parser
  app.use('/uploads', localRawUpload);
  app.use(express.json({ limit: '1mb' }));

  app.use('/files', filesRouter);
  app.use('/auth', authRouter);
  app.use('/me', meRouter);
  app.use('/me/favourites', favouritesRouter);
  app.use('/meta', metaRouter);
  app.use('/places', placesRouter);
  app.use('/uploads', uploadsRouter);
  app.use('/submissions', submissionsRouter);
  app.use('/admin', adminRouter);

  app.use((_req, res) => void res.status(404).json({ error: 'not_found', message: 'Not found' }));
  app.use(errorHandler);
  return app;
}
