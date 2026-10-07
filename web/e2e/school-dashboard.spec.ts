import { test, expect, type Page } from '@playwright/test';
import { openApp, createSampleClass, getStudentNames } from './helpers';
import type { Membership, SchoolCommand, SchoolWorkspace } from '../src/features/school/types';

async function openDemo(page: Page) {
  await page.route('**/api/school', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ available: false, signedIn: false, memberships: [] }) }));
  await openApp(page);
  await page.evaluate(() => { location.hash = 'school'; });
  await page.getByRole('button', { name: 'Try the dashboards', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My classes', exact: true })).toBeVisible();
}
async function role(page: Page, value: 'teacher' | 'counselor' | 'principal') {
  await page.getByLabel('School and role', { exact: true }).selectOption(`demo-school:${value}`);
  await expect(page.getByRole('heading', { name: value === 'teacher' ? 'My classes' : value === 'counselor' ? 'Follow-up and support' : 'School overview', exact: true }).first()).toBeVisible();
  await expect(page.locator('.school-stat').first()).toBeVisible();
}
async function nav(page: Page, label: string) {
  const root = (page.viewportSize()?.width ?? 1280) >= 1024 ? page.locator('.school-sidebar') : page.locator('.school-bottom-nav');
  await root.getByRole('button', { name: label, exact: true }).click();
}

for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
  test.describe(`${viewport.width}px school dashboards`, () => {
    test.use({ viewport });
    test('completes referral, recommendation and outcome across roles with confidential notes separated', async ({ page }) => {
      test.setTimeout(60_000);
      await openDemo(page);
      await page.getByRole('button', { name: 'Refer to counselor', exact: true }).click();
      let dialog = page.getByRole('dialog');
      await dialog.getByLabel('Referral subject', { exact: true }).fill('Follow-up from this viewport');
      await dialog.getByLabel('Brief observation and useful strengths', { exact: true }).fill('Works well in small groups. Try short instructions.');
      await dialog.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await role(page, 'counselor'); await nav(page, 'Referrals and follow-up');
      await page.getByRole('button').filter({ hasText: 'Follow-up from this viewport' }).click();
      dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: 'Add confidential note', exact: true }).click();
      await dialog.getByLabel('Note content', { exact: true }).fill('Confidential content for the assigned counselor.');
      await dialog.getByRole('button', { name: 'Save', exact: true }).click();
      await page.getByRole('button').filter({ hasText: 'Follow-up from this viewport' }).click();
      await expect(dialog.getByText('Confidential content for the assigned counselor.', { exact: true })).toBeVisible();
      await dialog.getByRole('button', { name: 'Share recommendation with teacher', exact: true }).click();
      await dialog.getByLabel('What should happen in class?', { exact: true }).fill('Provide a quiet seat.');
      await dialog.getByLabel('Follow-up goal', { exact: true }).fill('Begin the task independently.');
      await dialog.getByLabel('Review date', { exact: true }).fill('2099-01-01');
      await dialog.getByRole('checkbox').check();
      await dialog.getByRole('button', { name: 'Save', exact: true }).click();
      await role(page, 'teacher'); await nav(page, 'Referrals and follow-up');
      await page.getByRole('button').filter({ hasText: 'Follow-up from this viewport' }).click();
      await expect(dialog.getByText('Provide a quiet seat.', { exact: true })).toBeVisible();
      await expect(page.getByTestId('school-private-notes')).toHaveCount(0);
      await expect(page.getByText('Confidential content for the assigned counselor.', { exact: true })).toHaveCount(0);
      await dialog.getByRole('button', { name: 'Record action and outcome', exact: true }).click();
      await dialog.getByLabel('What was tried and what changed?', { exact: true }).fill('The pupil began the task with less prompting.');
      await dialog.getByRole('button', { name: 'Save', exact: true }).click();
      await role(page, 'principal');
      await expect(page.getByText('Confidential content for the assigned counselor.', { exact: true })).toHaveCount(0);
      await expect(page.getByText('Follow-up from this viewport', { exact: true })).toHaveCount(0);
      await expect(page.getByText('Sample student A', { exact: true })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    });
    test('keeps class and full case dialogs in the viewport with reachable controls and focus', async ({ page }) => {
      await openDemo(page);
      await page.getByRole('button', { name: 'Open class', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByRole('heading', { name: 'Seating snapshot', exact: true })).toBeVisible();
      const close = dialog.getByRole('button', { name: 'Close', exact: true });
      const bounds = (await close.boundingBox())!;
      expect(bounds.width).toBeGreaterThanOrEqual(44); expect(bounds.height).toBeGreaterThanOrEqual(44);
      const modalBounds = (await dialog.boundingBox())!;
      expect(modalBounds.x).toBeGreaterThanOrEqual(0); expect(modalBounds.x + modalBounds.width).toBeLessThanOrEqual(viewport.width + 1);
      await close.focus(); await page.keyboard.press('Shift+Tab'); await expect(close).toBeFocused();
      await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Open class', exact: true })).toBeFocused();
    });
  });
}

