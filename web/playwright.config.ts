import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      testIgnore: [/mobile\.spec\.ts/, /pwa\//],
      use: {
        ...devices['Desktop Chrome'],
        // Allow pointing at a pre-installed Chromium (e.g. a sandbox that ships
        // its own build) via PW_CHROMIUM_PATH. Unset in CI, where
        // `playwright install` provides the pinned build, so this is a no-op there.
        ...(process.env.PW_CHROMIUM_PATH
          ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } }
          : {}),
      },
    },
    {
      name: 'firefox',
      testIgnore: [/mobile\.spec\.ts/, /pwa\//],
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: [/mobile\.spec\.ts/, /pwa\//],
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile-only project: avoid rerunning desktop workflows under phone
    // emulation while still exercising touch/mobile browser behavior.
    {
      name: 'mobile-chrome',
      testMatch: /mobile\.spec\.ts/,
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Start dev server before running tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
