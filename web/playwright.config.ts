import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3121',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'cd ..\\server && node src/server.js',
      url: 'http://localhost:3121/api/health',
      env: {
        PORT: '3121',
        PUBLIC_BASE_URL: 'http://localhost:3121',
        DEMOGO_DATA_DIR: '../.tmp/e2e-data',
        DEMOGO_UPLOAD_DIR: '../.tmp/e2e-uploads',
        DEMOGO_DEMO_ROOT: '../.tmp/e2e-demos',
        DEMOGO_ADMIN_USER: 'admin',
        DEMOGO_ADMIN_PASSWORD: 'admin-test-pass',
        DEMOGO_EMAIL_VERIFICATION_ENABLED: '0',
        DEMOGO_DEPLOY_RATE_LIMIT: '100',
      },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
