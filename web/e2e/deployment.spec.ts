import { test, expect } from '@playwright/test';

test.describe('Project Deployment', () => {
  test('should display dashboard after login', async ({ page }) => {
    const email = `deploy-test-${Date.now()}@example.com`;
    await page.goto('/login.html');
    await page.click('text=Sign up');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign up")');
    await page.waitForURL(/app.html/, { timeout: 15000 });
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should show project list', async ({ page }) => {
    const email = `list-test-${Date.now()}@example.com`;
    await page.goto('/login.html');
    await page.click('text=Sign up');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign up")');
    await page.waitForURL(/app.html/, { timeout: 15000 });
    await expect(page.locator('text=My Projects')).toBeVisible();
  });
});
