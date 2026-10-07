import { test, expect } from '@playwright/test';
import { openApp, createSampleClass, runOptimization, flushStorage } from './helpers';

test('teacher can complete the Hebrew setup on a phone and return to a clean home', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.text().includes('validateDOMNesting')) errors.push(message.text()); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.waitForFunction(() => window.__ZUSTAND_STORE__?.persist.hasHydrated());
  await expect(page.locator('aside')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('header').getByTestId('print-button')).toHaveCount(0);
  await page.getByRole('button', { name: 'יצירת כיתה חדשה', exact: true }).click();
  await page.getByRole('textbox', { name: 'שמות התלמידים, שם אחד בכל שורה' }).fill('דנה כהן\nאדם לוי\nנועה חורי');
  await page.getByRole('button', { name: 'הוספת השמות לכיתה', exact: true }).click();
  await page.getByRole('button', { name: 'המשך: הכיתה', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'הגדרת החדר', exact: true })).toBeInViewport();
  await expect(page.getByTestId('room-plan-canvas')).toBeAttached();
  await page.getByRole('button', { name: 'המשך: כללים', exact: true }).click();
  await page.getByRole('button', { name: 'המשך: יצירה', exact: true }).click();
  await page.getByRole('button', { name: 'יצירת מפת ישיבה', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__ZUSTAND_STORE__.getState().result !== null)).toBe(true);
  // Printing stays reachable in the phone action menu.
  const preferences = page.locator('header button[aria-controls="display-preferences"]');
  await preferences.click();
  await expect(page.getByTestId('mobile-print-button')).toBeVisible();
  await preferences.click();
  await page.getByRole('button', { name: 'דף הבית', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'לכל תלמיד מקום. לכל צוות תמונה ברורה.' })).toBeVisible();
  await expect(page.getByTestId('print-button')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('aside')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('aside')).toHaveCSS('width', '0px');
  await expect(page.getByRole('heading', { name: 'לכל תלמיד מקום. לכל צוות תמונה ברורה.' }).locator('..')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: test.info().outputPath('hebrew-home-desktop.png'), fullPage: true });
});

test('fresh home starts in Hebrew, fits a phone and supports reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForFunction(() => window.__ZUSTAND_STORE__?.persist.hasHydrated());
  await page.evaluate(() => window.__ZUSTAND_STORE__.setState({ welcomeTipsDismissed: true, homeView: true }));
  await expect(page.locator('html')).toHaveAttribute('lang', 'he');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', {name:'לכל תלמיד מקום. לכל צוות תמונה ברורה.'})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('hebrew-home.png'), fullPage: true });
});

test('room plan persists through reload and changing its geometry clears stale results', async ({page}) => {
  await openApp(page); await createSampleClass(page); await runOptimization(page);
  await page.evaluate(() => {
    const store = window.__ZUSTAND_STORE__.getState();
    store.setLayoutDef({...store.layoutDef, roomFeatures:[{ id:'w',kind:'window',x:1,y:0.5 },{id:'d',kind:'door',x:0,y:0.8},{id:'t',kind:'teacher',x:0.8,y:0.1}]});
    store.setSidebarOpen(false);
  });
  expect(await page.evaluate(() => window.__ZUSTAND_STORE__.getState().result)).not.toBeNull();
  await expect(page.getByTestId('room-plan').last()).toBeVisible();
  await expect(page.getByTestId('room-plan').last().getByRole('img',{name:'Window',exact:true})).toBeVisible();
  await expect(page.locator('#seating-grid-export')).toHaveAttribute('dir','ltr');
  await flushStorage(page);
  await page.reload();
  await page.waitForFunction(() => window.__ZUSTAND_STORE__?.persist.hasHydrated());
  expect(await page.evaluate(() => window.__ZUSTAND_STORE__.getState().layoutDef.roomFeatures?.length)).toBe(3);
  await page.evaluate(() => { const s = window.__ZUSTAND_STORE__.getState(); s.setLayoutDef({...s.layoutDef,rows:5}); });
  expect(await page.evaluate(() => window.__ZUSTAND_STORE__.getState().result)).toBeNull();
});

test('hover analysis follows a manual move and opens the complete analysis', async ({page}) => {
  await openApp(page); await createSampleClass(page);
  await page.evaluate(() => window.__ZUSTAND_STORE__.getState().updateStudent('student-0',{requires_front_row:true}));
  await runOptimization(page);
  const target = await page.evaluate(() => {
    const store = window.__ZUSTAND_STORE__.getState();
    const seats = store.result!.layout.seats;
    const source = seats.find(s => s.student_id === 'student-0')!;
    const destination = seats.find(s => s.position.row === 3 && !s.student_id)!;
    const key = (seat: typeof source) => `${seat.position.row}-${seat.position.col}`;
    store.swapStudents(key(source),key(destination)); store.setSidebarOpen(false);
    return key(destination);
  });
  await page.locator(`[data-seat-key="${target}"]`).hover();
  await expect(page.getByTestId('placement-preview')).toContainText(/front/i);
  await page.getByRole('button',{name:'Open full analysis',exact:true}).click();
  await expect.poll(() => page.evaluate(() => window.__ZUSTAND_STORE__.getState().detailsTargetStudentId)).toBe('student-0');
  await expect(page.getByTestId('placement-preview')).toHaveCount(0);
});

test('student phone flow submits only personal responses and allows skipped items', async ({page}) => {
  let answers: Record<string, unknown> | null = null;
  await page.route('**/api/survey-response',async route => {
    if (route.request().method() === 'POST') {
      answers = route.request().postDataJSON().answers;
      await route.fulfill({json:{saved:true}});
    } else await route.fulfill({json:{language:'he',submitted:false,expiresAt:Date.now()+86400000,notice:{schoolName:'בית ספר לדוגמה',privacyEmail:'privacy@example.test',processors:'ספק בדיקה בישראל'}}});
  });
  await page.goto(`/#survey=${'a'.repeat(64)}`);
  await expect(page.getByRole('heading',{name:'המקום שבו נוח לי ללמוד'})).toBeVisible();
  await page.getByRole('button',{name:'קראתי, אפשר להתחיל',exact:true}).click();
  await page.getByRole('button',{name:'מלפנים',exact:true}).click();
  for (let i=0;i<8;i++) await page.getByRole('button',{name:'לשאלה הבאה',exact:true}).click();
  await page.getByRole('button',{name:'שלח',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('התשובות נשמרו');
  expect(answers).toMatchObject({frontPreference:'front',seatmates:[],helper:null,noise:null});
  await expect(page.getByTestId('optimize-button')).toHaveCount(0);
});
