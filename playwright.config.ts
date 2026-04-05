import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3456',
    screenshot: 'only-on-failure',
    video: 'on',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'headless',
      testMatch: 'critical-path.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'visual',
      testMatch: 'visual-qa.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        headless: false,
        launchOptions: { slowMo: 100 },
        video: 'on',
      },
    },
    {
      name: 'regression',
      testMatch: 'visual-regression.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  /* No webServer block — we start servers manually */
});
