import { Page } from '@playwright/test';
import * as JSZip from 'jszip';
import * as fs from 'fs';
import * as path from 'path';

export async function createStaticZip(
  dirPath: string,
  name: string = 'Test Demo',
  content: string = 'E2E Test Demo'
): Promise<string> {
  const zip = new JSZip();
  zip.file('index.html', `<!doctype html><html><head><title>${name}</title></head><body><h1>${content}</h1></body></html>`);
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const zipPath = path.join(dirPath, `test-${Date.now()}.zip`);
  fs.writeFileSync(zipPath, zipBuffer);
  return zipPath;
}

export async function login(
  page: Page,
  email: string = `e2e-test-${Date.now()}@example.com`,
  password: string = 'password123'
): Promise<void> {
  await page.goto('/login.html');
  await page.click('text=Sign up');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Sign up")');
  await page.waitForURL(/app.html/, { timeout: 15000 });
}

export async function loginWithCredentials(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/login.html');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL(/app.html/, { timeout: 15000 });
}
