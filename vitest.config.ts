import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Тесттер бөлек базада жүреді (TEST_DATABASE_URL). Негізгі базаға тимейді.
const testDb = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/talshyn_test';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    env: {
      DATABASE_URL: testDb,
      DATABASE_URL_UNPOOLED: testDb,
      AUTH_SECRET: 'test-secret-test-secret-test-secret-123',
      NODE_ENV: 'test',
    },
    fileParallelism: false,
    testTimeout: 20000,
  },
});
