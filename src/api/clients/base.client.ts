import { APIRequestContext, APIResponse, expect } from '@playwright/test';
import { ZodType } from 'zod';

export class BaseApiClient {
  protected token?: string;

  constructor(protected readonly request: APIRequestContext) {}

  setToken(token: string): void {
    this.token = token;
  }

  clearToken(): void {
    this.token = undefined;
  }

  protected authHeaders(): Record<string, string> {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  async parseJson<T>(response: APIResponse, schema: ZodType<T>): Promise<T> {
    const rawText = await response.text();
    let json: unknown;
    try {
      json = JSON.parse(rawText);
    } catch {
      throw new Error(
        `Expected JSON response from ${response.url()} (status ${response.status()}), got: ${rawText}`,
      );
    }

    const result = schema.safeParse(json);
    if (!result.success) {
      throw new Error(
        `Contract validation failed for ${response.url()} (${response.status()}): ${JSON.stringify(result.error.format())}`,
      );
    }
    return result.data;
  }

  async expectStatus(response: APIResponse, expectedStatus: number): Promise<void> {
    const actual = response.status();
    if (actual !== expectedStatus) {
      const body = await response.text();
      expect(
        actual,
        `Unexpected HTTP status from ${response.url()}: expected ${expectedStatus}, got ${actual}. Body: ${body}`,
      ).toBe(expectedStatus);
    }
  }
}
