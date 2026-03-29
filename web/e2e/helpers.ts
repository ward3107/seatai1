/**
 * E2E Test Helpers
 *
 * Common utilities and fixtures for Playwright tests
 */

import { test as base, Page } from '@playwright/test';

/**
 * Extended test fixture with custom helpers
 */
export const test = base.extend<{
  appPage: Page;
}>({
  appPage: async ({ page }, use) => {
    // Common setup for each test
    await page.goto('/');

    // Skip onboarding if present
    const skipButton = page.getByRole('button', { name: /skip|דלג/i });
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
    }

    await use(page);
  },
});

/**
 * Create a sample student via direct state manipulation
 */
export async function createSampleStudent(page: Page, overrides: Record<string, any> = {}) {
  const student = {
    id: `student-${Date.now()}`,
    name: 'Sample Student',
    gender: 'female',
    academic_level: 'proficient',
    academic_score: 75,
    behavior_level: 'good',
    behavior_score: 80,
    friends_ids: [],
    incompatible_ids: [],
    special_needs: [],
    requires_front_row: false,
    requires_quiet_area: false,
    has_mobility_issues: false,
    is_bilingual: false,
    ...overrides
  };

  await page.evaluate((studentData: any) => {
    const store = (window as any).__ZUSTAND_STORE__;
    if (store) {
      const students = store.getState().students || [];
      store.getState().setStudents([...students, studentData]);
    }
  }, student);

  return student;
}

/**
 * Create multiple sample students
 */
export async function createSampleClass(page: Page, count: number = 10) {
  const students = [];
  for (let i = 0; i < count; i++) {
    const student = await createSampleStudent(page, {
      id: `student-${i}`,
      name: `Student ${i + 1}`,
      gender: i % 2 === 0 ? 'female' : 'male',
      academic_score: 60 + Math.floor(Math.random() * 40),
      behavior_score: 60 + Math.floor(Math.random() * 40)
    });
    students.push(student);
  }
  return students;
}

/**
 * Run optimization and wait for completion
 */
export async function runOptimization(page: Page) {
  const optimizeButton = page.getByRole('button', { name: /optimize|הפעל אופטימיזציה/i });
  await optimizeButton.click();

  // Wait for completion indicator
  await page.waitForSelector('[data-testid="optimization-complete"], text=/optimization complete|האופטימיזציה הושלמה/i', {
    timeout: 15000
  });

  // Wait for results to render
  await page.waitForSelector('.classroom-grid, [data-testid="classroom-layout"]', {
    timeout: 5000
  });
}

/**
 * Switch language
 */
export async function switchLanguage(page: Page, language: 'en' | 'he') {
  const langButton = page.getByRole('button', { name: /language|שפה/i });
  await langButton.click();

  const langOption = page.getByRole('option', {
    name: language === 'he' ? /עברית|hebrew/i : /english|אנגלית/i
  });
  await langOption.click();

  // Wait for direction change
  await page.waitForSelector(`html[dir="${language === 'he' ? 'rtl' : 'ltr'}"]`);
}

/**
 * Clear all app data (IndexedDB + localStorage)
 */
export async function clearAppData(page: Page) {
  await page.evaluate(() => {
    // Clear localStorage
    localStorage.clear();
    sessionStorage.clear();

    // Clear IndexedDB
    if (window.indexedDB) {
      const databases = indexedDB.databases ? await indexedDB.databases() : [];
      for (const db of databases) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }
    }
  });
}

/**
 * Wait for toast notification
 */
export async function waitForToast(page: Page, message: RegExp) {
  await page.waitForSelector(`[role="alert"], .toast, .notification`, {
    timeout: 5000
  });
  await expect(page.getByRole('alert').filter({ hasText: message })).toBeVisible();
}

/**
 * Take screenshot on failure
 */
export async function screenshotOnFailure(page: Page, testName: string) {
  await page.screenshot({
    path: `test-screenshots/${testName}-failure.png`,
    fullPage: true
  });
}

/**
 * Mock IndexedDB for faster tests
 */
export async function mockIndexedDB(page: Page) {
  await page.addInitScript(() => {
    // Store IndexedDB requests in memory for testing
    const mockDB = new Map();

    window.indexedDB = {
      open: (name: string, version?: number) => {
        return {
          onsuccess: null as any,
          onerror: null as any,
          onupgradeneeded: null as any,
          result: {
            transaction: (storeNames: string[], mode: string) => ({
              objectStore: (name: string) => ({
                add: (data: any) => ({ result: data.id }),
                put: (data: any) => ({ result: data.id }),
                get: (key: string) => ({ result: mockDB.get(key) }),
                delete: (key: string) => mockDB.delete(key),
                getAll: () => ({ result: Array.from(mockDB.values()) })
              })
            })
          }
        } as any;
      },
      deleteDatabase: (name: string) => Promise.resolve(),
      databases: () => Promise.resolve([])
    } as any;
  });
}

/**
 * Get current language from page
 */
export async function getCurrentLanguage(page: Page): Promise<'en' | 'he'> {
  const dir = await page.locator('html').getAttribute('dir');
  return dir === 'rtl' ? 'he' : 'en';
}

/**
 * Get number of students from store
 */
export async function getStudentCount(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const store = (window as any).__ZUSTAND_STORE__;
    return store?.getState().students?.length || 0;
  });
}

/**
 * Check if optimization is running
 */
export async function isOptimizing(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const store = (window as any).__ZUSTAND_STORE__;
    return store?.getState().isOptimizing || false;
  });
}
