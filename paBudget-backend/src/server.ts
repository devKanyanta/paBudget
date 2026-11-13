import { config } from './config.js';
import { createApp } from './app.js';

createApp().listen(config.port, () => console.log(`paBudget API listening on :${config.port}`));
