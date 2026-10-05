import { test, expect, type Page } from '@playwright/test';
import { openApp, createSampleClass, runOptimization, switchLanguage } from './helpers';

test.use({ viewport: { width: 390, height: 780 } });
test.beforeEach(async ({ page }) => openApp(page));

async function noOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

async function closeSidebar(page: Page) {
  if (await page.locator('aside').getAttribute('aria-hidden') === 'false') await page.locator('aside').getByRole('button', { name: 'Close sidebar', exact: true }).click();
}

test('onboarding does not scroll horizontally', async ({ page }) => {
  await closeSidebar(page);
  await expect(page.getByRole('button', { name: /create a new class/i })).toBeVisible();
  await noOverflow(page);
});

test('a large generated class fits the viewport', async ({ page }) => {
  await createSampleClass(page, 30);
  await runOptimization(page);
  await closeSidebar(page);
  await noOverflow(page);
});

test('the sidebar opens and closes as a drawer', async ({ page }) => {
  await createSampleClass(page);
  await closeSidebar(page);
  await page.getByRole('button', { name: 'Open sidebar', exact: true }).click();
  await expect(page.locator('aside')).toHaveAttribute('aria-hidden', 'false');
  await closeSidebar(page);
  await expect(page.locator('aside')).toHaveAttribute('inert', '');
  await noOverflow(page);
});

for (const language of ['he', 'ar'] as const) {
  test(`${language}: RTL grid stays within the viewport`, async ({ page }) => {
    await createSampleClass(page, 30);
    await runOptimization(page);
    await closeSidebar(page);
    await switchLanguage(page, language);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await noOverflow(page);
  });
}

test('touch selection and long-press drag move students without opening a drawer', async ({ page, context }) => {
  await createSampleClass(page);
  await runOptimization(page);
  await closeSidebar(page);
  await expect(page.getByRole('button', { name: 'Click', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const keys = await page.evaluate(() => window.__ZUSTAND_STORE__.getState().result!.layout.seats.filter(s => s.student_id).slice(0, 2).map(s => `${s.position.row}-${s.position.col}`));
  const a = page.locator(`[data-seat-key="${keys[0]}"]`), b = page.locator(`[data-seat-key="${keys[1]}"]`);
  const original = await a.getAttribute('aria-label');
  await a.tap(); await b.tap();
  await expect(a).not.toHaveAttribute('aria-label', original!);
  await page.getByRole('button', { name: 'Drag', exact: true }).tap();
  await a.scrollIntoViewIfNeeded();
  const rectA = (await a.boundingBox())!, rectB = (await b.boundingBox())!;
  const id = await page.evaluate(key => window.__ZUSTAND_STORE__.getState().result!.layout.seats.find(s => `${s.position.row}-${s.position.col}` === key)!.student_id, keys[0]);
  const touch = await context.newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rectA.x + rectA.width / 2, y: rectA.y + rectA.height / 2 }] });
  await page.waitForTimeout(230); // activation requires an intentional 180ms hold
  await expect(page.getByTestId('drag-ghost')).toBeVisible();
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: rectB.x + rectB.width / 2, y: rectB.y + rectB.height / 2 }] });
  await expect(b.getByText(/^[✓✕]$/)).toBeVisible();
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(key => window.__ZUSTAND_STORE__.getState().result!.layout.seats.find(s => `${s.position.row}-${s.position.col}` === key)!.student_id, keys[1])).toBe(id);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('room features can be dragged by touch and the integrated map stays inside the phone viewport',async({page,context})=>{
  await createSampleClass(page);
  await page.getByRole('tab',{name:'Room',exact:true}).tap();
  await page.locator('button[aria-controls="layout-panel-body"]').tap();
  const editor=page.getByTestId('room-plan-editor');
  await editor.getByRole('button',{name:'+ Door',exact:true}).tap();
  const door=editor.getByRole('button',{name:'Door',exact:true});await door.scrollIntoViewIfNeeded();
  const rect=(await door.boundingBox())!,canvas=(await editor.getByTestId('room-plan-canvas').boundingBox())!;
  const touch=await context.newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x+rect.width/2,y:rect.y+rect.height/2}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:canvas.x+2,y:canvas.y+canvas.height*0.8}]});
  await expect(editor.locator('[data-feature-kind="door"]')).toHaveAttribute('data-wall','left');
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect.poll(()=>page.evaluate(()=>window.__ZUSTAND_STORE__.getState().layoutDef.roomFeatures![0].x)).toBe(0);
  await runOptimization(page);await noOverflow(page);
  await expect(page.getByTestId('room-plan')).toHaveCount(1);
  await page.screenshot({path:test.info().outputPath('room-plan-phone.png'),fullPage:true});
});
