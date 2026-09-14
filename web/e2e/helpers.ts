import { expect, type Page } from '@playwright/test';
import type { useStore } from '../src/core/store';
import type { Student } from '../src/types';

// Type-only import: never bundle application state into the Node test runner.
declare global {
  interface Window { __ZUSTAND_STORE__: typeof useStore }
}

export async function openApp(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__ZUSTAND_STORE__?.persist.hasHydrated());
  await page.evaluate(() => {
    const store = window.__ZUSTAND_STORE__;
    store.setState({ welcomeTipsDismissed: true, sidebarOpen: true, homeView: false });
    store.getState().setUiLanguage('en');
  });
}

export async function createSampleClass(page: Page, count = 8) {
  const roster: Student[] = Array.from({ length: count }, (_, i) => ({
    id: `student-${i}`, name: `Student ${i + 1}`, gender: 'other',
    academic_level: 'proficient', academic_score: 75,
    behavior_level: 'good', behavior_score: 80,
    friends_ids: [], incompatible_ids: [], special_needs: [],
    requires_front_row: false, requires_quiet_area: false,
    has_mobility_issues: false, is_bilingual: false,
  }));
  await page.evaluate((students) => {
    const s = window.__ZUSTAND_STORE__.getState();
    s.setStudents(students);
    s.setConfig({ ...s.config, populationSize: 20, maxGenerations: 15, earlyStopPatience: 5 });
  }, roster);
}

export async function runOptimization(page: Page) {
  const button = page.getByTestId('optimize-button');
  await expect(button).toBeEnabled({ timeout: 15000 });
  await button.click();
  await expect.poll(() => page.evaluate(() => window.__ZUSTAND_STORE__.getState().result !== null), { timeout: 20000 }).toBe(true);
  await expect(page.locator('#seating-grid-export')).toBeVisible();
}

export async function switchLanguage(page: Page, language: 'he' | 'ar') {
  await page.getByRole('button', { name: 'Display preferences', exact: true }).click();
  await page.getByRole('button', { name: 'Language', exact: true }).click();
  await page.getByRole('menuitemradio').filter({ hasText: language === 'he' ? 'Hebrew' : 'Arabic' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', language);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
}

export async function openProjects(page: Page) {
  const group = page.locator('summary#sidebar-group-advanced');
  if (!(await group.evaluate((node) => node.parentElement?.hasAttribute('open')))) await group.click();
  await page.getByRole('button', { name: /^Projects/ }).click();
}

export async function getStudentNames(page: Page) {
  return page.evaluate(() => window.__ZUSTAND_STORE__.getState().students.map((s) => s.name));
}

export async function flushStorage(page: Page) {
  await page.evaluate(async () => {
    const modulePath = '/src/core/db.ts';
    const { flushPendingWrites } = await import(/* @vite-ignore */ modulePath);
    await flushPendingWrites();
  });
}
