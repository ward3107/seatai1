import { test, expect, type Page, type Locator } from '@playwright/test';
import { openApp, createSampleClass, runOptimization } from './helpers';

async function withinScreen(page: Page, locator: Locator) {
  const width = page.viewportSize()!.width;
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  await expect.poll(async () => (await locator.boundingBox())!.x).toBeGreaterThanOrEqual(-1);
  await expect.poll(async () => { const current = (await locator.boundingBox())!; return current.x + current.width; }).toBeLessThanOrEqual(width + 1);
}

async function noPageOverflow(page: Page) {
  await expect.poll(() => page.locator('.workspace-content').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

for (const viewport of [
  { width: 320, height: 740 }, { width: 390, height: 844 },
  { width: 844, height: 390 }, { width: 768, height: 1024 },
  { width: 1024, height: 768 }, { width: 1440, height: 900 },
]) {
  test(`${viewport.width}×${viewport.height}: sample, guide, settings and export stay usable`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openApp(page);
    await page.evaluate(() => window.__ZUSTAND_STORE__.getState().setSidebarOpen(false));
    await page.getByRole('link', { name: /try a sample class first/i }).click();
    await expect(page.locator('#sample-classes')).toBeInViewport();
    await noPageOverflow(page);
    const sample = page.locator('.sample-class-button').first();
    await withinScreen(page, sample);
    expect((await sample.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await sample.click();
    await page.evaluate(() => {
      const s = window.__ZUSTAND_STORE__.getState();
      s.setConfig({ ...s.config, populationSize: 20, maxGenerations: 15, earlyStopPatience: 5 });
    });
    await runOptimization(page);
    await noPageOverflow(page);
    // A narrow screen scrolls the map locally instead of shrinking names away.
    const seat = page.locator('[data-seat-key]').first();
    expect((await seat.boundingBox())!.width).toBeGreaterThanOrEqual(60);
    await page.locator('header').getByRole('button', { name: 'User Guide', exact: true }).click();
    const guide = page.getByRole('dialog', { name: 'User Guide', exact: true });
    await expect(guide).toBeVisible();
    await withinScreen(page, guide.locator('.teacher-guide-dialog'));
    await expect(guide.getByTestId('teacher-quick-guide').getByRole('listitem')).toHaveCount(4);
    const close = guide.getByRole('button', { name: 'Close', exact: true });
    await expect(close).toBeInViewport();
    await close.click();
    await page.getByRole('button', { name: 'Students, room & rules', exact: true }).click();
    const sidebar = page.locator('aside');
    await expect(sidebar).toHaveAttribute('aria-hidden', 'false');
    await withinScreen(page, sidebar);
    await sidebar.getByRole('tab', { name: 'Room', exact: true }).click();
    await expect(page.locator('#setup-panel-room')).toBeVisible();
    await sidebar.getByRole('button', { name: 'Close sidebar', exact: true }).click();
    await expect(sidebar).toHaveAttribute('inert', '');
    await page.locator('header').getByRole('button', { name: 'Export', exact: true }).click();
    await withinScreen(page, page.getByRole('menu', { name: 'Export seating chart' }));
    const download = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: /JSON/ }).click();
    expect((await download).suggestedFilename()).toMatch(/\.json$/);
    await noPageOverflow(page);
    await page.screenshot({ path: test.info().outputPath('workspace.png') });
  });
}

for (const language of ['he', 'ar', 'ru'] as const) {
  test(`${language}: narrow header, guide and movement actions fit`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await openApp(page);
    await createSampleClass(page);
    await runOptimization(page);
    await page.evaluate(lang => window.__ZUSTAND_STORE__.getState().setUiLanguage(lang), language);
    await noPageOverflow(page);
    await page.locator('header .topbar-guide').click();
    const dialog = page.getByRole('dialog');
    await withinScreen(page, dialog.locator('.teacher-guide-dialog'));
    await expect(dialog.getByTestId('teacher-quick-guide').getByRole('listitem')).toHaveCount(4);
    await dialog.locator('button').first().click();
    await page.getByRole('button', { name: language === 'he' ? 'לחיצה' : language === 'ar' ? 'نقر' : 'Щелчок', exact: true }).click();
    await page.locator('[data-seat-key]').first().click();
    await withinScreen(page, page.getByTestId('movement-feedback'));
    await expect(page.locator('.movement-actions')).toBeVisible();
    await noPageOverflow(page);
  });
}

for (const viewport of [{ width: 320, height: 740 }, { width: 768, height: 1024 }]) {
  test(`${viewport.width}: a teacher can create a class through the guided steps`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openApp(page);
    await page.evaluate(() => window.__ZUSTAND_STORE__.getState().setSidebarOpen(false));
    await page.getByRole('button', { name: /create a new class/i }).click();
    await page.getByRole('textbox', { name: 'Student names, one per line' }).fill('Alice\nBob\nCara');
    await page.getByRole('button', { name: 'Add names to class', exact: true }).click();
    for (const next of ['Classroom', 'Rules', 'Generate']) {
      await noPageOverflow(page);
      const button = page.getByRole('button', { name: `Next: ${next}`, exact: true });
      await withinScreen(page, button);
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await button.click();
    }
    await expect.poll(() => page.evaluate(() => window.__ZUSTAND_STORE__.getState().wizardStep)).toBe(3);
    await noPageOverflow(page);
  });
}
