/**
 * E2E Critical Path — Headless Regression Tests
 * Bell Family Meal Planner
 *
 * Categories covered:
 *  1. Page Loads         — Every page renders without errors
 *  2. Navigation         — All nav links reach destination
 *  3. API Health         — Every API route returns correct status
 *  4. Console Errors     — No unexpected JS errors
 *  5. Form Validation    — Settings forms, chore library
 *  6. CRUD Operations    — Chore library add/edit/delete, custom grocery
 *  7. Performance        — Pages load under 5 seconds
 *  8. Data Round-Trip    — POST → GET shows new data
 *  9. Mobile Viewport    — Key pages render at 375×812
 * 10. Visual Structure   — Key UI elements present
 * 11. API Security       — Malformed requests handled gracefully
 */
import { test, expect, Page } from '@playwright/test';

const CONSOLE_NOISE = [
  'Download the React DevTools',
  'Warning:',
  'next-dev.js',
  'Failed to load resource',
  'CLIENT_FETCH_ERROR',
  'Failed to fetch',
  'favicon',
  'sw-push',
  'manifest',
  'net::ERR_',
];

function isConsoleNoise(msg: string): boolean {
  return CONSOLE_NOISE.some(noise => msg.includes(noise));
}

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && !isConsoleNoise(msg.text())) {
      errors.push(msg.text());
    }
  });
  return errors;
}

// ── 1. Page Loads ────────────────────────────────────────────────────────────

test.describe('Page Loads', () => {
  const pages = [
    { name: 'Dashboard (My Week)', path: '/' },
    { name: 'Meals', path: '/meals' },
    { name: 'Chores', path: '/chores' },
    { name: 'Grocery', path: '/grocery' },
    { name: 'History', path: '/history' },
    { name: 'Settings', path: '/settings' },
  ];

  for (const p of pages) {
    test(`${p.name} page loads without error`, async ({ page }) => {
      const errors = collectConsoleErrors(page);
      const response = await page.goto(p.path);
      expect(response?.status()).toBeLessThan(400);
      await page.waitForLoadState('networkidle');
      expect(errors).toHaveLength(0);
    });
  }
});

// ── 2. Navigation ────────────────────────────────────────────────────────────

test.describe('Navigation', () => {
  test('nav bar contains all expected links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const navLinks = [
      { text: 'My Week', href: '/' },
      { text: 'Meals', href: '/meals' },
      { text: 'Chores', href: '/chores' },
      { text: 'Grocery', href: '/grocery' },
      { text: 'History', href: '/history' },
      { text: 'Settings', href: '/settings' },
    ];

    for (const link of navLinks) {
      const el = page.locator(`a[href="${link.href}"]`).first();
      await expect(el).toBeVisible();
    }
  });

  test('clicking each nav link navigates correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const targets = [
      { href: '/meals', heading: 'Weekly Meal Plan' },
      { href: '/chores', heading: 'Weekly Chore Plan' },
      { href: '/grocery', heading: 'Grocery' },
      { href: '/history', heading: 'History' },
      { href: '/settings', heading: 'Settings' },
    ];

    for (const t of targets) {
      await page.locator(`a[href="${t.href}"]`).first().click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain(t.href);
    }
  });
});

// ── 3. API Health ────────────────────────────────────────────────────────────

test.describe('API Health', () => {
  test('GET /api/health returns 200', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
  });

  test('GET /api/settings returns 200', async ({ request }) => {
    const res = await request.get('/api/settings');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.familyMembers).toBeDefined();
  });

  test('GET /api/meal-plan returns 200 or 404', async ({ request }) => {
    const res = await request.get('/api/meal-plan');
    expect([200, 404]).toContain(res.status());
  });

  test('GET /api/chores/definitions returns 200', async ({ request }) => {
    const res = await request.get('/api/chores/definitions');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.choreDefinitions).toBeDefined();
  });

  test('GET /api/chores/plan returns 200 or 404', async ({ request }) => {
    const res = await request.get('/api/chores/plan');
    expect([200, 404]).toContain(res.status());
  });

  test('GET /api/settings/meals returns 200', async ({ request }) => {
    const res = await request.get('/api/settings/meals');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.meals).toBeDefined();
  });

  test('GET /api/settings/ratings returns 200', async ({ request }) => {
    const res = await request.get('/api/settings/ratings');
    expect(res.status()).toBe(200);
  });

  test('GET /api/recipes returns 200', async ({ request }) => {
    const res = await request.get('/api/recipes');
    expect(res.status()).toBe(200);
  });

  test('GET /api/chores/history returns 200', async ({ request }) => {
    const res = await request.get('/api/chores/history');
    expect(res.status()).toBe(200);
  });

  test('GET /api/meal-plan/history returns 200', async ({ request }) => {
    const res = await request.get('/api/meal-plan/history');
    expect(res.status()).toBe(200);
  });
});

// ── 4. Console Errors ────────────────────────────────────────────────────────

test.describe('Console Errors', () => {
  const pages = ['/', '/meals', '/chores', '/grocery', '/history', '/settings'];
  for (const path of pages) {
    test(`no unexpected console errors on ${path}`, async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      expect(errors).toHaveLength(0);
    });
  }
});

// ── 5. Form Validation & Settings ────────────────────────────────────────────

test.describe('Settings Page', () => {
  test('displays family members', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Mom').first()).toBeVisible();
    await expect(page.getByText('Dad').first()).toBeVisible();
  });

  test('shows allergy fields', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    // Look for allergy-related section
    await expect(page.getByText(/allerg/i)).toBeVisible();
  });

  test('shows schedule configuration', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/schedule/i).first()).toBeVisible();
  });
});

