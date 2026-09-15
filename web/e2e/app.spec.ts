import { test, expect, type Page } from '@playwright/test';
import { openApp, createSampleClass, runOptimization, switchLanguage, openProjects, getStudentNames, flushStorage } from './helpers';

test.beforeEach(async ({ page }) => openApp(page));

test.describe('Language switching', () => {
  test('switches to Hebrew and applies RTL', async ({ page }) => {
    await switchLanguage(page, 'he');
  });
  test('persists the language across reloads', async ({ page }) => {
    await switchLanguage(page, 'he');
    await flushStorage(page);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'he');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
});

test.describe('Onboarding', () => {
  test('starts the guided setup for a new class', async ({ page }) => {
    await page.getByRole('button', { name: /get started/i }).click();
    await expect(page.getByRole('navigation', { name: /set ?up your class/i })).toBeVisible();
  });
  test('restores a returning teacher roster', async ({ page }) => {
    await createSampleClass(page);
    await flushStorage(page);
    await page.reload();
    await expect.poll(() => getStudentNames(page)).toHaveLength(8);
    await expect(page.getByTestId('optimize-button')).toBeVisible();
  });
});

async function openStudentWizard(page: Page) {
  await page.evaluate(() => window.__ZUSTAND_STORE__.getState().startWizard());
  await expect(page.getByRole('navigation', { name: /set ?up your class/i })).toBeVisible();
}
async function addStudent(page: Page, name: string) {
  await page.getByRole('button', { name: 'Add Student', exact: true }).click();
  await page.getByPlaceholder('Student name', { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Add Student', exact: true }).click();
  await expect.poll(() => getStudentNames(page)).toContain(name);
}

test.describe('Student management', () => {
  test.beforeEach(async ({ page }) => openStudentWizard(page));
  test('adds a student', async ({ page }) => {
    await addStudent(page, 'Test Student');
  });
  test('edits a student', async ({ page }) => {
    await addStudent(page, 'Original Name');
    await page.getByRole('button', { name: 'Edit Original Name', exact: true }).click();
    await page.getByPlaceholder('Student name', { exact: true }).fill('Updated Name');
    await page.getByRole('button', { name: 'Update Student', exact: true }).click();
    await expect.poll(() => getStudentNames(page)).toEqual(['Updated Name']);
  });
  test('removes a student', async ({ page }) => {
    await addStudent(page, 'To Be Deleted');
    await page.getByRole('button', { name: 'Remove To Be Deleted', exact: true }).click();
    await expect.poll(() => getStudentNames(page)).toEqual([]);
  });
});

test.describe('Optimization', () => {
  test.beforeEach(async ({ page }) => createSampleClass(page));
  test('runs optimization and renders results', async ({ page }) => runOptimization(page));
  test('adjusts priorities and re-optimizes', async ({ page }) => {
    await page.locator('summary#sidebar-group-advanced').click();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('slider', { name: 'Academic', exact: true }).fill('50');
    expect(await page.evaluate(() => window.__ZUSTAND_STORE__.getState().weights.academic_balance)).toBe(0.5);
    await runOptimization(page);
  });
  test('switches academic strategy and re-scores the visible chart', async ({ page }) => {
    await runOptimization(page);
    const positionsBefore = await page.evaluate(() =>
      window.__ZUSTAND_STORE__.getState().result?.student_positions,
    );
    await page.locator('summary#sidebar-group-advanced').click();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('radio', { name: /Similar readiness/i }).click();

    const state = await page.evaluate(() => window.__ZUSTAND_STORE__.getState());
    expect(state.config.seatingStrategy).toBe('similar');
    expect(state.result?.student_positions).toEqual(positionsBefore);
    await expect(page.getByText('Similar-Readiness Fit', { exact: true })).toBeVisible();
  });
});

test.describe('Projects', () => {
  test.beforeEach(async ({ page }) => { await createSampleClass(page); await openProjects(page); });
  async function save(page: Page, name: string) {
    await page.getByRole('textbox', { name: 'Class name…', exact: true }).fill(name);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  }
  test('saves and loads the actual roster', async ({ page }) => {
    await save(page, 'Test Class');
    await page.evaluate(() => {
      const store = window.__ZUSTAND_STORE__;
      store.getState().setStudents([]);
      store.setState({ currentProjectId: null });
    });
    await page.getByRole('button', { name: 'Load', exact: true }).click();
    await expect.poll(() => getStudentNames(page)).toHaveLength(8);
  });
  test('requires confirmation to delete a saved project', async ({ page }) => {
    await save(page, 'To Delete');
    await page.getByTitle('Delete', { exact: true }).click();
    await expect(page.getByText('To Delete', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByText('To Delete', { exact: true })).toHaveCount(0);
  });
});

test.describe('Rotation planning', () => {
  test('generates a complete multi-period plan in the background', async ({ page }) => {
    await createSampleClass(page);
    await page.locator('summary#sidebar-group-advanced').click();
    await page.getByRole('button', { name: 'Term rotation planner', exact: true }).click();
    await page.getByRole('button', { name: 'Generate rotation plan', exact: true }).click();

    await expect.poll(
      () => page.evaluate(() => window.__ZUSTAND_STORE__.getState().rotationPlan?.periods.length ?? 0),
      { timeout: 30_000 },
    ).toBe(4);
    await expect(page.getByRole('button', { name: /Week 1/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Week 4/ })).toBeVisible();
  });
});

test.describe('Export and import', () => {
  test('downloads a PDF of the generated layout', async ({ page }) => {
    await createSampleClass(page);
    await runOptimization(page);
    await page.getByRole('button', { name: /^Export$/i }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: /Save as PDF/i }).click();
    expect((await download).suggestedFilename()).toMatch(/\.pdf$/i);
  });
  test('imports CSV into the roster', async ({ page }) => {
    await openStudentWizard(page);
    await page.getByRole('tab', { name: /CSV/i }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'students.csv', mimeType: 'text/csv',
      buffer: Buffer.from('name,gender\nTest Student 1,female\nTest Student 2,male'),
    });
    await expect.poll(() => getStudentNames(page)).toEqual(['Test Student 1', 'Test Student 2']);
  });
});
