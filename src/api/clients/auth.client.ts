import { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseApiClient } from './base.client.js';
import {
  LoginResponse,
  LoginResponseSchema,
  MeResponse,
  MeResponseSchema,
} from '../schemas/auth.schema.js';

export class AuthClient extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  async loginRaw(email: string, password: string): Promise<APIResponse> {
    return this.request.post('/api/auth/login', {
      data: { email, password },
    });
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.loginRaw(email, password);
    await this.expectStatus(response, 200);
    const data = await this.parseJson(response, LoginResponseSchema);
    this.setToken(data.token);
    return data;
  }

  async meRaw(): Promise<APIResponse> {
    return this.request.get('/api/auth/me', {
      headers: this.authHeaders(),
    });
  }

  async me(): Promise<MeResponse> {
    const response = await this.meRaw();
    await this.expectStatus(response, 200);
    return this.parseJson(response, MeResponseSchema);
  }

  async logout(): Promise<APIResponse> {
    const response = await this.request.post('/api/auth/logout', {
      headers: this.authHeaders(),
    });
    this.clearToken();
    return response;
  }
}
