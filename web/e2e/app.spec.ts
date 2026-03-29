import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Critical App Flows
 *
 * Tests core user journeys:
 * - Language switching (i18n)
 * - Onboarding experience
 * - Student management (add, edit, delete)
 * - Optimization flow
 * - Project management
 */

test.describe('Language Switching', () => {
  test('should switch to Hebrew and apply RTL', async ({ page }) => {
    await page.goto('/');

    // Check default language is English
    await expect(page.getByRole('heading', { name: /seatai/i })).toBeVisible();

    // Find and click language selector
    const languageButton = page.getByRole('button', { name: /language|english/i });
    await languageButton.click();

    // Select Hebrew
    const hebrewOption = page.getByRole('option', { name: /עברית|hebrew/i });
    await hebrewOption.click();

    // Verify RTL direction is applied
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    // Verify Hebrew content is visible
    await expect(page.getByText(/שיוש כיתה/i)).toBeVisible();
  });

  test('should persist language choice across page reloads', async ({ page }) => {
    await page.goto('/');

    // Switch to Hebrew
    const languageButton = page.getByRole('button', { name: /language|english/i });
    await languageButton.click();
    await page.getByRole('option', { name: /עברית|hebrew/i }).click();

    // Reload page
    await page.reload();

    // Verify language persists
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByText(/שיוש כיתה/i })).toBeVisible();
  });
});

test.describe('Onboarding Flow', () => {
  test('first-time user should see onboarding screen', async ({ page }) => {
    // Clear localStorage to simulate first-time visit
    await page.context().clearCookies();
    await page.goto('/');

    // Should show onboarding
    await expect(page.getByText(/welcome|getting started|התחלה/i)).toBeVisible();

    // Click through onboarding
    const nextButton = page.getByRole('button', { name: /next|continue|הבא/i });
    await nextButton.click();

    // Should complete onboarding and show main app
    await expect(page.getByRole('button', { name: /add student/i })).toBeVisible();
  });

  test('returning user should skip onboarding', async ({ page }) => {
    // Set onboarding complete flag
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('hasCompletedOnboarding', 'true');
    });
    await page.reload();

    // Should go directly to main app
    await expect(page.getByRole('button', { name: /add student/i })).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Student Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Skip onboarding if present
    const skipButton = page.getByRole('button', { name: /skip|דלג/i });
    if (await skipButton.isVisible()) {
      await skipButton.click();
    }
  });

  test('should add a new student', async ({ page }) => {
    // Click add student button
    const addButton = page.getByRole('button', { name: /add student|הוסף תלמיד/i });
    await addButton.click();

    // Fill student form
    await page.getByRole('textbox', { name: /name|שם/i }).fill('Test Student');
    await page.getByRole('combobox', { name: /gender|מגדר/i }).selectOption('female');

    // Select academic level
    await page.getByRole('button', { name: /academic level|רמה אקדמית/i }).click();
    await page.getByRole('option', { name: /proficient|מצטיין/i }).click();

    // Save student
    await page.getByRole('button', { name: /save|save student|שמור/i }).click();

    // Verify student appears in list
    await expect(page.getByText('Test Student')).toBeVisible();
  });

  test('should edit an existing student', async ({ page }) => {
    // Add a student first
    const addButton = page.getByRole('button', { name: /add student|הוסף תלמיד/i });
    await addButton.click();
    await page.getByRole('textbox', { name: /name|שם/i }).fill('Original Name');
    await page.getByRole('combobox', { name: /gender|מגדר/i }).selectOption('male');
    await page.getByRole('button', { name: /save|save student|שמור/i }).click();

    // Edit the student
    const studentCard = page.getByText('Original Name');
    await studentCard.click();
    const editButton = page.getByRole('button', { name: /edit|ערוך/i });
    await editButton.click();

    // Update name
    await page.getByRole('textbox', { name: /name|שם/i }).fill('Updated Name');
    await page.getByRole('button', { name: /save|save student|שמור/i }).click();

    // Verify update
    await expect(page.getByText('Updated Name')).toBeVisible();
    await expect(page.getByText('Original Name')).not.toBeVisible();
  });

  test('should delete a student', async ({ page }) => {
    // Add a student first
    const addButton = page.getByRole('button', { name: /add student|הוסף תלמיד/i });
    await addButton.click();
    await page.getByRole('textbox', { name: /name|שם/i }).fill('To Be Deleted');
    await page.getByRole('combobox', { name: /gender|מגדר/i }).selectOption('female');
    await page.getByRole('button', { name: /save|save student|שמור/i }).click();

    // Delete the student
    const studentCard = page.getByText('To Be Deleted');
    await studentCard.click();
    const deleteButton = page.getByRole('button', { name: /delete|מחק/i });
    await deleteButton.click();

    // Confirm deletion
    const confirmButton = page.getByRole('button', { name: /confirm|confirm deletion|אשר/i });
    await confirmButton.click();

    // Verify deletion
    await expect(page.getByText('To Be Deleted')).not.toBeVisible();
  });
});

