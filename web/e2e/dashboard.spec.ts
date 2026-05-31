import { test, expect } from '@playwright/test';
import { login, createStaticZip } from './helpers';
import * as fs from 'fs';
import * as path from 'path';

const testDir = path.join(__dirname, '..', '..', '.tmp', 'e2e-data');
fs.mkdirSync(testDir, { recursive: true });

test.describe('Dashboard Tests', () => {
  test('should show user dashboard after login', async ({ page }) => {
    const email = `e2e-dashboard-${Date.now()}@example.com`;
    await login(page, email, 'password123', 'E2E Dashboard Test');
    
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should show deployments list', async ({ page }) => {
    const email = `e2e-list-${Date.now()}@example.com`;
    await login(page, email, 'password123', 'E2E List Test');
    
    const zipPath = await createStaticZip(testDir, 'List Demo', 'List Test!');
    await page.click('text=New Deployment');
    await page.setInputFiles('input[type="file"]', zipPath);
    
    await page.waitForTimeout(2000);
    
    await page.reload();
    await expect(page.locator('text=List Demo')).toBeVisible();
  });

  test('should be able to offline a demo', async ({ page }) => {
    const email = `e2e-offline-${Date.now()}@example.com`;
    await login(page, email, 'password123', 'E2E Offline Test');
    
    const zipPath = await createStaticZip(testDir, 'Offline Demo', 'Offline Test!');
    await page.click('text=New Deployment');
    await page.setInputFiles('input[type="file"]', zipPath);
    
    await page.waitForTimeout(2000);
    
    await page.click('button:has-text("Offline")');
    await expect(page.locator('text=Offline')).toBeVisible();
  });
});
