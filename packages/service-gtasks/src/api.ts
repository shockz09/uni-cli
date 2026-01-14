/**
 * Google Tasks API Client
 *
 * Extends GoogleAuthClient for OAuth handling.
 * Tokens stored in ~/.uni/tokens/gtasks.json
 */

import { GoogleAuthClient } from '@uni/shared';

const SCOPES = ['https://www.googleapis.com/auth/tasks'];

export interface TaskList {
  id: string;
  title: string;
  updated?: string;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  completed?: string;
  updated?: string;
  parent?: string;
  position?: string;
}

interface TaskListResponse {
  items?: TaskList[];
  nextPageToken?: string;
}

interface TaskResponse {
  items?: Task[];
  nextPageToken?: string;
}

export class GTasksClient extends GoogleAuthClient {
  constructor() {
    super({
      serviceName: 'gtasks',
      scopes: SCOPES,
      apiBase: 'https://tasks.googleapis.com/tasks/v1',
    });
  }

  // Task Lists
  async getTaskLists(): Promise<TaskList[]> {
    const response = await this.request<TaskListResponse>('/users/@me/lists');
    return response.items || [];
  }

  async createTaskList(title: string): Promise<TaskList> {
    return this.request<TaskList>('/users/@me/lists', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  async deleteTaskList(listId: string): Promise<void> {
    await this.request(`/users/@me/lists/${listId}`, { method: 'DELETE' });
  }

  // Tasks
  async getTasks(
    listId: string = '@default',
    options: { showCompleted?: boolean; maxResults?: number } = {}
  ): Promise<Task[]> {
    const params = new URLSearchParams({
      maxResults: String(options.maxResults || 100),
      showCompleted: String(options.showCompleted || false),
    });
    const response = await this.request<TaskResponse>(`/lists/${listId}/tasks?${params}`);
    return response.items || [];
  }

  async createTask(
    listId: string = '@default',
    task: { title: string; notes?: string; due?: string }
  ): Promise<Task> {
    return this.request<Task>(`/lists/${listId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updateTask(listId: string, taskId: string, updates: Partial<Task>): Promise<Task> {
    return this.request<Task>(`/lists/${listId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async completeTask(listId: string, taskId: string): Promise<Task> {
    return this.updateTask(listId, taskId, { status: 'completed' });
  }

  async uncompleteTask(listId: string, taskId: string): Promise<Task> {
    return this.updateTask(listId, taskId, { status: 'needsAction' });
  }

  async deleteTask(listId: string, taskId: string): Promise<void> {
    await this.request(`/lists/${listId}/tasks/${taskId}`, { method: 'DELETE' });
  }

  async findTaskByTitle(listId: string, title: string): Promise<Task | null> {
    const tasks = await this.getTasks(listId, { showCompleted: true });
    return tasks.find((t) => t.title.toLowerCase().includes(title.toLowerCase())) || null;
  }

  /**
   * Move task (reorder or change parent)
   */
  async moveTask(listId: string, taskId: string, options: { parent?: string; previous?: string } = {}): Promise<Task> {
    const params = new URLSearchParams();
    if (options.parent) params.set('parent', options.parent);
    if (options.previous) params.set('previous', options.previous);

    return this.request<Task>(`/lists/${listId}/tasks/${taskId}/move?${params}`, {
      method: 'POST',
    });
  }

  /**
   * Clear completed tasks from a list
   */
  async clearCompleted(listId: string): Promise<void> {
    await this.request(`/lists/${listId}/clear`, { method: 'POST' });
  }

  /**
   * Update task list
   */
  async updateTaskList(listId: string, title: string): Promise<TaskList> {
    return this.request<TaskList>(`/users/@me/lists/${listId}`, {
      method: 'PUT',
      body: JSON.stringify({ id: listId, title }),
    });
  }

  /**
   * Get a single task
   */
  async getTask(listId: string, taskId: string): Promise<Task> {
    return this.request<Task>(`/lists/${listId}/tasks/${taskId}`);
  }
}

export const gtasks = new GTasksClient();
