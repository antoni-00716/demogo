# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication & Basic Features >> should load home page
- Location: e2e\auth.spec.ts:12:3

# Error details

```
Error: expect(page).toHaveTitle(expected) failed

Expected pattern: /DemoGo/
Received string:  "Error"
Timeout: 5000ms

Call log:
  - Expect "toHaveTitle" with timeout 5000ms
    14 × unexpected value "Error"

```

```yaml
- text: Cannot GET /
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import * as fs from 'fs';
  3  | import * as path from 'path';
  4  | import { fileURLToPath } from 'url';
  5  | const __filename = fileURLToPath(import.meta.url);
  6  | const __dirname = path.dirname(__filename);
  7  | 
  8  | const testDir = path.join(__dirname, '../../.tmp/e2e-data');
  9  | fs.mkdirSync(testDir, { recursive: true });
  10 | 
  11 | test.describe('Authentication & Basic Features', () => {
  12 |   test('should load home page', async ({ page }) => {
  13 |     await page.goto('/');
> 14 |     await expect(page).toHaveTitle(/DemoGo/);
     |                        ^ Error: expect(page).toHaveTitle(expected) failed
  15 |   });
  16 | 
  17 |   test('should navigate to login page', async ({ page }) => {
  18 |     await page.goto('/');
  19 |     await page.click('text=Login');
  20 |     await expect(page).toHaveURL(/login.html/);
  21 |   });
  22 | 
  23 |   test('should register a new user', async ({ page }) => {
  24 |     const email = `test-${Date.now()}@example.com`;
  25 |     await page.goto('/login.html');
  26 |     await page.click('text=Sign up');
  27 |     await page.fill('input[type="email"]', email);
  28 |     await page.fill('input[type="password"]', 'password123');
  29 |     await page.click('button:has-text("Sign up")');
  30 |     await page.waitForURL(/app.html/, { timeout: 15000 });
  31 |   });
  32 | 
  33 |   test('should login existing user', async ({ page }) => {
  34 |     const email = `login-test-${Date.now()}@example.com`;
  35 |     
  36 |     // Register first
  37 |     await page.goto('/login.html');
  38 |     await page.click('text=Sign up');
  39 |     await page.fill('input[type="email"]', email);
  40 |     await page.fill('input[type="password"]', 'password123');
  41 |     await page.click('button:has-text("Sign up")');
  42 |     await page.waitForURL(/app.html/, { timeout: 15000 });
  43 |     
  44 |     // Logout
  45 |     await page.click('text=Logout');
  46 |     await expect(page).toHaveURL(/login.html/);
  47 |     
  48 |     // Login again
  49 |     await page.fill('input[type="email"]', email);
  50 |     await page.fill('input[type="password"]', 'password123');
  51 |     await page.click('button:has-text("Sign in")');
  52 |     await page.waitForURL(/app.html/, { timeout: 15000 });
  53 |   });
  54 | });
  55 | 
```