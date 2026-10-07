import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('a direct school visit detects and accepts a deployment without leaving the portal', async ({ page }) => {
  const swPath = resolve('dist/sw.js');
  const original = await readFile(swPath, 'utf8');
  try {
    await page.goto('/#school');
    await expect(page.getByTestId('school-portal')).toBeVisible();
    await page.evaluate(async () => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await writeFile(swPath, original + `\n// School deployment ${Date.now()}\n`);
    await page.evaluate(async () => { const registration = await navigator.serviceWorker.getRegistration(); await registration!.update(); });
    const banner = page.getByTestId('app-update-banner');
    await expect(banner).toBeVisible();
    await Promise.all([page.waitForEvent('load'), banner.getByRole('button', { name: 'שמירה ורענון', exact: true }).click()]);
    await expect(banner).toHaveCount(0);
    await expect(page.getByTestId('school-portal')).toBeVisible();
    expect(new URL(page.url()).hash).toBe('#school');
  } finally {
    await writeFile(swPath, original);
  }
});

test('a deployment offers refresh, keeps the classroom open and preserves the unified room after acceptance',async({page})=>{
  const swPath=resolve('dist/sw.js');
  const original=await readFile(swPath,'utf8');
  try {
    await page.goto('/');
    await page.evaluate(async()=>navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
    await page.getByRole('button',{name:/30/}).click();
    await page.getByRole('button',{name:'הבנתי',exact:true}).click();
    await page.getByTestId('optimize-button').click();
    const seats=page.locator('[data-seat-key]');
    await expect(seats.filter({hasText:'Alice'})).toHaveCount(1);
    await page.getByRole('button',{name:'פתח סרגל צד',exact:true}).click();
    await page.getByRole('tab',{name:'החדר',exact:true}).click();
    await page.locator('button[aria-controls="layout-panel-body"]').click();
    await page.getByTestId('room-plan-editor').getByRole('button',{name:'+ חלון',exact:true}).click();
    await page.locator('aside').getByRole('button',{name:'סגור סרגל צד',exact:true}).click();
    await writeFile(swPath,original+`\n// Simulated deployment ${Date.now()}\n`);
    await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r!.update();});
    const banner=page.getByTestId('app-update-banner');await expect(banner).toBeVisible();
    await expect(page.getByTestId('room-plan')).toHaveCount(1);
    await expect(page.locator('#seating-grid-export [data-room-feature]')).toHaveCount(1);
    await seats.nth(0).click();await seats.nth(1).click();
    const movedLabel=await seats.nth(0).getAttribute('aria-label');
    await Promise.all([page.waitForEvent('load'),banner.getByRole('button',{name:'שמירה ורענון',exact:true}).click()]);
    await expect(banner).toHaveCount(0);
    await expect(seats.nth(0)).toHaveAttribute('aria-label',movedLabel!);
    await expect(page.getByTestId('room-plan')).toHaveCount(1);
    await expect(page.locator('#seating-grid-export [data-room-feature]')).toHaveCount(1);
  } finally {
    await writeFile(swPath,original);
  }
});
