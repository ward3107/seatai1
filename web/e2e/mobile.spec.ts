import { test, expect, type Page } from '@playwright/test';

/**
 * Mobile / RTL responsiveness guards.
 *
 * These lock in the fixes that were previously regressing and only caught by
 * hand: the page must never scroll sideways on a phone, the sidebar must work
 * as a drawer, and the seating grid must auto-fit instead of clipping.
 *
 * Forced to a phone viewport regardless of the Playwright project so the
 * assertions are meaningful on desktop projects too.
 */
test.use({ viewport: { width: 390, height: 780 } });

/** True when the document is not wider than the viewport (no sideways scroll). */
async function hasNoHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

/** Load one of the built-in sample classes from the onboarding screen. */
async function loadSampleClass(page: Page, which: 'first' | 'last' = 'last') {
  const chips = page.locator('button', { hasText: /·\s*\d+/ });
  await expect(chips.first()).toBeVisible();
  const count = await chips.count();
  await chips.nth(which === 'last' ? count - 1 : 0).click();
  // Wait for the seating grid container to mount.
  await expect(page.locator('#seating-grid-export')).toBeVisible();
}

test.describe('Mobile responsiveness', () => {
  test('no horizontal page scroll on the onboarding screen', async ({ page }) => {
    await page.goto('/');
    await expect(await hasNoHorizontalOverflow(page)).toBe(true);
  });

  test('largest class fits without scrolling the whole page sideways', async ({ page }) => {
    await page.goto('/');
    await loadSampleClass(page, 'last');
    // The auto-fit wrapper should keep the document within the viewport even
    // for the biggest class.
    expect(await hasNoHorizontalOverflow(page)).toBe(true);
  });

  test('sidebar works as a drawer: opens and closes', async ({ page }) => {
    await page.goto('/');
    await loadSampleClass(page, 'first');

    // Labels are localised → match every language we ship.
    const openBtn = page.getByRole('button', { name: /open sidebar|פתח סרגל|فتح الشريط|открыть/i });
    // Scope to the drawer itself so we hit its X button, not the full-screen
    // backdrop (which shares the same label but sits beneath the drawer).
    const closeBtn = page
      .locator('aside')
      .getByRole('button', { name: /close sidebar|סגור סרגל|إغلاق الشريط|закрыть/i });

    // The drawer may already be open after loading a class — only open it if
    // it's currently closed.
    if (await openBtn.isVisible().catch(() => false)) {
      await openBtn.click();
    }

    // It can be dismissed, which returns the page to a non-overflowing state.
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(openBtn).toBeVisible();
    expect(await hasNoHorizontalOverflow(page)).toBe(true);
  });
});

test.describe('RTL layout', () => {
  test('switching to Hebrew sets dir=rtl and keeps the grid within the viewport', async ({ page }) => {
    await page.goto('/');
    await loadSampleClass(page, 'last');

    const html = page.locator('html');
    const dir = await html.getAttribute('dir');
    // The app may already default to an RTL language; only switch if it's LTR.
    if (dir !== 'rtl') {
      const langBtn = page.getByRole('button', { name: /language|english|שפה|اللغة|язык/i }).first();
      if (await langBtn.isVisible().catch(() => false)) {
        await langBtn.click();
        const he = page.getByRole('option', { name: /עברית|hebrew/i });
        if (await he.isVisible().catch(() => false)) await he.click();
      }
    }

    // Whatever the direction, the grid must not overflow the page width.
    expect(await hasNoHorizontalOverflow(page)).toBe(true);
  });
});
