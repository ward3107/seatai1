import { test, expect } from '@playwright/test';
/** Exercise actual production chunks and Worker loading, without the dev store hook. */
for (const phone of [false, true]) {
  test(`production classroom, ${phone ? 'phone' : 'desktop'}: optimize, panels, move, reload`, async ({ page }) => {
    await page.setViewportSize(phone ? { width: 390, height: 844 } : { width: 1440, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.getByRole('button', { name: /30/ }).click();
    if (!phone) await page.getByRole('button', { name: 'הבנתי', exact: true }).click();
    await page.getByTestId('optimize-button').click();
    const seats = page.locator('[data-seat-key]');
    await expect(seats.filter({ hasText: 'Alice' })).toHaveCount(1);
    await expect(page.getByTestId('optimize-button')).toBeEnabled();
    await page.getByRole('button', { name: 'פתח סרגל צד', exact: true }).click();
    await page.getByRole('tab', { name: 'החדר', exact: true }).click();
    await page.locator('button[aria-controls="layout-panel-body"]').click();
    const editor = page.getByTestId('room-plan-editor');
    await editor.getByRole('button', { name: '+ דלת', exact: true }).click();
    await editor.getByRole('button', { name: '+ חלון', exact: true }).click();
    await page.locator('aside').getByRole('button', { name: 'סגור סרגל צד', exact: true }).click();
    await expect(seats.filter({ hasText: 'Alice' })).toHaveCount(1);
    await expect(page.locator('#seating-grid-export [data-room-feature]')).toHaveCount(2);
    const disclosure = page.getByRole('button', { name: /תוצאות מיטוב/ });
    if (await disclosure.getAttribute('aria-expanded') === 'false') await disclosure.click();
    await expect(page.locator('#results-disclosure-body')).toContainText('התנהגות');
    await expect(page.locator('#results-disclosure-body')).not.toContainText('failed to render');
    await page.getByRole('button', { name: /למה הסידור הזה/ }).click();
    await expect(page.getByPlaceholder('חפש תלמיד…')).toBeVisible();
    const a = seats.nth(0), b = seats.nth(1);
    const originalA = await a.getAttribute('aria-label');
    const originalB = await b.getAttribute('aria-label');
    await a.click(); await b.click();
    await expect(a).not.toHaveAttribute('aria-label', originalA!);
    await expect(b).not.toHaveAttribute('aria-label', originalB!);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const newLabel = await a.getAttribute('aria-label');
    await page.waitForTimeout(650); // wait beyond the 400ms IndexedDB debounce
    await page.reload();
    await expect(page.locator('[data-seat-key]').nth(0)).toHaveAttribute('aria-label', newLabel!);
    await expect(page.locator('#seating-grid-export [data-room-feature]')).toHaveCount(2);
    expect(errors).toEqual([]);
  });
}
