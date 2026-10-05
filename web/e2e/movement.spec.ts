import { test, expect, type Page } from '@playwright/test';
import { openApp, createSampleClass, runOptimization } from './helpers';

async function occupiedAndEmpty(page: Page) {
  return page.evaluate(() => {
    const seats = window.__ZUSTAND_STORE__.getState().result!.layout.seats;
    const key = (s: typeof seats[number]) => `${s.position.row}-${s.position.col}`;
    return { source: key(seats.find(s => s.student_id)!), empty: key(seats.find(s => !s.student_id)!), id: seats.find(s => s.student_id)!.student_id! };
  });
}
async function occupant(page: Page, key: string) {
  return page.evaluate(key => window.__ZUSTAND_STORE__.getState().result!.layout.seats.find(s => `${s.position.row}-${s.position.col}` === key)?.student_id, key);
}
test.beforeEach(async ({ page }) => {
  await openApp(page); await createSampleClass(page); await runOptimization(page);
  await page.evaluate(() => window.__ZUSTAND_STORE__.getState().setSidebarOpen(false));
  await expect(page.locator('aside')).toHaveAttribute('inert', '');
});

test('select and move to an empty seat, undo and redo', async ({ page }) => {
  const { source, empty, id } = await occupiedAndEmpty(page);
  await page.locator(`[data-seat-key="${source}"]`).click();
  await page.locator(`[data-seat-key="${empty}"]`).click();
  await expect.poll(() => occupant(page, empty)).toBe(id);
  await expect.poll(() => occupant(page, source)).toBeUndefined();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo (Ctrl+Z)', exact: true }).click();
  await expect.poll(() => occupant(page, source)).toBe(id);
  await page.getByRole('button', { name: 'Redo (Ctrl+Y)', exact: true }).click();
  await expect.poll(() => occupant(page, empty)).toBe(id);
});

test('keyboard moves the selected student without opening details', async ({ page }) => {
  const { source, empty, id } = await occupiedAndEmpty(page);
  await page.locator(`[data-seat-key="${source}"]`).focus();
  await page.keyboard.press('Space');
  await expect(page.locator(`[data-seat-key="${source}"]`)).toHaveAttribute('aria-pressed', 'true');
  await page.locator(`[data-seat-key="${empty}"]`).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => occupant(page, empty)).toBe(id);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('a locked destination cannot be changed and can be unlocked visibly', async ({ page }) => {
  const { source, empty, id } = await occupiedAndEmpty(page);
  await page.evaluate(key => window.__ZUSTAND_STORE__.getState().toggleLockSeat(key), empty);
  await page.locator(`[data-seat-key="${source}"]`).click();
  await page.locator(`[data-seat-key="${empty}"]`).click();
  expect(await occupant(page, source)).toBe(id);
  expect(await occupant(page, empty)).toBeUndefined();
  await page.getByRole('button', { name: 'Cancel selection', exact: true }).click();
  await page.locator(`[data-seat-key="${empty}"]`).click();
  await page.getByRole('button', { name: 'Unlock seat', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__ZUSTAND_STORE__.getState().lockedSeats.length)).toBe(0);
});

test('dragging outside the map leaves the student in place', async ({ page }) => {
  const { source, id } = await occupiedAndEmpty(page);
  const card = page.locator(`[data-seat-key="${source}"]`);
  await card.scrollIntoViewIfNeeded();
  await card.hover(); const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2 + 12, { steps: 5 });
  await expect(page.getByTestId('drag-ghost')).toBeVisible();
  await page.mouse.move(2, 2, { steps: 8 }); await page.mouse.up();
  expect(await occupant(page, source)).toBe(id);
  await expect(page.getByTestId('drag-ghost')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await card.click(); await expect(card).toHaveAttribute('aria-pressed', 'true');
});
