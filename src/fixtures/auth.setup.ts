import { test as setup, expect } from '@playwright/test';
import { AUTH_STATE_PATH, env } from '../config/env.js';
import { LoginPage } from '../pages/login.page.js';
import { DashboardPage } from '../pages/dashboard.page.js';

setup('authenticate and persist storageState', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  await loginPage.open();
  await loginPage.login(env.TEST_USER_EMAIL, env.TEST_USER_PASSWORD);

  await expect(dashboardPage.heading).toBeVisible();
  await expect(dashboardPage.userGreeting).toContainText(env.TEST_USER_EMAIL);

  await page.context().storageState({ path: AUTH_STATE_PATH });
});
