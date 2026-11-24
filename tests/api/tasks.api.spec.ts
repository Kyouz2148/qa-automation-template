import { test, expect } from '@fixtures/test.fixture.js';
import { DataFactory } from '@utils/data-factory.js';
import { ErrorResponseSchema } from '@api/schemas/auth.schema.js';

test.describe('Tasks API @api', () => {
  test('should complete full CRUD lifecycle with contract validation @smoke', async ({
    authenticatedTasksClient,
    cleanupTaskIds,
  }) => {
    const payload = DataFactory.buildTask({ priority: 'high' });

    const created = await authenticatedTasksClient.create(payload);
    cleanupTaskIds.push(created.id);

    expect(created.title).toBe(payload.title);
    expect(created.priority).toBe('high');
    expect(created.status).toBe('pending');

    const fetched = await authenticatedTasksClient.getById(created.id);
    expect(fetched.id).toBe(created.id);

    const updated = await authenticatedTasksClient.update(created.id, {
      status: 'done',
      title: `${payload.title} (Updated)`,
    });
    expect(updated.status).toBe('done');
    expect(updated.title).toContain('(Updated)');

    await authenticatedTasksClient.delete(created.id);
    const afterDelete = await authenticatedTasksClient.getByIdRaw(created.id);
    expect(afterDelete.status()).toBe(404);
  });

  test('should filter tasks by status and search query', async ({
    authenticatedTasksClient,
    cleanupTaskIds,
  }) => {
    const uniqueKey = DataFactory.uniqueId('filter');
    const pendingTask = await authenticatedTasksClient.create(
      DataFactory.buildTask({ title: `Pending ${uniqueKey}` }),
    );
    const doneTask = await authenticatedTasksClient.create(
      DataFactory.buildTask({ title: `Done ${uniqueKey}` }),
    );
    cleanupTaskIds.push(pendingTask.id, doneTask.id);

    await authenticatedTasksClient.update(doneTask.id, { status: 'done' });

    const doneList = await authenticatedTasksClient.list({
      status: 'done',
      search: uniqueKey,
    });
    expect(doneList.items.map((t) => t.id)).toEqual([doneTask.id]);
    expect(doneList.total).toBe(1);
  });

  test('should return 400 when task title is too short', async ({ authenticatedTasksClient }) => {
    const response = await authenticatedTasksClient.createRaw({ title: 'ab' });
    expect(response.status()).toBe(400);

    const err = await authenticatedTasksClient.parseJson(response, ErrorResponseSchema);
    expect(err.error).toContain('at least 3 characters');
  });

  test('should return 404 for unknown task ID', async ({ authenticatedTasksClient }) => {
    const response = await authenticatedTasksClient.getByIdRaw('tsk_does_not_exist');
    expect(response.status()).toBe(404);
  });

  test('should reject unauthenticated requests to /api/tasks', async ({ tasksClient }) => {
    const response = await tasksClient.listRaw();
    expect(response.status()).toBe(401);
  });
});
