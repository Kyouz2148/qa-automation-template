import http from 'k6/http';
import { check } from 'k6';

export function loginAndGetToken(baseUrl, email, password) {
  const res = http.post(`${baseUrl}/api/auth/login`, JSON.stringify({ email, password }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'auth_login' },
  });

  const ok = check(res, {
    'auth login status is 200': (r) => r.status === 200,
    'auth login returns token': (r) => Boolean(r.json('token')),
  });

  if (!ok) {
    throw new Error(`k6 login failed: status=${res.status} body=${res.body}`);
  }

  return res.json('token');
}

export function authHeaders(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
}
