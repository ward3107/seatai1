import { test, expect } from '@playwright/test';
import { openApp, flushStorage } from './helpers';

const code = '00000000-0000-4000-8000-000000000001';
const bootstrap = { available: true, signedIn: false, memberships: [] };

test('password visibility is optional, resets between forms and recovery only sends the email', async ({ page }) => {
  const sent: Record<string, unknown>[] = [];
  let throttled = true;
  await page.route('**/api/school', async route => {
    const body = route.request().postDataJSON();
    if (body.action === 'recover_password') {
      sent.push(body);
      if (throttled) { throttled = false; await route.fulfill({ status: 429, body: 'Too many requests' }); return; }
    }
    await route.fulfill({ json: body.action === 'bootstrap' ? bootstrap : { ok: true } });
  });
  await openApp(page);
  await page.goto('/#school-teacher');
  const password = page.getByLabel('Password — at least 12 characters', { exact: true });
  await password.fill('Synthetic-test-password');
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide password', exact: true }).press('Enter');
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByLabel('Email address', { exact: true }).fill('teacher@example.test');
  await page.getByRole('button', { name: 'Forgot password?', exact: true }).click();
  await expect(page.getByLabel('Email address', { exact: true })).toHaveValue('teacher@example.test');
  await expect(page.locator('input[name="password"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Send recovery link', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Send recovery link', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'If an account exists' })).toBeVisible();
  expect(sent).toEqual(Array(2).fill({ action: 'recover_password', email: 'teacher@example.test' }));
  await page.getByRole('button', { name: 'Back to sign in', exact: true }).click();
  await expect(password).toHaveValue('');
  await expect(password).toHaveAttribute('type', 'password');
});

test('a callback clears its code, exchanges once and validates confirmation before saving', async ({ page }) => {
  const actions: Record<string, unknown>[] = [];
  await page.route('**/api/school', async route => {
    const body = route.request().postDataJSON(); actions.push(body);
    await route.fulfill({ json: body.action === 'bootstrap' ? bootstrap : { ok: true } });
  });
  await openApp(page); await flushStorage(page); actions.length = 0;
  await page.goto(`/?code=${code}#school-reset`);
  await expect(page.getByLabel('New password', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/#school-reset$/);
  expect(actions).toEqual([{ action: 'exchange_recovery', code }]);
  await page.getByLabel('New password', { exact: true }).fill('Synthetic-new-password');
  await page.getByLabel('Confirm new password', { exact: true }).fill('Not-matching-password');
  await page.getByRole('button', { name: 'Save new password', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(/do not match/);
  expect(actions).toHaveLength(1);
  await page.getByLabel('Confirm new password', { exact: true }).fill('Synthetic-new-password');
  await page.getByRole('button', { name: 'Save new password', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText(/password has been updated/);
  expect(actions.at(-1)).toEqual({ action: 'reset_password', password: 'Synthetic-new-password' });
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to sign in', exact: true }).click();
  await expect(page.getByLabel('Email address', { exact: true })).toBeVisible();
});

test('reset page reload resumes the separate recovery cookie; expired and provider error links are recoverable', async ({ page }) => {
  let expired = false;
  const actions: string[] = [];
  await page.route('**/api/school', async route => {
    const { action } = route.request().postDataJSON(); actions.push(action);
    await route.fulfill({ status: expired ? 401 : 200, json: expired ? { error: 'unauthorized' } : { ok: true } });
  });
  await openApp(page);
  await flushStorage(page);
  await page.goto('/#school-reset');
  await expect(page.getByLabel('New password', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('New password', { exact: true })).toBeVisible();
  expect(actions.filter(action => action === 'recovery_status')).toHaveLength(2);
  expired = true;
  await page.reload();
  await expect(page.getByRole('alert')).toHaveText(/expired/);
  await expect(page.getByRole('link', { name: 'Back to sign in', exact: true })).toBeVisible();
  actions.length = 0;
  await page.goto('/?error=access_denied&error_code=otp_expired#school-reset');
  await expect(page.getByRole('alert')).toHaveText(/expired/);
  await expect(page).toHaveURL(/\/#school-reset$/);
  expect(actions).toHaveLength(0);
});

test('recovery verifies an existing authenticator before showing the new password form', async ({ page }) => {
  const actions: string[] = [];
  await page.route('**/api/school', async route => {
    const { action } = route.request().postDataJSON(); actions.push(action);
    await route.fulfill({ json: { ok: true, mfaRequired: action === 'recovery_status' } });
  });
  await openApp(page); await page.goto('/#school-reset');
  await expect(page.getByLabel('Six-digit verification code', { exact: true })).toBeVisible();
  await expect(page.locator('input[name="password"]')).toHaveCount(0);
  await page.getByLabel('Six-digit verification code', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verify and continue', exact: true }).click();
  await expect(page.getByLabel('New password', { exact: true })).toBeVisible();
  expect(actions).toEqual(['recovery_status', 'recovery_verify']);
});

for (const width of [320, 1440]) {
  test(`${width}px: password controls fit all languages and dark mode`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/api/school', route => route.fulfill({ json: bootstrap }));
    await openApp(page); await page.goto('/#school-teacher');
    for (const language of ['he', 'ar', 'en', 'ru'] as const) {
      await page.evaluate(lang => window.__ZUSTAND_STORE__.getState().setUiLanguage(lang), language);
      await page.evaluate(() => window.__ZUSTAND_STORE__.getState().setTheme('dark'));
      const toggle = page.locator('.school-password-toggle');
      await expect(toggle).toBeVisible();
      const bounds = await toggle.boundingBox();
      expect(Math.round(bounds!.width)).toBeGreaterThanOrEqual(44);
      expect(Math.round(bounds!.height)).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      if (language === 'he') await page.locator('.entry-auth-form').screenshot({ animations: 'disabled', path: test.info().outputPath(`password-login-${width}.png`) });
    }
  });
}
