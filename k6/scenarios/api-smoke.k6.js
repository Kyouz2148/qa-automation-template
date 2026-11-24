import http from 'k6/http';
import { check, sleep } from 'k6';
import { config } from '../config/env.js';
import { getProfileOptions } from '../config/options.js';
import { authHeaders, loginAndGetToken } from '../lib/auth.js';
import { createSummaryHandler } from '../lib/summary.js';

export const options = getProfileOptions('smoke');

export function setup() {
  const token = loginAndGetToken(config.baseUrl, config.email, config.password);
  return { token };
}

export default function (data) {
  const healthRes = http.get(`${config.baseUrl}/api/health`, {
    tags: { endpoint: 'health' },
  });
  check(healthRes, {
    'health is 200': (r) => r.status === 200,
    'health status ok': (r) => r.json('status') === 'ok',
  });

  const tasksRes = http.get(`${config.baseUrl}/api/tasks`, {
    ...authHeaders(data.token),
    tags: { endpoint: 'tasks_list' },
  });
  check(tasksRes, {
    'tasks list is 200': (r) => r.status === 200,
    'tasks payload has items array': (r) => Array.isArray(r.json('items')),
  });

  sleep(0.5);
}

export const handleSummary = createSummaryHandler('API Smoke');