// ── 6. CRUD Operations — Chore Library ───────────────────────────────────────

test.describe('Chore Library CRUD', () => {
  test('can add a new chore via API and see it in definitions', async ({ request }) => {
    const choreName = `E2E Test Chore ${Date.now()}`;
    const expectedId = choreName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const addRes = await request.post('/api/chores/definitions/chore', {
      data: { name: choreName, category: 'other', difficulty: 'easy', estimatedMinutes: 5, frequency: 'daily', ageMin: 12 },
    });
    expect(addRes.status()).toBe(200);

    const getRes = await request.get('/api/chores/definitions');
    const data = await getRes.json();
    const found = data.choreDefinitions.find((c: any) => c.id === expectedId);
    expect(found).toBeDefined();
    expect(found.name).toBe(choreName);

    // Cleanup: delete the test chore
    const delRes = await request.delete(`/api/chores/definitions/chore/${expectedId}`);
    expect(delRes.status()).toBe(200);

    // Verify deletion
    const getRes2 = await request.get('/api/chores/definitions');
    const data2 = await getRes2.json();
    const notFound = data2.choreDefinitions.find((c: any) => c.id === expectedId);
    expect(notFound).toBeUndefined();
  });

  test('can update a chore via API', async ({ request }) => {
    const choreName = `Update Test ${Date.now()}`;
    const expectedId = choreName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    await request.post('/api/chores/definitions/chore', {
      data: { name: choreName, category: 'other', difficulty: 'easy', estimatedMinutes: 5, frequency: 'daily', ageMin: 12 },
    });

    const updateRes = await request.put(`/api/chores/definitions/chore/${expectedId}`, {
      data: { name: 'After Update' },
    });
    expect(updateRes.status()).toBe(200);

    const data = await (await request.get('/api/chores/definitions')).json();
    const chore = data.choreDefinitions.find((c: any) => c.id === expectedId);
    expect(chore.name).toBe('After Update');

    // Cleanup
    await request.delete(`/api/chores/definitions/chore/${expectedId}`);
  });
});

// ── 7. Ratings Data Round-Trip ───────────────────────────────────────────────

test.describe('Ratings Round-Trip', () => {
  test('POST rating → GET shows it in averages', async ({ request }) => {
    const res = await request.post('/api/settings/ratings', {
      data: { meal: 'E2E Test Meal', member: 'Mom', stars: 5 },
    });
    expect(res.status()).toBe(200);

    const ratingsRes = await request.get('/api/settings/ratings');
    const ratings = await ratingsRes.json();
    const found = ratings.find((r: any) => r.meal === 'E2E Test Meal');
    expect(found).toBeDefined();
    expect(found.avgRating).toBe(5);
  });
});

// ── 8. API Input Validation ──────────────────────────────────────────────────

test.describe('API Security & Validation', () => {
  test('POST /api/grocery/custom rejects empty item', async ({ request }) => {
    const res = await request.post('/api/grocery/custom', {
      data: { item: '' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/settings/ratings rejects invalid stars', async ({ request }) => {
    const res = await request.post('/api/settings/ratings', {
      data: { meal: 'Test', member: 'Mom', stars: 99 },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('PATCH non-existent day returns error', async ({ request }) => {
    const res = await request.patch('/api/meal-plan/day/FakeDay', {
      data: { cook: 'Mom' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

// ── 9. Performance ───────────────────────────────────────────────────────────

test.describe('Performance', () => {
  const pages = ['/', '/meals', '/chores', '/grocery', '/history', '/settings'];
  for (const path of pages) {
    test(`${path} loads under 5 seconds`, async ({ page }) => {
      const start = Date.now();
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000);
    });
  }
});

// ── 10. Mobile Viewport ──────────────────────────────────────────────────────

test.describe('Mobile Viewport', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  const pages = ['/', '/meals', '/chores', '/settings'];
  for (const path of pages) {
    test(`${path} renders at 375×812`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      // Page should render without horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(400);
    });
  }
});

// ── 11. Visual Structure ─────────────────────────────────────────────────────

test.describe('Visual Structure', () => {
  test('Dashboard has header and nav', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Bell Family/i })).toBeVisible();
    await expect(page.locator('nav, header').first()).toBeVisible();
  });

  test('Meals page has Generate button', async ({ page }) => {
    await page.goto('/meals');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /Generate/i }).first()).toBeVisible();
  });

  test('Chores page has Generate and Add Chore buttons', async ({ page }) => {
    await page.goto('/chores');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /Generate/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Add Chore/i }).first()).toBeVisible();
  });

  test('Settings page has Save button', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /Save/i }).first()).toBeVisible();
  });

  test('Footer is visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/AI-powered by Gemini/i)).toBeVisible();
  });
});

// ── 12. Meals Settings Data ──────────────────────────────────────────────────

test.describe('Meals Database', () => {
  test('known meals list is populated', async ({ request }) => {
    const res = await request.get('/api/settings/meals');
    const data = await res.json();
    expect(data.meals.length).toBeGreaterThan(0);
  });

  test('can add a meal manually', async ({ request }) => {
    const meal = { name: `E2E Meal ${Date.now()}`, link: null, notes: 'test', groceries: ['Test Item'] };
    const res = await request.post('/api/settings/meals', { data: meal });
    expect(res.status()).toBe(200);

    const getRes = await request.get('/api/settings/meals');
    const data = await getRes.json();
    const found = data.meals.find((m: any) => m.name === meal.name);
    expect(found).toBeDefined();
  });
});
