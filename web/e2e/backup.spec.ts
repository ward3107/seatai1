import { test, expect } from '@playwright/test';
import { openApp, createSampleClass, openProjects, getStudentNames, flushStorage } from './helpers';

test('backup restores a roster on another browser and survives reload', async ({ page, browser }) => {
  await openApp(page);
  await createSampleClass(page);
  const names = await getStudentNames(page);
  await openProjects(page);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Backup all data', exact: true }).click();
  const download = await pending;
  const path = await download.path();
  expect(path).toBeTruthy();
  const context = await browser.newContext({ baseURL: new URL(page.url()).origin });
  try {
    const target = await context.newPage();
    await openApp(target);
    await createSampleClass(target, 2);
    await openProjects(target);
    const input = target.locator('input[type="file"][accept="application/json,.json"]');
    await input.setInputFiles(path!);
    const dialog = target.getByRole('dialog', { name: 'Replace your current data?' });
    await expect(dialog).toBeVisible();
    expect(await getStudentNames(target)).toHaveLength(2);
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect(await getStudentNames(target)).toHaveLength(2);
    await input.setInputFiles(path!);
    await dialog.getByRole('button', { name: 'Replace data', exact: true }).click();
    await expect.poll(() => getStudentNames(target)).toEqual(names);
    await flushStorage(target);
    await target.reload();
    await target.waitForFunction(() => window.__ZUSTAND_STORE__?.persist.hasHydrated());
    expect(await getStudentNames(target)).toEqual(names);
  } finally {
    await context.close();
  }
});

test('invalid backup preserves the current class', async ({ page }) => {
  await openApp(page);
  await createSampleClass(page);
  const names = await getStudentNames(page);
  await openProjects(page);
  await page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({
    name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{broken'),
  });
  await expect(page.getByText("Couldn't read the file (not valid JSON).", { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await getStudentNames(page)).toEqual(names);
});
