export const config = {
  baseUrl: __ENV.API_URL || __ENV.BASE_URL || 'http://127.0.0.1:4173',
  email: __ENV.TEST_USER_EMAIL || 'qa.engineer@example.com',
  password: __ENV.TEST_USER_PASSWORD || 'Password123!',
  profile: (__ENV.K6_PROFILE || 'load').toLowerCase(),
};
