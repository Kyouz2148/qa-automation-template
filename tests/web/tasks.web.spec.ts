import { test, expect } from '@fixtures/test.fixture.js';
import { DataFactory } from '@utils/data-factory.js';

test.describe('Task Board Web E2E @web', () => {
  test('should create a new task through the UI form @smoke', async ({
    dashboardPage,
    authenticatedTasksClient,
    cleanupTaskIds,
  }) => {
    const taskData = DataFactory.buildTask({ priority: 'high' });

    await dashboardPage.open();
    await dashboardPage.createTask(taskData);

    const row = dashboardPage.taskRowByTitle(taskData.title);
    await expect(row).toBeVisible();
    await expect(row).toContainText('high');
    await expect(row).toContainText('pending');

    const { items } = await authenticatedTasksClient.list({ search: taskData.title });
    cleanupTaskIds.push(...items.map((item) => item.id));
  });

  test('should complete and reopen a seeded task via UI', async ({
    dashboardPage,
    authenticatedTasksClient,
    cleanupTaskIds,
  }) => {
    const seeded = await authenticatedTasksClient.create(DataFactory.buildTask());
    cleanupTaskIds.push(seeded.id);

    await dashboardPage.open();
    const row = dashboardPage.taskRowByTitle(seeded.title);
    await expect(row).toBeVisible();

    await dashboardPage.toggleTaskStatus(seeded.title, 'Complete');
    await expect(row).toContainText('done');

    await dashboardPage.toggleTaskStatus(seeded.title, 'Reopen');
    await expect(row).toContainText('pending');
  });

  test('should filter tasks by status and search input', async ({
    dashboardPage,
    authenticatedTasksClient,
    cleanupTaskIds,
  }) => {
    const token = DataFactory.uniqueId('search');
    const first = await authenticatedTasksClient.create(
      DataFactory.buildTask({ title: `Alpha ${token}` }),
    );
    const second = await authenticatedTasksClient.create(
      DataFactory.buildTask({ title: `Beta ${token}` }),
    );
    cleanupTaskIds.push(first.id, second.id);
    await authenticatedTasksClient.update(second.id, { status: 'done' });

    await dashboardPage.open();
    await dashboardPage.searchTasks(token);
    await expect(dashboardPage.taskItems).toHaveCount(2);

    await dashboardPage.filterByStatus('done');
    await expect(dashboardPage.taskItems).toHaveCount(1);
    await expect(dashboardPage.taskRowByTitle(second.title)).toBeVisible();
  });

  test('should delete a task from the board', async ({
    dashboardPage,
    authenticatedTasksClient,
  }) => {
    const seeded = await authenticatedTasksClient.create(DataFactory.buildTask());

    await dashboardPage.open();
    const row = dashboardPage.taskRowByTitle(seeded.title);
    await expect(row).toBeVisible();

    await dashboardPage.deleteTask(seeded.title);
    await expect(row).toBeHidden();
  });
});
