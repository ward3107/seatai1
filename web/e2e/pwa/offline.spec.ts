import { test, expect } from '@playwright/test';

test('the production app shell reloads while offline', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'יצירת כיתה חדשה', exact: true })).toBeVisible();

  // Wait for the generated Workbox service worker to install, then reload once
  // so the page is controlled before network access is removed.
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'יצירת כיתה חדשה', exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'he');
    await page.getByRole('button', { name: 'יצירת כיתה חדשה', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'שמות התלמידים, שם אחד בכל שורה' })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