test.describe('Optimization Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Skip onboarding and add sample students
    const skipButton = page.getByRole('button', { name: /skip|דלג/i });
    if (await skipButton.isVisible()) {
      await skipButton.click();
    }

    // Add a few students via state
    await page.evaluate(() => {
      const store = (window as any).__ZUSTAND_STORE__;
      if (store) {
        store.setState({
          students: [
            {
              id: 's1',
              name: 'Alice',
              gender: 'female',
              academic_level: 'proficient',
              academic_score: 85,
              behavior_level: 'good',
              behavior_score: 80,
              friends_ids: [],
              incompatible_ids: [],
              special_needs: [],
              requires_front_row: false,
              requires_quiet_area: false,
              has_mobility_issues: false,
              is_bilingual: false
            },
            {
              id: 's2',
              name: 'Bob',
              gender: 'male',
              academic_level: 'developing',
              academic_score: 65,
              behavior_level: 'good',
              behavior_score: 75,
              friends_ids: [],
              incompatible_ids: [],
              special_needs: [],
              requires_front_row: false,
              requires_quiet_area: false,
              has_mobility_issues: false,
              is_bilingual: false
            }
          ]
        });
      }
    });
  });

  test('should run optimization and display results', async ({ page }) => {
    // Click optimize button
    const optimizeButton = page.getByRole('button', { name: /optimize|הפעל אופטימיזציה/i });
    await optimizeButton.click();

    // Wait for optimization to complete
    await expect(page.getByText(/optimization complete|האופטימיזציה הושלמה/i)).toBeVisible({ timeout: 10000 });

    // Verify results are displayed
    await expect(page.getByText(/fitness score|ניקוד כושר/i)).toBeVisible();
    await expect(page.locator('.classroom-grid')).toBeVisible();
  });

  test('should adjust weights and re-optimize', async ({ page }) => {
    // Open settings
    const settingsButton = page.getByRole('button', { name: /settings|הגדרות/i });
    await settingsButton.click();

    // Adjust academic balance weight
    const academicSlider = page.getByRole('slider', { name: /academic|אקדמי/i });
    await academicSlider.fill('50');

    // Close settings
    await page.keyboard.press('Escape');

    // Run optimization
    const optimizeButton = page.getByRole('button', { name: /optimize|הפעל אופטימיזציה/i });
    await optimizeButton.click();

    // Verify optimization completes
    await expect(page.getByText(/optimization complete|האופטימיזציה הושלמה/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const skipButton = page.getByRole('button', { name: /skip|דלג/i });
    if (await skipButton.isVisible()) {
      await skipButton.click();
    }
  });

  test('should save and load a project', async ({ page }) => {
    // Create a project
    const projectsButton = page.getByRole('button', { name: /projects|פרויקטים/i });
    await projectsButton.click();

    const saveButton = page.getByRole('button', { name: /save project|שמור פרויקט/i });
    await saveButton.click();

    // Enter project name
    await page.getByRole('textbox', { name: /project name|שם פרויקט/i }).fill('Test Class');
    await page.getByRole('button', { name: /save|שמור/i }).click();

    // Verify project appears in list
    await expect(page.getByText('Test Class')).toBeVisible();

    // Clear current state and reload
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Load the project
    await projectsButton.click();
    await page.getByText('Test Class').click();
    const loadButton = page.getByRole('button', { name: /load|טען/i });
    await loadButton.click();

    // Verify project loaded
    await expect(projectsButton).toBeVisible();
  });

  test('should delete a project', async ({ page }) => {
    // Create and save a project
    const projectsButton = page.getByRole('button', { name: /projects|פרויקטים/i });
    await projectsButton.click();

    const saveButton = page.getByRole('button', { name: /save project|שמור פרויקט/i });
    await saveButton.click();
    await page.getByRole('textbox', { name: /project name|שם פרויקט/i }).fill('To Delete');
    await page.getByRole('button', { name: /save|שמור/i }).click();

    // Delete the project
    await page.getByText('To Delete').click();
    const deleteButton = page.getByRole('button', { name: /delete|מחק/i });
    await deleteButton.click();

    // Confirm deletion
    await page.getByRole('button', { name: /confirm|אשר/i }).click();

    // Verify deletion
    await expect(page.getByText('To Delete')).not.toBeVisible();
  });
});

test.describe('Export and Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const skipButton = page.getByRole('button', { name: /skip|דלג/i });
    if (await skipButton.isVisible()) {
      await skipButton.click();
    }
  });

  test('should export classroom layout as PDF', async ({ page }) => {
    // Set up a simple layout first
    await page.evaluate(() => {
      const store = (window as any).__ZUSTAND_STORE__;
      if (store) {
        store.setState({
          students: [
            {
              id: 's1',
              name: 'Export Test',
              gender: 'female',
              academic_level: 'proficient',
              academic_score: 85,
              behavior_level: 'good',
              behavior_score: 80,
              friends_ids: [],
              incompatible_ids: [],
              special_needs: [],
              requires_front_row: false,
              requires_quiet_area: false,
              has_mobility_issues: false,
              is_bilingual: false
            }
          ],
          result: {
            layout: {
              layout_type: 'rows',
              rows: 5,
              cols: 6,
              total_seats: 30,
              seats: [{ position: { row: 0, col: 0 }, student_id: 's1' }]
            },
            student_positions: { s1: { row: 0, col: 0 } },
            fitness_score: 85,
            objective_scores: { academic_balance: 80, behavioral_balance: 85, diversity: 75, special_needs: 90 },
            generations: 50,
            computation_time_ms: 100,
            warnings: []
          }
        });
      }
    });

    // Click export button
    const exportButton = page.getByRole('button', { name: /export|ייצוא/i });
    await exportButton.click();

    // Select PDF option
    const pdfOption = page.getByRole('menuitem', { name: /pdf|ייצא כ-pdf/i });
    await pdfOption.click();

    // Wait for download
    const downloadPromise = page.waitForEvent('download');
    await downloadPromise;
  });

  test('should import students from CSV', async ({ page }) => {
    // Create a CSV file
    const csv = `name,gender,academic_level,behavior_level
Test Student 1,female,proficient,good
Test Student 2,male,developing,excellent`;

    // Upload the file
    const importButton = page.getByRole('button', { name: /import|ייבוא/i });
    await importButton.click();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'students.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv)
    });

    // Verify import
    await expect(page.getByText('Test Student 1')).toBeVisible();
    await expect(page.getByText('Test Student 2')).toBeVisible();
  });
});
