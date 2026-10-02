import { test, expect } from '@playwright/test';
import { openApp, createSampleClass, runOptimization } from './helpers';

for (const mode of ['rows', 'pairs'] as const) {
  for (const zoom of [0.75, 1, 1.25]) {
    test(`${mode}, RTL, zoom ${zoom}: dragged card stays with pointer and swaps target`, async ({ page }) => {
      await page.setViewportSize({ width: 900, height: 900 });
      await openApp(page);
      await createSampleClass(page, 8);
      await runOptimization(page);
      await page.evaluate(({ mode, zoom }) => {
        const s = window.__ZUSTAND_STORE__.getState();
        s.setSidebarOpen(false);
        s.setUiLanguage('he'); s.setViewMode(mode); s.setZoomLevel(zoom);
      }, { mode, zoom });
      await expect(page.locator('aside')).toHaveCSS('width', '0px');
      const keys = await page.evaluate(() => window.__ZUSTAND_STORE__.getState().result!.layout.seats.filter((s) => s.student_id).slice(0, 2).map((s) => `${s.position.row}-${s.position.col}`));
      const source = page.locator(`[data-seat-key="${keys[0]}"]`);
      const target = page.locator(`[data-seat-key="${keys[1]}"]`);
      await source.scrollIntoViewIfNeeded();
      await source.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'center' }));
      await source.hover();
      const a = (await source.boundingBox())!;
      const original = await page.evaluate((key) => {
        const s = window.__ZUSTAND_STORE__.getState().result!.layout.seats;
        return s.find((seat) => `${seat.position.row}-${seat.position.col}` === key)!.student_id;
      }, keys[0]);
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await page.mouse.down();
      const x = a.x + a.width / 2 + 20;
      const y = a.y + a.height / 2 + 20;
      await page.mouse.move(x, y, { steps: 6 });
      const ghost = page.getByTestId('drag-ghost');
      await expect(ghost).toBeVisible();
      const g = (await ghost.boundingBox())!;
      expect(x).toBeGreaterThanOrEqual(g.x - 2);
      expect(x).toBeLessThanOrEqual(g.x + g.width + 2);
      expect(y).toBeGreaterThanOrEqual(g.y - 2);
      expect(y).toBeLessThanOrEqual(g.y + g.height + 2);
      const b = (await target.boundingBox())!;
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
      // Wait for the rendered drop target before releasing: WebKit can
      // deliver synthetic pointer moves ahead of the next React paint.
      await expect(target.getByText(/^[✓✕]$/)).toBeVisible();
      await page.mouse.up();
      await expect.poll(() => page.evaluate((key) => window.__ZUSTAND_STORE__.getState().result!.layout.seats.find((s) => `${s.position.row}-${s.position.col}` === key)!.student_id, keys[1])).toBe(original);
    });
  }
}
