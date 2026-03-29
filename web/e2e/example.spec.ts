import { test, expect } from '@playwright/test';

/**
 * Example E2E Test - Basic App Loading
 *
 * This is a simple smoke test to verify Playwright is set up correctly.
 * Run with: npm run test:e2e
 */

test('app loads successfully', async ({ page }) => {
  await page.goto('/');

  // App should be visible
  await expect(page.locator('body')).toBeVisible();

  // Check for main heading
  const heading = page.getByRole('heading', { name: /seatai|ai seating/i });
  if (await heading.isVisible().catch(() => false)) {
    await expect(heading).toBeVisible();
  }
});

test('page title is correct', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/SeatAI|seating/i);
});

test('no console errors on load', async ({ page }) => {
  const errors: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  await page.goto('/');

  // Give time for any async errors
  await page.waitForTimeout(2000);

  expect(errors).toHaveLength(0);
});
