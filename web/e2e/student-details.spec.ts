import { test, expect } from '@playwright/test';
import { openApp, createSampleClass, runOptimization } from './helpers';

for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
]) {
  test.describe(`${viewport.width}px student detail sheet`, () => {
    test.use({ viewport });

    test('opens the full profile, scrolls its content and keeps the close button reachable', async ({ page }) => {
      await openApp(page);
      await createSampleClass(page, 20);
      await page.evaluate(() => {
        const store = window.__ZUSTAND_STORE__.getState();
        store.setStudents(store.students.map(student => student.id === 'student-0' ? {
          ...student,
          academic_score: 58,
          behavior_score: 63,
          requires_quiet_area: true,
          special_needs: [{ type: 'Learning support', description: 'Provide written instructions.', requires_front_seat: false, requires_support_buddy: false }],
          notes: Array.from({ length: 20 }, (_, i) => `Teacher note ${i + 1}: use short, clear instructions.`).join('\n'),
        } : student));
      });
      await runOptimization(page);
      const sidebar = page.locator('aside[aria-hidden]');
      if (await sidebar.getAttribute('aria-hidden') === 'false') {
        await sidebar.getByRole('button', { name: 'Close sidebar', exact: true }).click();
      }
      await page.getByRole('button', { name: 'Student details', exact: true }).click();
      const key = await page.evaluate(() => {
        const seat = window.__ZUSTAND_STORE__.getState().result!.layout.seats.find(s => s.student_id === 'student-0')!;
        return `${seat.position.row}-${seat.position.col}`;
      });
      await page.locator(`[data-seat-key="${key}"]`).click();
      const panel = page.getByTestId('student-detail-panel');
      const body = page.getByTestId('student-detail-body');
      const close = panel.getByRole('button', { name: 'Close details', exact: true });
      await expect(panel).toHaveAttribute('aria-modal', 'true');
      await expect(panel).toHaveCSS('position', 'fixed');
      await expect(panel.getByRole('heading', { name: 'Student 1', exact: true })).toBeVisible();
      await expect(panel.getByRole('meter', { name: 'Academic score', exact: true })).toHaveAttribute('aria-valuenow', '58');
      await expect(panel.getByRole('meter', { name: 'Behavior score', exact: true })).toHaveAttribute('aria-valuenow', '63');
      await expect(panel.getByRole('heading', { name: 'Teacher notes', exact: true })).toHaveCount(1);
      await expect(panel.getByRole('heading', { name: 'Special needs', exact: true })).toHaveCount(1);
      await expect(panel.getByText('Provide written instructions.', { exact: false })).toHaveCount(1);
      await panel.getByRole('heading', { name: 'Adjacent peers', exact: true }).scrollIntoViewIfNeeded();
      await expect.poll(() => body.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
      const bounds = (await panel.boundingBox())!;
      const closeBounds = (await close.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1);
      expect(closeBounds.width).toBeGreaterThanOrEqual(44);
      expect(closeBounds.height).toBeGreaterThanOrEqual(44);
      expect(closeBounds.y + closeBounds.height).toBeLessThanOrEqual(viewport.height);
      await close.focus();
      await page.keyboard.press('Tab');
      await expect(close).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(panel).toHaveCount(0);
      await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
    });
  });
}

test('the detail panel docks only on a wide desktop and becomes a modal when narrowed', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  await createSampleClass(page);
  await page.evaluate(() => window.__ZUSTAND_STORE__.getState().setDetailsTarget('student-0'));
  const panel = page.getByTestId('student-detail-panel');
  await expect(panel).toHaveAttribute('aria-modal', 'false');
  await expect(panel).toHaveCSS('position', 'static');
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(panel).toHaveAttribute('aria-modal', 'true');
  await expect(panel).toHaveCSS('position', 'fixed');
  await panel.getByRole('button', { name: 'Close details', exact: true }).click();
  await expect(panel).toHaveCount(0);
});
