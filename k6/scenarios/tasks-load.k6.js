import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { config } from '../config/env.js';
import { getProfileOptions } from '../config/options.js';
import { authHeaders, loginAndGetToken } from '../lib/auth.js';
import { createSummaryHandler } from '../lib/summary.js';

const taskCreateDuration = new Trend('task_create_duration', true);
const taskListDuration = new Trend('task_list_duration', true);
const businessErrors = new Rate('business_errors');
const tasksCreatedTotal = new Counter('tasks_created_total');

const baseOptions = getProfileOptions(config.profile);

export const options = {
  ...baseOptions,
  thresholds: {
    ...baseOptions.thresholds,
    task_create_duration: ['p(95)<300'],
    task_list_duration: ['p(95)<250'],
    business_errors: ['rate<0.01'],
  },
};

export function setup() {
  const token = loginAndGetToken(config.baseUrl, config.email, config.password);
  return { token };
}

export default function (data) {
  const params = authHeaders(data.token);
  let createdTaskId = null;

  group('Create and read task lifecycle', () => {
    const title = `k6 Load Task VU${__VU}-Iter${__ITER}`;
    const createRes = http.post(
      `${config.baseUrl}/api/tasks`,
      JSON.stringify({
        title,
        priority: 'medium',
        description: 'Created during k6 load test',
      }),
      { ...params, tags: { endpoint: 'tasks_create' } },
    );

    taskCreateDuration.add(createRes.timings.duration);
    const createdOk = check(createRes, {
      'POST /api/tasks returns 201': (r) => r.status === 201,
      'POST /api/tasks returns id': (r) => Boolean(r.json('task.id')),
    });
    businessErrors.add(!createdOk);

    if (createdOk) {
      tasksCreatedTotal.add(1);
      createdTaskId = createRes.json('task.id');
    }

    const listRes = http.get(`${config.baseUrl}/api/tasks?status=pending`, {
      ...params,
      tags: { endpoint: 'tasks_list' },
    });
    taskListDuration.add(listRes.timings.duration);
    const listOk = check(listRes, {
      'GET /api/tasks returns 200': (r) => r.status === 200,
    });
    businessErrors.add(!listOk);
  });

  if (createdTaskId) {
    group('Update and cleanup task', () => {
      const patchRes = http.patch(
        `${config.baseUrl}/api/tasks/${createdTaskId}`,
        JSON.stringify({ status: 'done' }),
        { ...params, tags: { endpoint: 'tasks_patch' } },
      );
      const patchOk = check(patchRes, {
        'PATCH /api/tasks/:id returns 200': (r) => r.status === 200,
      });
      businessErrors.add(!patchOk);

      const delRes = http.del(`${config.baseUrl}/api/tasks/${createdTaskId}`, null, {
        ...params,
        tags: { endpoint: 'tasks_delete' },
      });
      const delOk = check(delRes, {
        'DELETE /api/tasks/:id returns 204': (r) => r.status === 204,
      });
      businessErrors.add(!delOk);
    });
  }

  sleep(0.3);
}

export const handleSummary = createSummaryHandler(`Tasks Load (${config.profile})`);
