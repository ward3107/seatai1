import { test, expect } from '@playwright/test';
import { openApp, createSampleClass, runOptimization } from './helpers';

test('pupil page is isolated from teacher storage, discloses purpose and deletes its cloud answer', async ({page}) => {
  const urls: string[] = [];
  page.on('request', request => urls.push(request.url()));
  let deleted = false;
  await page.route('**/api/survey-response', async route => {
    if (route.request().method() === 'DELETE') { deleted = true; await route.fulfill({json:{deleted:true}}); }
    else await route.fulfill({json:{language:'he',submitted:true,expiresAt:Date.now()+10000,notice:{schoolName:'בית ספר בדיקה',privacyEmail:'privacy@example.test',processors:'ספק לדוגמה בישראל'}}});
  });
  await page.goto(`/#survey=${'d'.repeat(64)}`);
  await expect(page.getByRole('status')).toContainText('התשובות נשמרו');
  expect(await page.evaluate(() => typeof window.__ZUSTAND_STORE__)).toBe('undefined');
  expect(await page.evaluate(() => localStorage.getItem('seatai-storage'))).toBeNull();
  expect(urls.some(url => /fonts\.google|anthropic|TeacherApplication/.test(url))).toBe(false);
  await page.getByText('לפני שמתחילים: התשובות שלך', {exact:true}).click();
  await expect(page.getByText('בית ספר בדיקה',{exact:true})).toBeVisible();
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button',{name:'מחיקת התשובות שלי מהענן',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('הקישור בוטל');
  expect(deleted).toBe(true);
});

test('device erasure removes saved pupil data without clearing unrelated browser storage', async ({page}) => {
  await openApp(page); await createSampleClass(page);
  await page.evaluate(() => {
    localStorage.setItem('unrelated-setting','keep');
    localStorage.setItem('seatai-storage',JSON.stringify({state:{students:[{name:'old pupil'}]}}));
    window.__ZUSTAND_STORE__.getState().setSidebarOpen(false);
  });
  await page.getByRole('button', { name: 'Display preferences', exact: true }).click();
  await page.getByRole('button', { name: 'Privacy & accessibility', exact: true }).click();
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button',{name:'Delete SeatAI data on this device',exact:true}).click();
  await expect(page.getByRole('heading',{name:'לכל תלמיד מקום. לכל צוות תמונה ברורה.'})).toBeVisible();
  expect(await page.evaluate(() => window.__ZUSTAND_STORE__.getState().students)).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('seatai-storage'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('unrelated-setting'))).toBe('keep');
});

test('classroom printout hides attainment, accommodations and warnings by default', async ({page}) => {
  await openApp(page); await createSampleClass(page);
  await page.evaluate(() => window.__ZUSTAND_STORE__.getState().updateStudent('student-0',{academic_level:'advanced',has_mobility_issues:true}));
  await runOptimization(page);
  await page.getByTestId('print-button').click();
  const chart = page.locator('#print-content');
  await expect(chart).not.toContainText('▲');
  await expect(chart).not.toContainText('♿');
  await page.getByText('Additional teacher options', { exact: true }).click();
  await page.getByRole('checkbox',{name:'Teacher only: show needs and attainment markers'}).check();
  await expect(chart).toContainText('▲');
});

test('CSV shares seating positions without exporting the pupil profile', async ({page}) => {
  await openApp(page); await createSampleClass(page);
  await page.evaluate(() => window.__ZUSTAND_STORE__.getState().updateStudent('student-0',{notes:'private teacher note',has_mobility_issues:true}));
  await runOptimization(page);
  await page.getByRole('button',{name:'Export',exact:true}).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem').filter({hasText:'CSV'}).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const csv = Buffer.concat(chunks).toString('utf8');
  expect(csv.split('\n')[0]).toBe('row,col,name');
  expect(csv).toContain('Student 1');
  expect(csv).not.toMatch(/private teacher note|mobility|academic|behavior/);
});
