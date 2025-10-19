import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Determine which environment to load
const envName = process.env.BASE_URL_ENV || 'QA'; // default to QA
const envPath = path.resolve(__dirname, 'configuration', `.env.${envName.toLowerCase()}`);
dotenv.config({ path: envPath });


export default defineConfig({
  //testDir: './tests',

  testMatch: '**/*.{spec,accessibility,test}.ts',

  expect: {
    timeout: 5000, // 5 seconds for expect()
  },

  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  //forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 3 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { open: 'always' }],
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    screenshot: 'only-on-failure',
    baseURL:process.env.BASE_URL,
    viewport: { width: 1920, height: 1080 },
    headless: true,
    locale: 'cs-CZ',               // Czech locale
    timezoneId: 'Europe/Prague',   // Timezone for Prague
    geolocation: { longitude: 14.418540, latitude: 50.073658 }, // geolocation for Prague
    permissions: ['geolocation'],

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ]
});
