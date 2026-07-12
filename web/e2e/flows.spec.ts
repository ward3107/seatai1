import { test, expect, type Page } from '@playwright/test';

/**
 * End-to-end smoke of the three highest-value flows that had no reliable
 * coverage: the setup wizard, optimize → grid render → print, and CSV import.
 *
 * These seed state through the Zustand store (exposed on `window.__ZUSTAND_STORE__`
 * in dev) rather than clicking through slow setup UI, then assert on both store
 * state and the rendered result. Interactive steps use stable `data-testid`
 * hooks so they don't rot as copy/markup changes.
 */

type SeedStudent = Record<string, unknown>;

function students(count: number): SeedStudent[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `s${i}`,
    name: `Student ${i + 1}`,
    gender: i % 2 === 0 ? 'female' : 'male',
    academic_level: 'proficient',
    academic_score: 60 + ((i * 7) % 40),
    behavior_level: 'good',
    behavior_score: 60 + ((i * 5) % 40),
    friends_ids: [],
    incompatible_ids: [],
    special_needs: [],
    requires_front_row: false,
    requires_quiet_area: false,
    has_mobility_issues: false,
    is_bilingual: false,
  }));
}

/** Suppress the auto-popping welcome-tips modal so it can't overlay the flow
 *  under test or collide with a `getByRole('dialog')` match. */
async function dismissTips(page: Page) {
  await page.evaluate(() => {
    const store = (window as unknown as { __ZUSTAND_STORE__: { setState: (p: Record<string, unknown>) => void } }).__ZUSTAND_STORE__;
    store.setState({ welcomeTipsDismissed: true });
  });
}

/** Seed a class and a small, fast optimizer config through the store. */
async function seedClass(page: Page, count: number) {
  await page.evaluate(
    ({ roster }) => {
      const store = (window as unknown as { __ZUSTAND_STORE__: { getState: () => Record<string, (...a: unknown[]) => void> } }).__ZUSTAND_STORE__;
      const s = store.getState();
      s.setStudents(roster);
      // Keep the GA run short so the test is quick and deterministic-ish.
      s.setConfig({
        populationSize: 20,
        maxGenerations: 15,
        crossoverRate: 0.8,
        mutationRate: 0.2,
        tournamentSize: 3,
        earlyStopPatience: 5,
      });
    },
    { roster: students(count) },
  );
}

function getState<T>(page: Page, read: (s: Record<string, unknown>) => T): Promise<T> {
  return page.evaluate(
    ({ src }) => {
      const store = (window as unknown as { __ZUSTAND_STORE__: { getState: () => Record<string, unknown> } }).__ZUSTAND_STORE__;
      return (new Function('s', `return (${src})(s)`))(store.getState());
    },
    { src: read.toString() },
  );
}

test.describe('Setup wizard', () => {
  test('advances through the steps and closes back to the workspace', async ({ page }) => {
    await page.goto('/');
    await dismissTips(page);
    await seedClass(page, 8);

    // Open the wizard through the store, then assert the UI took over.
    await page.evaluate(() => (window as unknown as { __ZUSTAND_STORE__: { getState: () => { startWizard: () => void } } }).__ZUSTAND_STORE__.getState().startWizard());
    await expect(page.getByRole('navigation', { name: /set ?up your class/i })).toBeVisible();
    expect(await getState(page, (s) => (s as { wizardActive: boolean }).wizardActive)).toBe(true);

    // Step forward (students are seeded, so the first step can advance).
    await page.getByRole('button', { name: /^next$/i }).first().click();
    await expect.poll(() => getState(page, (s) => (s as { wizardStep: number }).wizardStep)).toBeGreaterThan(0);

    // Close returns to the normal workspace.
    await page.evaluate(() => (window as unknown as { __ZUSTAND_STORE__: { getState: () => { closeWizard: () => void } } }).__ZUSTAND_STORE__.getState().closeWizard());
    expect(await getState(page, (s) => (s as { wizardActive: boolean }).wizardActive)).toBe(false);
  });
});

test.describe('Optimize → render → print', () => {
  test('produces a result, renders the grid, and opens the print dialog', async ({ page }) => {
    await page.goto('/');
    await dismissTips(page);
    await seedClass(page, 8);

    // The button gates on the worker being ready; wait for that, then run.
    const optimize = page.getByTestId('optimize-button');
    await expect(optimize).toBeEnabled({ timeout: 15000 });
    await optimize.click();

    // A result lands in the store and the exportable grid renders.
    await expect.poll(
      () => getState(page, (s) => (s as { result: unknown }).result !== null),
      { timeout: 20000 },
    ).toBe(true);
    await expect(page.locator('#seating-grid-export')).toBeVisible();

    // The print button appears once a result exists; the dialog opens and closes.
    await page.getByTestId('print-button').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('locks and unlocks a seat from the keyboard (L)', async ({ page }) => {
    await page.goto('/');
    await dismissTips(page);
    await seedClass(page, 8);
    const optimize = page.getByTestId('optimize-button');
    await expect(optimize).toBeEnabled({ timeout: 15000 });
    await optimize.click();
    await expect.poll(
      () => getState(page, (s) => (s as { result: unknown }).result !== null),
      { timeout: 20000 },
    ).toBe(true);

    // Arrow selects an occupied seat; L toggles its lock (previously only
    // reachable by mouse right-click / touch long-press).
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('l');
    await expect.poll(() => getState(page, (s) => (s as { lockedSeats: string[] }).lockedSeats.length)).toBe(1);
    await page.keyboard.press('l');
    await expect.poll(() => getState(page, (s) => (s as { lockedSeats: string[] }).lockedSeats.length)).toBe(0);
  });
});

test.describe('CSV import', () => {
  test('imports a roster from a CSV file into the store', async ({ page }) => {
    await page.goto('/');

    // Reveal the importer if it's collapsed, then upload through the hidden
    // file input (Playwright drives it directly regardless of visibility).
    const fileInput = page.locator('input[type="file"][accept*="csv"]').first();
    await fileInput.waitFor({ state: 'attached', timeout: 10000 });
    await fileInput.setInputFiles({
      name: 'roster.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(
        'name,gender,age,special_needs\n' +
          'Alice,female,10,ADHD\n' +
          'Bob,male,9,\n' +
          'Cara,female,10,dyslexia;anxiety\n',
      ),
    });

    // The three parsed students land in the store, with age + special needs.
    await expect.poll(() => getState(page, (s) => (s as { students: unknown[] }).students.length)).toBe(3);
    const names = await getState(page, (s) => (s as { students: { name: string }[] }).students.map((x) => x.name).sort());
    expect(names).toEqual(['Alice', 'Bob', 'Cara']);
    const cara = await getState(page, (s) => (s as { students: { name: string; age?: number; special_needs: unknown[] }[] }).students.find((x) => x.name === 'Cara'));
    expect((cara as { age?: number }).age).toBe(10);
    expect((cara as { special_needs: unknown[] }).special_needs).toHaveLength(2);
  });
});
