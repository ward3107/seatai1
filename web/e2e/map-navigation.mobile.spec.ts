import { test, expect } from '@playwright/test';
import { createSampleClass, openApp, runOptimization, switchLanguage } from './helpers';

test.beforeEach(async ({ page }) => { await openApp(page); });

for (const language of ['en', 'he'] as const) {
  for (const mode of ['details', 'drag'] as const) {
    test(`${language}: swipe across occupied seats in ${mode} mode without moving a pupil`, async ({ page, context }) => {
      await createSampleClass(page, 30);
      await runOptimization(page);
      if (language === 'he') await switchLanguage(page, language);
      if (mode === 'drag') await page.getByRole('button', { name: language === 'he' ? 'גרירה' : 'Drag', exact: true }).tap();
      const map = page.getByTestId('classroom-map-scroll');
      await map.scrollIntoViewIfNeeded();
      const rosterBefore = await page.evaluate(() => window.__ZUSTAND_STORE__.getState().result!.student_positions);
      const point = await map.evaluate(element => {
        const viewport = element.getBoundingClientRect();
        const seats = element.querySelectorAll('[data-seat-key]');
        for (const seat of seats) {
          const rect = seat.getBoundingClientRect();
          const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
          if (x > viewport.x + 60 && x < viewport.right - 60 && y > 0 && y < innerHeight - 80) return { x, y };
        }
        throw new Error('No visible occupied seat for the swipe');
      });
      const before = await map.evaluate(element => Math.abs(element.scrollLeft));
      const touch = await context.newCDPSession(page);
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
      for (let step = 1; step <= 4; step++) {
        await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: point.x + (language === 'he' ? 1 : -1) * step * 24, y: point.y }] });
        await page.waitForTimeout(16);
      }
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect.poll(() => map.evaluate(element => Math.abs(element.scrollLeft))).toBeGreaterThan(before + 20);
      await expect(page.getByTestId('drag-ghost')).toHaveCount(0);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(await page.evaluate(() => window.__ZUSTAND_STORE__.getState().result!.student_positions)).toEqual(rosterBefore);
    });
  }

  test(`${language}: arrow buttons and slider reach both sides of the map`, async ({ page }) => {
    await createSampleClass(page, 30);
    await runOptimization(page);
    if (language === 'he') await switchLanguage(page, language);
    const map = page.getByTestId('classroom-map-scroll');
    const left = page.getByRole('button', { name: language === 'he' ? 'גלילת המפה שמאלה' : 'Scroll the map left', exact: true });
    const right = page.getByRole('button', { name: language === 'he' ? 'גלילת המפה ימינה' : 'Scroll the map right', exact: true });
    const slider = page.getByRole('slider', { name: language === 'he' ? 'מיקום אופקי במפה' : 'Horizontal map position', exact: true });
    await slider.press('Home');
    await expect(left).toBeDisabled();
    await right.tap();
    await expect(left).toBeEnabled();
    await left.tap();
    await expect(left).toBeDisabled();
    await slider.press('End');
    await expect(right).toBeDisabled();
    const max = await map.evaluate(element => element.scrollWidth - element.clientWidth);
    expect(max).toBeGreaterThan(20);
    await expect.poll(() => map.evaluate(element => document.documentElement.dir === 'rtl' ? element.scrollWidth - element.clientWidth + element.scrollLeft : element.scrollLeft)).toBeGreaterThanOrEqual(max - 1);
    await slider.press('Home');
    await expect(left).toBeDisabled();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}
