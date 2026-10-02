import { test, expect } from '@playwright/test';
import { openApp, createSampleClass, runOptimization } from './helpers';

for (const language of ['en', 'he', 'ar', 'ru'] as const) {
  test(`${language}: paste names, review, and continue with keyboard on a tablet`, async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await openApp(page);
    await page.evaluate((lang) => {
      const s = window.__ZUSTAND_STORE__.getState();
      s.setUiLanguage(lang);
      s.startWizard();
    }, language);
    const input = page.getByRole('textbox', { name: {
      en: 'Student names, one per line', he: 'שמות התלמידים, שם אחד בכל שורה',
      ar: 'أسماء الطلاب، اسم واحد في كل سطر', ru: 'Имена учеников, по одному в строке',
    }[language] });
    await input.fill('דנה\tכהן\nأحمد علي\nדנה\tכהן');
    await expect(page.getByRole('tabpanel').getByRole('listitem')).toHaveCount(3);
    await input.press('Tab');
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => window.__ZUSTAND_STORE__.getState().students.length)).toBe(3);
    const ids = await page.evaluate(() => window.__ZUSTAND_STORE__.getState().students.map((s) => s.id));
    expect(new Set(ids).size).toBe(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(page.locator('html')).toHaveAttribute('dir', ['he', 'ar'].includes(language) ? 'rtl' : 'ltr');
  });
}

test('the visible review follows swaps and undo, independent of the results disclosure', async ({ page }) => {
  await openApp(page);
  await createSampleClass(page, 3);
  await page.evaluate(() => window.__ZUSTAND_STORE__.getState().setLayoutDef({ type: 'rows', rows: 1, cols: 3 }));
  await runOptimization(page);
  await page.evaluate(() => {
    const s = window.__ZUSTAND_STORE__.getState();
    const seats = [...s.result!.layout.seats].sort((a, b) => a.position.col - b.position.col);
    s.setConstraints({ ...s.constraints, separate_pairs: [[seats[0].student_id!, seats[1].student_id!]], hard: { separate_pairs: true } });
  });
  const review = page.getByTestId('classroom-review');
  await expect(review).toContainText('2 students need a seating review');
  await review.locator('summary').click();
  await expect(review).toContainText('2 students have an unmet required rule');
  const before = await page.evaluate(() => window.__ZUSTAND_STORE__.getState().result!.layout.seats.map((s) => s.student_id));
  await review.getByRole('button', { name: 'Suggest a small change' }).click();
  await expect(review).toContainText('decrease from 2 to 0');
  expect(await page.evaluate(() => window.__ZUSTAND_STORE__.getState().result!.layout.seats.map((s) => s.student_id))).toEqual(before);
  await review.getByRole('button', { name: 'Apply this swap' }).click();
  await expect(review).toContainText('No unmet seating requests detected');
  await page.evaluate(() => window.__ZUSTAND_STORE__.getState().undo());
  await expect(review).toContainText('2 students need a seating review');
  await review.locator('summary').click();
  await review.getByRole('button', { name: 'Suggest a small change' }).click();
  await expect(review.getByRole('button', { name: 'Apply this swap' })).toBeVisible();
  await page.evaluate(() => window.__ZUSTAND_STORE__.setState({ lockedSeats: ['0-0', '0-1', '0-2'] }));
  await expect(review.getByRole('button', { name: 'Apply this swap' })).toHaveCount(0);
  await review.getByRole('button', { name: 'Suggest a small change' }).click();
  await expect(review).toContainText('No improving two-seat swap found');
});
