import { test as base, expect } from '@playwright/test';
import { env } from '../config/env.js';
import { AuthClient } from '../api/clients/auth.client.js';
import { TasksClient } from '../api/clients/tasks.client.js';
import { LoginPage } from '../pages/login.page.js';
import { DashboardPage } from '../pages/dashboard.page.js';

export interface CustomFixtures {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  authClient: AuthClient;
  tasksClient: TasksClient;
  authenticatedTasksClient: TasksClient;
  cleanupTaskIds: string[];
}

export const test = base.extend<CustomFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  authClient: async ({ request }, use) => {
    await use(new AuthClient(request));
  },

  tasksClient: async ({ request }, use) => {
    await use(new TasksClient(request));
  },

  authenticatedTasksClient: async ({ request }, use) => {
    const auth = new AuthClient(request);
    const { token } = await auth.login(env.TEST_USER_EMAIL, env.TEST_USER_PASSWORD);
    const tasks = new TasksClient(request);
    tasks.setToken(token);
    await use(tasks);
  },

  cleanupTaskIds: async ({ authenticatedTasksClient }, use) => {
    const ids: string[] = [];
    await use(ids);

    for (const id of ids) {
      await authenticatedTasksClient.deleteRaw(id).catch(() => undefined);
    }
  },
});

export { expect };
