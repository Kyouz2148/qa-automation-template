import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './base.page.js';
import { TaskPriority } from '../api/schemas/task.schema.js';

export class DashboardPage extends BasePage {
  readonly heading: Locator;
  readonly userGreeting: Locator;
  readonly logoutButton: Locator;
  readonly titleInput: Locator;
  readonly prioritySelect: Locator;
  readonly descriptionInput: Locator;
  readonly addTaskButton: Locator;
  readonly statusFilterSelect: Locator;
  readonly searchInput: Locator;
  readonly taskList: Locator;
  readonly taskItems: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Task Board' });
    this.userGreeting = page.locator('#user-greeting');
    this.logoutButton = page.getByRole('button', { name: 'Sign out' });
    this.titleInput = page.getByLabel('Task Title');
    this.prioritySelect = page.getByLabel('Priority');
    this.descriptionInput = page.getByLabel('Description');
    this.addTaskButton = page.getByRole('button', { name: 'Add Task' });
    this.statusFilterSelect = page.getByLabel('Filter by status');
    this.searchInput = page.getByLabel('Search tasks');
    this.taskList = page.locator('#task-list');
    this.taskItems = this.taskList.getByRole('listitem');
    this.emptyState = page.getByText('No tasks match the current filter.');
  }

  async open(): Promise<void> {
    await this.goto('/');
    await expect(this.heading).toBeVisible();
  }

  async createTask(params: {
    title: string;
    priority?: TaskPriority;
    description?: string;
  }): Promise<void> {
    await this.titleInput.fill(params.title);
    if (params.priority) {
      await this.prioritySelect.selectOption(params.priority);
    }
    if (params.description) {
      await this.descriptionInput.fill(params.description);
    }
    await this.addTaskButton.click();
  }

  taskRowByTitle(title: string): Locator {
    return this.taskItems.filter({ hasText: title });
  }

  async toggleTaskStatus(title: string, action: 'Complete' | 'Reopen'): Promise<void> {
    await this.page.getByRole('button', { name: `${action} ${title}` }).click();
  }

  async deleteTask(title: string): Promise<void> {
    await this.page.getByRole('button', { name: `Delete ${title}` }).click();
  }

  async filterByStatus(status: 'all' | 'pending' | 'done'): Promise<void> {
    await this.statusFilterSelect.selectOption(status);
  }

  async searchTasks(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }
}
