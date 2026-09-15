import { test, expect } from '@playwright/test';

test('the production app shell reloads while offline', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /get started/i })).toBeVisible();

  // Wait for the generated Workbox service worker to install, then reload once
  // so the page is controlled before network access is removed.
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /get started/i })).toBeVisible();
    await expect(page.locator('body')).not.toHaveText('');
  } finally {
    await context.setOffline(false);
  }
});
