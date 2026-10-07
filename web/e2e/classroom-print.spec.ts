import { test, expect, type Download } from '@playwright/test';
import { openApp, createSampleClass, runOptimization } from './helpers';
import type { LayoutDef } from '../src/core/layouts';

async function bytes(download: Download): Promise<Buffer> {
  const stream = (await download.createReadStream())!;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

for (const width of [390, 1440]) {
  test(`complete named chart prints and downloads without viewport clipping at ${width}px`, async ({ page, browserName }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    await openApp(page); await createSampleClass(page, 32);
    await page.evaluate(() => {
      const s = window.__ZUSTAND_STORE__.getState();
      s.setLayoutDef({ type: 'rows', rows: 4, cols: 8, roomFeatures: [{ id: 'door', kind: 'door', x: 1, y: 0.85 }, { id: 'window', kind: 'window', x: 0, y: 0.5 }] });
      s.setStudents(s.students.map((student, i) => ({ ...student, name: i % 2 ? `محمد عبد الرحمن الخطيب ${i + 1}` : `נועה אביגיל כהן לוי ${i + 1}`, notes: 'PRIVATE-PRINT-NOTE', has_mobility_issues: true, academic_level: 'advanced' })));
      s.setUiLanguage('he'); s.setSidebarOpen(false); s.setZoomLevel(1.5);
    });
    await runOptimization(page);
    if (width < 640) await page.locator('header button[aria-controls="display-preferences"]').click();
    const button = page.getByTestId(width < 1024 ? 'mobile-print-button' : 'print-button');
    await button.click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('שם הכיתה / כותרת', { exact: true }).fill('כיתה ז׳2 — מפת הישיבה');
    const chart = page.locator('#print-content');
    await expect(chart.locator('[data-chart-seat]')).toHaveCount(32);
    await expect(chart.locator('[data-chart-feature="door"]')).toHaveCount(1);
    await expect(chart).not.toContainText('PRIVATE-PRINT-NOTE');
    await expect(chart).not.toContainText('▲'); await expect(chart).not.toContainText('♿');
    const actualNames = await page.evaluate(() => window.__ZUSTAND_STORE__.getState().students.map(student => student.name).sort());
    const chartNames = await chart.locator('[data-chart-seat] title').allTextContents();
    expect(chartNames.map(name => name.replace(/^מקום \d+: /, '')).sort()).toEqual(actualNames);
    const original = await chart.innerHTML();
    await page.setViewportSize({ width: width === 390 ? 1440 : 390, height: 900 });
    await expect(chart).toHaveJSProperty('innerHTML', original);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const pdfPromise = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'שמור כ-PDF', exact: true }).click();
    const pdf = await pdfPromise; const pdfBytes = await bytes(pdf);
    expect(pdfBytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect((pdfBytes.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length).toBe(1);
    expect(pdfBytes.length).toBeGreaterThan(30_000);
    await pdf.saveAs(test.info().outputPath('named-classroom.pdf'));
    await page.setViewportSize({ width: 1440, height: 900 });
    await chart.screenshot({ path: test.info().outputPath('named-classroom.png') });
    if (browserName === 'chromium') {
      await page.emulateMedia({ media: 'print' });
      await expect(page.locator('#root')).toBeHidden();
      await expect(page.locator('.seating-print-controls')).toBeHidden();
      const printed = await page.pdf({ preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false, path: test.info().outputPath('browser-printed-classroom.pdf') });
      expect((printed.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length).toBe(1);
      await page.emulateMedia({ media: 'screen' });
    }
    await dialog.getByRole('button', { name: 'סגור', exact: true }).click();
    if (browserName === 'chromium') {
      await page.emulateMedia({ media: 'print' });
      await expect(page.locator('#root')).toBeVisible();
      await page.emulateMedia({ media: 'screen' });
    }
    // Direct PNG export also uses the clean whole page, with a fixed 300-dpi size.
    await page.getByRole('button', { name: 'ייצוא', exact: true }).click();
    const pngPromise = page.waitForEvent('download');
    await page.getByRole('menuitem').filter({ hasText: 'PNG' }).click();
    const png = await bytes(await pngPromise);
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(3509); expect(png.readUInt32BE(20)).toBe(2481);
  });
}

test('all room shapes retain names, centered custom rows, and readable unclipped RTL text', async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page); await createSampleClass(page, 24); await runOptimization(page);
  for (const layout of [
    { type: 'custom-rows', rows: 4, cols: 4, customRowSizes: [4, 8, 6, 10], roomFeatures: [] },
    { type: 'clusters', rows: 4, cols: 6, clusterSize: 2, roomFeatures: [] },
    { type: 'u-shape', rows: 10, cols: 8, roomFeatures: [] },
    { type: 'circle', rows: 4, cols: 6, roomFeatures: [] },
  ] satisfies LayoutDef[]) {
    await page.evaluate(async layout => {
      const modulePath = '/src/core/layouts.ts';
      const { generateSlots } = await import(/* @vite-ignore */ modulePath);
      const s = window.__ZUSTAND_STORE__.getState(); const previous = s.result!;
      const seats = generateSlots(layout).map((slot: { row: number; col: number; x: number; y: number; isFront: boolean }, index: number) => ({ position: { row: slot.row, col: slot.col, x: slot.x, y: slot.y, is_front_row: slot.isFront, is_near_teacher: false }, student_id: s.students[index]?.id, is_empty: !s.students[index] }));
      s.setLayoutDef(layout); s.setResult({ ...previous, layout: { ...previous.layout, seats, rows: layout.rows, cols: layout.cols, total_seats: seats.length }, warnings: ['PRIVATE-WARNING'] });
      s.setUiLanguage('ar');
    }, layout);
    await page.getByTestId('print-button').click();
    const chart = page.locator('#print-content');
    await expect(chart).not.toContainText('PRIVATE-WARNING');
    expect(await chart.locator('[data-chart-seat] title').count()).toBeGreaterThanOrEqual(24);
    const overflow = await chart.evaluate(node => Array.from(node.querySelectorAll('g[data-chart-seat]')).some(group => {
      const boxes = Array.from(group.querySelectorAll('rect')).map(rect => rect.getBBox());
      return Array.from(group.querySelectorAll('text')).some(text => {
        const box = text.getBBox();
        return !boxes.some(rect => box.x >= rect.x - 1 && box.x + box.width <= rect.x + rect.width + 1 && box.y >= rect.y - 1 && box.y + box.height <= rect.y + rect.height + 1);
      });
    }));
    expect(overflow).toBe(false);
    await chart.screenshot({ path: test.info().outputPath(`print-${layout.type}.png`) });
    await page.getByRole('dialog').getByRole('button', { name: 'إغلاق', exact: true }).click();
  }
});
