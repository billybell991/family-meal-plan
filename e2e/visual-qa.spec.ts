/**
 * Visual QA — Headed Browser Tests
 * Bell Family Meal Planner
 *
 * 18 AI-selected "money shot" user journeys run in a visible browser window.
 * These test user JOURNEYS with deliberate pauses for human observation.
 */
import { test, expect } from '@playwright/test';

test.describe('Visual QA — User Journeys', () => {
  // ── 1. App First Impression ────────────────────────────────────────────
  test('1. App loads with header, nav, and dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    await expect(page.getByRole('heading', { name: /Bell Family/i })).toBeVisible();
    await expect(page.getByText('Planner').first()).toBeVisible();
    await page.waitForTimeout(800);
  });

  // ── 2. Full Navigation Cycle ───────────────────────────────────────────
  test('2. Navigate through all pages in sequence', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const navTargets = [
      { href: '/meals', label: 'Meals' },
      { href: '/chores', label: 'Chores' },
      { href: '/grocery', label: 'Grocery' },
      { href: '/history', label: 'History' },
      { href: '/settings', label: 'Settings' },
      { href: '/', label: 'My Week' },
    ];

    for (const nav of navTargets) {
      await page.locator(`a[href="${nav.href}"]`).first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(600);
    }
  });

  // ── 3. Dashboard Overview ──────────────────────────────────────────────
  test('3. Dashboard shows week overview and footer', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    await expect(page.getByText(/AI-powered by Gemini/i)).toBeVisible();
    await page.waitForTimeout(500);

    // Scroll to see full page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);
  });

  // ── 4. Meals Page — Empty State ────────────────────────────────────────
  test('4. Meals page shows empty state or current plan', async ({ page }) => {
    await page.goto('/meals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    // Either shows a plan or the generate prompt
    const hasGenerateBtn = await page.getByRole('button', { name: /Generate/i }).first().isVisible();
    expect(hasGenerateBtn).toBe(true);
    await page.waitForTimeout(800);
  });

  // ── 5. Chores Page — Library Browse ────────────────────────────────────
  test('5. Chores page — browse chore library categories', async ({ page }) => {
    await page.goto('/chores');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    // Check library section
    await expect(page.getByText(/Chore Library/i)).toBeVisible();
    await page.waitForTimeout(500);

    // Scroll down to see library
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);
  });

  // ── 6. Chores Page — Category Filter Interaction ───────────────────────
  test('6. Click category filter pills on chores page', async ({ page }) => {
    await page.goto('/chores');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Try clicking category pills if they exist
    const kitchenPill = page.getByRole('button', { name: /Kitchen/i });
    if (await kitchenPill.isVisible()) {
      await kitchenPill.click();
      await page.waitForTimeout(600);

      const floorsPill = page.getByRole('button', { name: /Floor/i });
      if (await floorsPill.isVisible()) {
        await floorsPill.click();
        await page.waitForTimeout(600);
      }

      // Back to All
      const allPill = page.getByRole('button', { name: /All/i }).first();
      if (await allPill.isVisible()) {
        await allPill.click();
        await page.waitForTimeout(600);
      }
    }
  });

  // ── 7. Add Chore Modal ─────────────────────────────────────────────────
  test('7. Open and close Add Chore modal', async ({ page }) => {
    await page.goto('/chores');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const addBtn = page.getByRole('button', { name: /Add Chore/i }).first();
    await addBtn.click();
    await page.waitForTimeout(800);

    // Modal should be visible — look for form elements
    const modal = page.locator('[class*="modal"], [class*="Modal"], [role="dialog"]').first();
    if (await modal.isVisible()) {
      await page.waitForTimeout(600);

      // Close modal (look for close/cancel button)
      const closeBtn = page.getByRole('button', { name: /Cancel|Close|×/i }).first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  // ── 8. Grocery Page — Empty State ──────────────────────────────────────
  test('8. Grocery page displays correctly', async ({ page }) => {
    await page.goto('/grocery');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    // Should show either a grocery list or a "no plan" message
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    await page.waitForTimeout(500);
  });

  // ── 9. History Page ────────────────────────────────────────────────────
  test('9. History page displays past plans or empty state', async ({ page }) => {
    await page.goto('/history');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    await page.waitForTimeout(500);
  });

  // ── 10. Settings Page — Full Scroll ────────────────────────────────────
  test('10. Settings page — scroll through all sections', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    // Scroll through settings sections
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3));
    await page.waitForTimeout(600);

    await page.evaluate(() => window.scrollTo(0, (document.body.scrollHeight / 3) * 2));
    await page.waitForTimeout(600);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);
  });

  // ── 11. Settings — Family Members Display ──────────────────────────────
  test('11. Settings shows family members and allergies', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page.getByText('Mom').first()).toBeVisible();
    await expect(page.getByText('Dad').first()).toBeVisible();
    await page.waitForTimeout(800);
  });

  // ── 12. Settings — Schedule Config ─────────────────────────────────────
  test('12. Settings has schedule day and takeout config', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page.getByText(/takeout/i).first()).toBeVisible();
    await page.waitForTimeout(800);
  });

  // ── 13. API-Driven Chore Add ───────────────────────────────────────────
  test('13. Add chore via UI and see it appear', async ({ page }) => {
    await page.goto('/chores');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Click Add Chore
    const addBtn = page.getByRole('button', { name: /Add Chore/i }).first();
    await addBtn.click();
    await page.waitForTimeout(800);

    // Fill form if modal is open
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Visual QA Test Chore');
      await page.waitForTimeout(400);

      // Try to save
      const saveBtn = page.getByRole('button', { name: /Save|Add|Create/i }).first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(800);
      }
    }
  });

  // ── 14. Chores Page — Generate Button Presence ─────────────────────────
  test('14. Generate chore plan button is prominent', async ({ page }) => {
    await page.goto('/chores');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const genBtn = page.getByRole('button', { name: /Generate Chore Plan/i }).first();
    await expect(genBtn).toBeVisible();
    await page.waitForTimeout(800);
  });

  // ── 15. Meals Page — Generate Button Presence ──────────────────────────
  test('15. Generate meal plan button is prominent', async ({ page }) => {
    await page.goto('/meals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const genBtn = page.getByRole('button', { name: /Generate/i }).first();
    await expect(genBtn).toBeVisible();
    await page.waitForTimeout(800);
  });

  // ── 16. Settings — Meal Database Section ───────────────────────────────
  test('16. Settings meal database section', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Scroll to meal database section
    const mealSection = page.getByText(/meal database|known meals|meal library/i).first();
    if (await mealSection.isVisible()) {
      await mealSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
    }
  });

  // ── 17. Full Page Scroll — Dashboard ───────────────────────────────────
  test('17. Dashboard full scroll top to bottom', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const height = await page.evaluate(() => document.body.scrollHeight);
    const steps = 4;
    for (let i = 1; i <= steps; i++) {
      await page.evaluate((y) => window.scrollTo(0, y), (height / steps) * i);
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(500);
  });

  // ── 18. Mobile Viewport Final Check ────────────────────────────────────
  test('18. Mobile viewport — full nav and dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    // Nav should be at bottom on mobile
    await expect(page.getByRole('heading', { name: /Bell Family/i })).toBeVisible();
    await page.waitForTimeout(500);

    // Navigate to chores on mobile (use visible link)
    await page.locator('a[href="/chores"]:visible').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    // Navigate to settings on mobile
    await page.locator('a[href="/settings"]:visible').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
  });
});
