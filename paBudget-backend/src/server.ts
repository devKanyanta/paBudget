import { config } from './config.js';
import { initSentry } from './lib/sentry.js';
import { createApp } from './app.js';

initSentry();
createApp().listen(config.port, () => console.log(`paBudget API listening on :${config.port}`));
