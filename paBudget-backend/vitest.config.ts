import { defineConfig } from 'vitest/config';
import os from 'node:os';
import path from 'node:path';

export default defineConfig({
  test: {
    globalSetup: ['./test/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgresql://pabudget@localhost:5433/pabudget_test',
      JWT_SECRET: 'test-secret',
      UPLOAD_DIR: path.join(os.tmpdir(), 'pabudget-test-uploads'),
      GEMINI_API_KEY: '',
    },
  },
});
