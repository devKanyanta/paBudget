import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  accessTtlSec: 15 * 60,
  refreshTtlDays: 30,
  publicUrl: process.env.PUBLIC_URL ?? 'http://localhost:4000',
  geminiKey: process.env.GEMINI_API_KEY ?? '',
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  r2: {
    endpoint: process.env.R2_ENDPOINT ?? '',
    bucket: process.env.R2_BUCKET ?? '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    publicBase: process.env.R2_PUBLIC_BASE ?? '',
  },
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  maxUploadBytes: 8 * 1024 * 1024,
  limits: { submissionsPerDay: 20, newPlacesPerDay: 5, plannerPerDay: Number(process.env.PLANNER_PER_DAY ?? 10) },
  sentryDsn: process.env.SENTRY_DSN ?? '',
  trust: { promoteApproved: 10, promoteMaxRejectRate: 0.1, demoteRejections: 3, demoteWindowDays: 30, autoPublishMinScore: 70, spotCheckRate: 0.1 },
};
export const hasR2 = () => !!(config.r2.endpoint && config.r2.bucket && config.r2.accessKeyId);
