import { test, expect } from '@playwright/test';

test('a dark device opens a white classroom app by default', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForFunction(() => window.__ZUSTAND_STORE__?.persist.hasHydrated());
  await expect(page.locator('header')).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  expect(await page.evaluate(() => window.__ZUSTAND_STORE__.getState().theme)).toBe('light');
});

for (const previous of ['system', 'dark'] as const) {
  test(`existing ${previous} preference migrates without losing classroom data`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addInitScript((theme) => {
      localStorage.setItem('seatai-storage', JSON.stringify({version:1,state:{theme,uiLanguage:'he',welcomeTipsDismissed:true,projects:[{id:'preserved-class',name:'Class A'}]}}));
    }, previous);
    await page.goto('/');
    await page.waitForFunction(() => window.__ZUSTAND_STORE__?.persist.hasHydrated());
    await expect(page.locator('header')).toBeVisible();
    if (previous === 'dark') await expect(page.locator('html')).toHaveClass(/dark/);
    else await expect(page.locator('html')).not.toHaveClass(/dark/);
    expect(await page.evaluate(() => window.__ZUSTAND_STORE__.getState().projects[0].id)).toBe('preserved-class');
  });
}
