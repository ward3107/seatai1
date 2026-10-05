import { test, expect } from '@playwright/test';
import { openApp, createSampleClass, runOptimization } from './helpers';

test.beforeEach(async ({page}) => {
  await openApp(page); await createSampleClass(page);
  await page.evaluate(() => window.__ZUSTAND_STORE__.getState().setSidebarOpen(false));
  await runOptimization(page);
});

test('leaving a student dismisses its preview and moving between students keeps the current one', async ({page}) => {
  const seats = page.locator('[data-seat-key]').filter({hasText:/Student/});
  const popup = page.getByTestId('student-hover-popup');
  await seats.nth(0).hover(); await expect(popup).toBeVisible();
  await page.mouse.move(1,1); await expect(popup).toHaveCount(0);
  await seats.nth(0).hover(); await expect(popup).toBeVisible();
  await seats.nth(1).hover();
  const name = (await seats.nth(1).locator('p').innerText()).trim();
  await expect(popup.getByRole('heading',{name,exact:true})).toBeVisible();
  await page.waitForTimeout(350); // The first student's close timer must be canceled.
  await expect(popup.getByRole('heading',{name,exact:true})).toBeVisible();
  await page.keyboard.press('Escape'); await expect(popup).toHaveCount(0);
});

test('preview controls remain reachable, fit the viewport and close when the pointer leaves', async ({page}) => {
  const seat = page.locator('[data-seat-key]').filter({hasText:/Student/}).first();
  const popup = page.getByTestId('student-hover-popup');
  await seat.hover(); await expect(popup).toBeVisible();
  await popup.getByRole('button',{name:'Open full analysis',exact:true}).hover();
  await page.waitForTimeout(350);
  await expect(popup).toBeVisible();
  await expect.poll(()=>popup.evaluate(node=>{
    const r=node.getBoundingClientRect();return r.left>=0 && r.top>=0 && r.right<=innerWidth && r.bottom<=innerHeight;
  })).toBe(true);
  await page.screenshot({path:test.info().outputPath('student-preview.png')});
  await page.mouse.move(1,1); await expect(popup).toHaveCount(0);
});

test('dragging, canceling and scrolling cannot leave an old preview behind', async ({page}) => {
  const seat = page.locator('[data-seat-key]').filter({hasText:/Student/}).first();
  const popup = page.getByTestId('student-hover-popup');
  await seat.hover(); await expect(popup).toBeVisible();
  const rect = (await seat.boundingBox())!;
  await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();
  await page.mouse.move(rect.x+rect.width/2+20,rect.y+rect.height/2+20,{steps:5});
  await expect(page.getByTestId('drag-ghost')).toBeVisible();await expect(popup).toHaveCount(0);
  await page.keyboard.press('Escape');await page.mouse.up();await expect(popup).toHaveCount(0);
  await page.mouse.move(1,1);await seat.hover();await expect(popup).toBeVisible();
  await page.mouse.wheel(0,100);await expect(popup).toHaveCount(0);
});
