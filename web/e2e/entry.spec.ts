import { test, expect, type Page } from '@playwright/test';
import { openApp, createSampleClass, getStudentNames } from './helpers';
import type { Membership, SchoolWorkspace } from '../src/features/school/types';

async function openEntry(page: Page) {
  await openApp(page);
  await page.evaluate(() => window.__ZUSTAND_STORE__.getState().setSidebarOpen(false));
  await expect(page.locator('aside')).not.toBeInViewport();
}

test('role entrances explain access and reach the shared sign-in without a dashboard', async ({ page }) => {
  await page.route('**/api/school', route => route.fulfill({ json: { available: true, signedIn: false, memberships: [] } }));
  await openEntry(page);
  for (const role of ['teacher', 'counselor', 'principal']) {
    await page.locator(`.entry-role-${role}`).click();
    await expect(page).toHaveURL(new RegExp(`#school-${role}$`));
    await expect(page.locator('.entry-role-tabs a[aria-current="page"]')).toHaveAttribute('href', `#school-${role}`);
    await expect(page.getByLabel('Email address', { exact: true })).toBeVisible();
    const skip = page.getByRole('link', { name: 'Skip to content', exact: true });
    await skip.focus(); await skip.press('Enter');
    await expect(page.locator('#school-main')).toBeFocused();
    await expect(page).toHaveURL(new RegExp(`#school-${role}$`));
    await expect(page.locator('.school-class-bridge')).toHaveCount(0);
    await expect(page.locator('.school-sidebar')).toHaveCount(0);
    await page.getByRole('link', { name: 'Back to classroom seating', exact: true }).click();
  }
});

test('a principal entrance cannot elevate a teacher membership', async ({ page }) => {
  const member: Membership = { schoolId: 'school-one', schoolName: 'Test school', role: 'teacher', displayName: 'Teacher' };
  const workspace: SchoolWorkspace = { school: { id: member.schoolId, name: member.schoolName, notice: 'Test notice' }, classes: [], referrals: [], recommendations: [], outcomes: [], privateNotes: [], members: [], audit: [], summary: { classes: 0, students: 0, newCases: 0, activeCases: 0, resolvedCases: 0, followUps: 0 } };
  const requestedRoles: string[] = [];
  await page.route('**/api/school', async route => {
    const body = route.request().postDataJSON();
    if (body.action === 'workspace') requestedRoles.push(body.context.role);
    await route.fulfill({ json: body.action === 'bootstrap' ? { available: true, signedIn: true, memberships: [member] } : workspace });
  });
  await openEntry(page);
  await page.locator('.entry-role-principal').click();
  await expect(page.getByRole('heading', { name: 'My classes', exact: true })).toBeVisible();
  expect(requestedRoles.length).toBeGreaterThan(0);
  expect(requestedRoles.every(role => role === 'teacher')).toBe(true);
  await expect(page.getByLabel('School and role', { exact: true }).locator('option')).toHaveCount(1);
});

test('returning home preserves a class and cancelling a sample keeps it intact', async ({ page }) => {
  await openEntry(page); await createSampleClass(page);
  const original = await getStudentNames(page);
  await page.evaluate(() => { location.hash = 'home'; });
  await expect(page.locator('#entry-title')).toBeVisible();
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('.sample-class-button').filter({ hasText: '45' }).click();
  expect(await getStudentNames(page)).toEqual(original);
  await expect(page.locator('#entry-title')).toBeVisible();
});

for (const width of [320, 390, 768, 1440]) {
  test(`${width}px: entry and sign-in fit all four languages`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/api/school', route => route.fulfill({ json: { available: true, signedIn: false, memberships: [] } }));
    await openEntry(page);
    for (const language of ['he', 'ar', 'en', 'ru'] as const) {
      await page.evaluate(lang => window.__ZUSTAND_STORE__.getState().setUiLanguage(lang), language);
      await expect(page.locator('#entry-title')).toBeVisible();
      expect(await page.locator('.workspace-content').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      if (language === 'he' && (width === 390 || width === 1440)) {
        await page.screenshot({ animations: 'disabled', path: test.info().outputPath(`home-${width}.png`) });
        await page.locator('.entry-team').screenshot({ path: test.info().outputPath(`roles-${width}.png`) });
        await page.evaluate(() => window.__ZUSTAND_STORE__.getState().setTheme('dark'));
        await page.locator('#entry-title').scrollIntoViewIfNeeded();
        await page.screenshot({ animations: 'disabled', path: test.info().outputPath(`home-dark-${width}.png`) });
        await page.evaluate(() => window.__ZUSTAND_STORE__.getState().setTheme('light'));
      }
      await page.locator('.entry-role-teacher').click();
      await expect(page.locator('input[name="email"]')).toBeVisible();
      expect(await page.locator('.school-main').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      if (language === 'he' && (width === 390 || width === 1440)) await page.screenshot({ animations: 'disabled', path: test.info().outputPath(`login-${width}.png`) });
      await page.locator('.school-header a').first().click();
    }
  });
}
