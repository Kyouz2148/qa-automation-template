import { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseApiClient } from './base.client.js';
import {
  CreateTaskPayload,
  Task,
  TaskItemResponseSchema,
  TaskListResponseSchema,
  TaskPriority,
  TaskStatus,
  UpdateTaskPayload,
} from '../schemas/task.schema.js';

export interface ListTasksFilter {
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
}

export class TasksClient extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  async listRaw(filters: ListTasksFilter = {}): Promise<APIResponse> {
    const params: Record<string, string> = {};
    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority;
    if (filters.search) params.search = filters.search;

    return this.request.get('/api/tasks', {
      headers: this.authHeaders(),
      params,
    });
  }

  async list(filters: ListTasksFilter = {}): Promise<{ items: Task[]; total: number }> {
    const response = await this.listRaw(filters);
    await this.expectStatus(response, 200);
    return this.parseJson(response, TaskListResponseSchema);
  }

  async createRaw(payload: CreateTaskPayload | Record<string, unknown>): Promise<APIResponse> {
    return this.request.post('/api/tasks', {
      headers: this.authHeaders(),
      data: payload,
    });
  }

  async create(payload: CreateTaskPayload): Promise<Task> {
    const response = await this.createRaw(payload);
    await this.expectStatus(response, 201);
    const { task } = await this.parseJson(response, TaskItemResponseSchema);
    return task;
  }

  async getByIdRaw(id: string): Promise<APIResponse> {
    return this.request.get(`/api/tasks/${id}`, {
      headers: this.authHeaders(),
    });
  }

  async getById(id: string): Promise<Task> {
    const response = await this.getByIdRaw(id);
    await this.expectStatus(response, 200);
    const { task } = await this.parseJson(response, TaskItemResponseSchema);
    return task;
  }

  async updateRaw(id: string, payload: UpdateTaskPayload): Promise<APIResponse> {
    return this.request.patch(`/api/tasks/${id}`, {
      headers: this.authHeaders(),
      data: payload,
    });
  }

  async update(id: string, payload: UpdateTaskPayload): Promise<Task> {
    const response = await this.updateRaw(id, payload);
    await this.expectStatus(response, 200);
    const { task } = await this.parseJson(response, TaskItemResponseSchema);
    return task;
  }

  async deleteRaw(id: string): Promise<APIResponse> {
    return this.request.delete(`/api/tasks/${id}`, {
      headers: this.authHeaders(),
    });
  }

  async delete(id: string): Promise<void> {
    const response = await this.deleteRaw(id);
    await this.expectStatus(response, 204);
  }
}