test('demo uses no local pupil data, writes no sensitive cache, and returns to the existing class', async ({ page }) => {
  await openApp(page); await createSampleClass(page);
  const original = await getStudentNames(page);
  await page.route('**/api/school', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ available: false, signedIn: false, memberships: [] }) }));
  await page.evaluate(() => { location.hash = 'school'; });
  await page.getByRole('button', { name: 'Try the dashboards', exact: true }).click();
  await role(page, 'counselor'); await nav(page, 'Referrals and follow-up');
  await page.getByRole('button').filter({ hasText: 'Participation and concentration' }).click();
  await expect(page.getByTestId('school-private-notes')).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('Sample meeting note');
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('link', { name: 'Back to classroom seating', exact: true }).click();
  await expect(page.getByTestId('school-portal')).toHaveCount(0);
  expect(await getStudentNames(page)).toEqual(original);
});

test('Hebrew and Arabic dashboards remain RTL without horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await openDemo(page);
  for (const locale of ['he', 'ar'] as const) {
    await page.evaluate(language => window.__ZUSTAND_STORE__.getState().setUiLanguage(language), locale);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('.school-stat').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
});

test('connected UI requires MFA and explicitly shares only roster names and seating', async ({ page }) => {
  await openApp(page); await createSampleClass(page);
  await page.evaluate(() => {
    const state = window.__ZUSTAND_STORE__.getState();
    state.updateStudent('student-0', { notes: 'LOCAL CONFIDENTIAL NOTE', photo_url: 'data:image/png;base64,LOCALONLY' });
  });
  const member: Membership = { schoolId: '00000000-0000-4000-8000-000000000001', schoolName: 'Connected test school', role: 'teacher', displayName: 'Test teacher' };
  const workspace: SchoolWorkspace = { school: { id: member.schoolId, name: member.schoolName, notice: 'Test notice.' }, classes: [], referrals: [], recommendations: [], outcomes: [], privateNotes: [], members: [], audit: [], summary: { classes: 0, students: 0, newCases: 0, activeCases: 0, resolvedCases: 0, followUps: 0 } };
  let mfa = false;
  let published: Extract<SchoolCommand, { action: 'publish_class' }> | undefined;
  await page.route('**/api/school', async route => {
    const request = route.request().postDataJSON() as { action: string; command?: SchoolCommand };
    let data: unknown = { ok: true };
    if (request.action === 'bootstrap') data = { available: true, signedIn: true, memberships: [member], mfaRequired: !mfa };
    if (request.action === 'mfa_setup') data = { factorId: '00000000-0000-4000-8000-000000000002' };
    if (request.action === 'mfa_verify') mfa = true;
    if (request.action === 'workspace') data = workspace;
    if (request.action === 'command' && request.command?.action === 'publish_class') {
      published = request.command;
      workspace.classes = [{ id: '00000000-0000-4000-8000-000000000003', name: published.payload.name, studentCount: published.payload.students.length, students: published.payload.students.map((s, i) => ({ ...s, id: String(i) })), snapshot: published.payload.snapshot, updatedAt: new Date().toISOString() }];
      workspace.summary.classes = 1; workspace.summary.students = published.payload.students.length;
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.evaluate(() => { location.hash = 'school'; });
  await expect(page.getByRole('heading', { name: 'Verify staff account', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Set up or verify', exact: true }).click();
  await page.getByLabel('Six-digit verification code', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verify and continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My classes', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Share a class from this device', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Shared class name', { exact: true }).fill('Published test class');
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Share a class from this device', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Published test class', exact: true })).toBeVisible();
  expect(published?.payload.students).toHaveLength(8);
  expect(Object.keys(published!.payload.students[0]).sort()).toEqual(['localRef', 'name']);
  expect(JSON.stringify(published)).not.toContain('CONFIDENTIAL');
  expect(JSON.stringify(published)).not.toContain('LOCALONLY');
  expect(JSON.stringify(published)).not.toContain('academic_score');
});
