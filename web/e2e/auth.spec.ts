import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testDir = path.join(__dirname, '../../.tmp/e2e-data');
fs.mkdirSync(testDir, { recursive: true });

test.describe('Authentication & Basic Features', () => {
  test('should load home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/DemoGo/);
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Login');
    await expect(page).toHaveURL(/login.html/);
  });

  test('should register a new user', async ({ page }) => {
    const email = `test-${Date.now()}@example.com`;
    await page.goto('/login.html');
    await page.click('text=Sign up');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign up")');
    await page.waitForURL(/app.html/, { timeout: 15000 });
  });

  test('should login existing user', async ({ page }) => {
    const email = `login-test-${Date.now()}@example.com`;
    
    // Register first
    await page.goto('/login.html');
    await page.click('text=Sign up');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign up")');
    await page.waitForURL(/app.html/, { timeout: 15000 });
    
    // Logout
    await page.click('text=Logout');
    await expect(page).toHaveURL(/login.html/);
    
    // Login again
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL(/app.html/, { timeout: 15000 });
  });
});
