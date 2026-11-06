import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser', fullyParallel: false, workers: 1,
  timeout: 15_000, use: { headless: true, viewport: { width: 1280, height: 900 },
    channel: process.env.MAT_BROWSER_CHANNEL || undefined },
  reporter: 'list',
});
