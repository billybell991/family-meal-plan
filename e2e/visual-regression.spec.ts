/**
 * Visual Regression — Pixel-Perfect Screenshot Baselines
 * Bell Family Meal Planner
 *
 * Fast headless screenshots of every page and key interactive states,
 * compared pixel-by-pixel against saved baselines.
 */
import { test, expect } from '@playwright/test';

test.describe('Visual Regression — Desktop Pages', () => {
  const pages = [
    { name: 'dashboard', path: '/' },
    { name: 'meals', path: '/meals' },
    { name: 'chores', path: '/chores' },
    { name: 'grocery', path: '/grocery' },
    { name: 'history', path: '/history' },
    { name: 'settings', path: '/settings' },
  ];

  for (const p of pages) {
    test(`${p.name} — above fold`, async ({ page }) => {
      await page.goto(p.path);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot(`${p.name}-above-fold.png`, {
        maxDiffPixelRatio: 0.01,
      });
    });

    test(`${p.name} — below fold`, async ({ page }) => {
      await page.goto(p.path);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(page).toHaveScreenshot(`${p.name}-below-fold.png`, {
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});

test.describe('Visual Regression — Mobile Pages', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  const mobilePages = [
    { name: 'mobile-dashboard', path: '/' },
    { name: 'mobile-meals', path: '/meals' },
    { name: 'mobile-chores', path: '/chores' },
    { name: 'mobile-settings', path: '/settings' },
  ];

  for (const p of mobilePages) {
    test(`${p.name}`, async ({ page }) => {
      await page.goto(p.path);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot(`${p.name}.png`, {
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});

test.describe('Visual Regression — Interactive States', () => {
  test('chores — category filter selected', async ({ page }) => {
    await page.goto('/chores');
    await page.waitForLoadState('networkidle');

    // Click a category pill if available
    const kitchenPill = page.getByRole('button', { name: /Kitchen/i });
    if (await kitchenPill.isVisible()) {
      await kitchenPill.click();
    }

    await expect(page).toHaveScreenshot('chores-kitchen-filter.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('chores — add chore modal open', async ({ page }) => {
    await page.goto('/chores');
    await page.waitForLoadState('networkidle');

    const addBtn = page.getByRole('button', { name: /Add Chore/i }).first();
    await addBtn.click();

    // Wait for modal animation
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('chores-add-modal.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('settings — scrolled to middle', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));

    await expect(page).toHaveScreenshot('settings-middle.png', {
      maxDiffPixelRatio: 0.01,
    });
  });
});
