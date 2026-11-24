import { defineConfig, devices } from '@playwright/test';
import { AUTH_STATE_PATH, env } from './src/config/env.js';

const isCI = Boolean(process.env.CI);
const isShardedRun = process.env.PW_SHARD_MODE === 'true';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? env.CI_WORKERS : undefined,
  timeout: env.TEST_TIMEOUT_MS,
  expect: {
    timeout: env.EXPECT_TIMEOUT_MS,
  },
  outputDir: 'test-results',

  reporter: isShardedRun
    ? [['blob', { outputDir: 'blob-report' }], ['github']]
    : [
        ['list'],
        ['html', { outputFolder: 'reports/html', open: 'never' }],
        ['json', { outputFile: 'reports/results.json' }],
      ],

  use: {
    baseURL: env.BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: 'setup',
      testDir: './src/fixtures',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'api',
      testMatch: /tests\/api\/.*\.spec\.ts/,
      use: {
        baseURL: env.API_URL,
      },
    },
    {
      name: 'web-chromium',
      testMatch: /tests\/web\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_STATE_PATH,
      },
    },
    {
      name: 'web-firefox',
      testMatch: /tests\/web\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Firefox'],
        storageState: AUTH_STATE_PATH,
      },
    },
    {
      name: 'web-webkit',
      testMatch: /tests\/web\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Safari'],
        storageState: AUTH_STATE_PATH,
      },
    },
  ],

  webServer: env.USE_DEMO_APP
    ? {
        command: 'node demo-app/server.mjs',
        url: 'http://127.0.0.1:4173/api/health',
        reuseExistingServer: !isCI,
        timeout: 30_000,
      }
    : undefined,
});
