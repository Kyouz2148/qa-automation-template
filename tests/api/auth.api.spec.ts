import { test, expect } from '@fixtures/test.fixture.js';
import { env } from '@config/env.js';
import { ErrorResponseSchema } from '@api/schemas/auth.schema.js';

test.describe('Auth API @api @smoke', () => {
  test('should authenticate with valid credentials and return user profile', async ({
    authClient,
  }) => {
    const loginData = await authClient.login(env.TEST_USER_EMAIL, env.TEST_USER_PASSWORD);
    expect(loginData.user.email).toBe(env.TEST_USER_EMAIL);
    expect(loginData.token.length).toBeGreaterThan(10);

    const meData = await authClient.me();
    expect(meData.user.id).toBe(loginData.user.id);
    expect(meData.user.email).toBe(env.TEST_USER_EMAIL);
  });

  test('should reject invalid password with 401 and error contract', async ({ authClient }) => {
    const response = await authClient.loginRaw(env.TEST_USER_EMAIL, 'WrongPassword999!');
    expect(response.status()).toBe(401);

    const errorPayload = await authClient.parseJson(response, ErrorResponseSchema);
    expect(errorPayload.error).toContain('Invalid');
  });

  test('should reject missing credentials with 400', async ({ request, authClient }) => {
    const response = await request.post('/api/auth/login', {
      data: { email: env.TEST_USER_EMAIL },
    });
    expect(response.status()).toBe(400);

    const errorPayload = await authClient.parseJson(response, ErrorResponseSchema);
    expect(errorPayload.error).toBeTruthy();
  });

  test('should deny access to /api/auth/me without bearer token', async ({ authClient }) => {
    const response = await authClient.meRaw();
    expect(response.status()).toBe(401);

    const errorPayload = await authClient.parseJson(response, ErrorResponseSchema);
    expect(errorPayload.error).toBe('Unauthorized');
  });

  test('should invalidate token after logout', async ({ authClient }) => {
    const { token } = await authClient.login(env.TEST_USER_EMAIL, env.TEST_USER_PASSWORD);
    const logoutRes = await authClient.logout();
    expect(logoutRes.status()).toBe(200);

    authClient.setToken(token);
    const meAfterLogout = await authClient.meRaw();
    expect(meAfterLogout.status()).toBe(401);
  });
});
