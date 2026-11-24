import { test, expect } from '@fixtures/test.fixture.js';
import { env } from '@config/env.js';

test.describe('Authentication Web Flows @web @smoke', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should show an error alert for invalid credentials', async ({ loginPage }) => {
    await loginPage.open();
    await loginPage.login(env.TEST_USER_EMAIL, 'InvalidPassword!');

    await loginPage.expectError('Invalid email or password');
  });

  test('should sign in, persist session on reload, and sign out', async ({
    page,
    loginPage,
    dashboardPage,
  }) => {
    await loginPage.open();
    await loginPage.login(env.TEST_USER_EMAIL, env.TEST_USER_PASSWORD);

    await expect(dashboardPage.heading).toBeVisible();
    await expect(dashboardPage.userGreeting).toContainText(env.TEST_USER_EMAIL);

    await page.reload();
    await expect(dashboardPage.heading).toBeVisible();

    await dashboardPage.logout();
    await expect(loginPage.heading).toBeVisible();
  });
});
