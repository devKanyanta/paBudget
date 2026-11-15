import * as Sentry from '@sentry/node';
import { config } from '../config.js';

/** Error reporting is opt-in: nothing is sent unless SENTRY_DSN is set. */
export function initSentry() {
  if (config.sentryDsn) Sentry.init({ dsn: config.sentryDsn, tracesSampleRate: 0.05 });
}
export const reportError = (e: unknown) => { if (config.sentryDsn) Sentry.captureException(e); };
