/**
 * Todoist REST API v2 Client with OAuth
 *
 * Uses OAuth for authentication.
 * Run `uni todoist auth` to authenticate.
 */

import { OAuthClient } from '@uni/shared';

const TODOIST_API = 'https://api.todoist.com/rest/v2';

// Todoist OAuth config with embedded defaults
export const todoistOAuth = new OAuthClient({
  name: 'todoist',
  authUrl: 'https://todoist.com/oauth/authorize',
  tokenUrl: 'https://todoist.com/oauth/access_token',
  scopes: ['data:read_write'],
  defaultClientId: 'a3edd97ce4284cd68a0e027feb835e1f',
  defaultClientSecret: '23b6590c692f4230a396ca8e30bdf963',
  envClientId: 'TODOIST_CLIENT_ID',
  envClientSecret: 'TODOIST_CLIENT_SECRET',
  supportsRefresh: false, // Todoist tokens don't expire
});

export interface Task {
  id: string;
  content: string;
  description: string;
  project_id: string;
  section_id?: string;
  parent_id?: string;
  order: number;
  priority: number;
  due?: {
    date: string;
    string: string;
    datetime?: string;
    timezone?: string;
    is_recurring: boolean;
  };
  labels: string[];
  is_completed: boolean;
  created_at: string;
  url: string;
}

export interface Project {
  id: string;
  name: string;
  comment_count: number;
  order: number;
  color: string;
  is_shared: boolean;
  is_favorite: boolean;
  is_inbox_project: boolean;
  view_style: string;
  url: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  order: number;
  is_favorite: boolean;
}

export interface Comment {
  id: string;
  task_id?: string;
  project_id?: string;
  content: string;
  posted_at: string;
}

export class TodoistClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = todoistOAuth.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated. Run "uni todoist auth" first.');
    }

    const response = await fetch(`${TODOIST_API}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Todoist API error: ${error || response.statusText}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  // ========== Tasks ==========

  async listTasks(options: { projectId?: string; filter?: string } = {}): Promise<Task[]> {
    const params = new URLSearchParams();
    if (options.projectId) params.append('project_id', options.projectId);
    if (options.filter) params.append('filter', options.filter);

    const queryString = params.toString();
    return this.request<Task[]>(`/tasks${queryString ? `?${queryString}` : ''}`);
  }

  async getTask(taskId: string): Promise<Task> {
    return this.request<Task>(`/tasks/${taskId}`);
  }

  async createTask(input: {
    content: string;
    description?: string;
    project_id?: string;
    priority?: number;
    due_string?: string;
    due_date?: string;
    labels?: string[];
  }): Promise<Task> {
    return this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateTask(taskId: string, input: {
    content?: string;
    description?: string;
    priority?: number;
    due_string?: string;
    due_date?: string;
    labels?: string[];
  }): Promise<Task> {
    return this.request<Task>(`/tasks/${taskId}`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async closeTask(taskId: string): Promise<void> {
    await this.request<void>(`/tasks/${taskId}/close`, { method: 'POST' });
  }

  async reopenTask(taskId: string): Promise<void> {
    await this.request<void>(`/tasks/${taskId}/reopen`, { method: 'POST' });
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.request<void>(`/tasks/${taskId}`, { method: 'DELETE' });
  }

  // ========== Projects ==========

  async listProjects(): Promise<Project[]> {
    return this.request<Project[]>('/projects');
  }

  async getProject(projectId: string): Promise<Project> {
    return this.request<Project>(`/projects/${projectId}`);
  }

  async createProject(input: {
    name: string;
    color?: string;
    is_favorite?: boolean;
    view_style?: 'list' | 'board';
  }): Promise<Project> {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.request<void>(`/projects/${projectId}`, { method: 'DELETE' });
  }

  // ========== Labels ==========

  async listLabels(): Promise<Label[]> {
    return this.request<Label[]>('/labels');
  }

  async createLabel(input: {
    name: string;
    color?: string;
    is_favorite?: boolean;
  }): Promise<Label> {
    return this.request<Label>('/labels', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async deleteLabel(labelId: string): Promise<void> {
    await this.request<void>(`/labels/${labelId}`, { method: 'DELETE' });
  }

  // ========== Comments ==========

  async listComments(options: { task_id?: string; project_id?: string }): Promise<Comment[]> {
    const params = new URLSearchParams();
    if (options.task_id) params.append('task_id', options.task_id);
    if (options.project_id) params.append('project_id', options.project_id);

    return this.request<Comment[]>(`/comments?${params.toString()}`);
  }

  async addComment(input: {
    task_id?: string;
    project_id?: string;
    content: string;
  }): Promise<Comment> {
    return this.request<Comment>('/comments', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async deleteComment(commentId: string): Promise<void> {
    await this.request<void>(`/comments/${commentId}`, { method: 'DELETE' });
  }

  // ========== Sections ==========

  async listSections(projectId?: string): Promise<Section[]> {
    const params = projectId ? `?project_id=${projectId}` : '';
    return this.request<Section[]>(`/sections${params}`);
  }

  async getSection(sectionId: string): Promise<Section> {
    return this.request<Section>(`/sections/${sectionId}`);
  }

  async createSection(input: {
    project_id: string;
    name: string;
    order?: number;
  }): Promise<Section> {
    return this.request<Section>('/sections', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateSection(sectionId: string, name: string): Promise<Section> {
    return this.request<Section>(`/sections/${sectionId}`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async deleteSection(sectionId: string): Promise<void> {
    await this.request<void>(`/sections/${sectionId}`, { method: 'DELETE' });
  }

  // ========== Shared Labels ==========

  async getLabel(labelId: string): Promise<Label> {
    return this.request<Label>(`/labels/${labelId}`);
  }

  async updateLabel(labelId: string, input: {
    name?: string;
    color?: string;
    is_favorite?: boolean;
  }): Promise<Label> {
    return this.request<Label>(`/labels/${labelId}`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // ========== Quick Add ==========

  async quickAddTask(text: string): Promise<Task> {
    // Uses natural language processing for due dates etc.
    return this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify({ content: text }),
    });
  }
}

export interface Section {
  id: string;
  project_id: string;
  order: number;
  name: string;
}

export const todoist = new TodoistClient();
