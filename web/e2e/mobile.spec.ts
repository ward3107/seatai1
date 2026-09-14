import { test, expect, type Page } from '@playwright/test';
import { openApp, createSampleClass, runOptimization, switchLanguage } from './helpers';

test.use({ viewport: { width: 390, height: 780 } });
test.beforeEach(async ({ page }) => openApp(page));

async function noOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

async function closeSidebar(page: Page) {
  await page.locator('aside').getByRole('button', { name: 'Close sidebar', exact: true }).click();
}

test('onboarding does not scroll horizontally', async ({ page }) => {
  await closeSidebar(page);
  await expect(page.getByRole('button', { name: /get started/i })).toBeVisible();
  await noOverflow(page);
});

test('a large generated class fits the viewport', async ({ page }) => {
  await createSampleClass(page, 30);
  await runOptimization(page);
  await closeSidebar(page);
  await noOverflow(page);
});

test('the sidebar opens and closes as a drawer', async ({ page }) => {
  await createSampleClass(page);
  await closeSidebar(page);
  await page.getByRole('button', { name: 'Open sidebar', exact: true }).click();
  await expect(page.locator('aside')).toHaveAttribute('aria-hidden', 'false');
  await closeSidebar(page);
  await expect(page.locator('aside')).toHaveAttribute('inert', '');
  await noOverflow(page);
});

for (const language of ['he', 'ar'] as const) {
  test(`${language}: RTL grid stays within the viewport`, async ({ page }) => {
    await createSampleClass(page, 30);
    await runOptimization(page);
    await closeSidebar(page);
    await switchLanguage(page, language);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await noOverflow(page);
  });
}
