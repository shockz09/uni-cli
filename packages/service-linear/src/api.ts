/**
 * Linear GraphQL API Client
 *
 * Uses Personal API Key for authentication.
 * Get your key from: https://linear.app/settings/api
 * Set LINEAR_API_KEY environment variable or in config.
 */

const LINEAR_API = 'https://api.linear.app/graphql';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export interface Issue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  priority: number;
  state: { name: string; color: string };
  assignee?: { name: string; email: string };
  project?: { name: string };
  team: { name: string; key: string };
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  state: string;
  progress: number;
  startDate?: string;
  targetDate?: string;
  lead?: { name: string };
  teams: { nodes: Array<{ name: string }> };
  url: string;
}

export interface Team {
  id: string;
  name: string;
  key: string;
  description?: string;
  issueCount: number;
}

export interface Comment {
  id: string;
  body: string;
  user: { name: string };
  createdAt: string;
}

export interface WorkflowState {
  id: string;
  name: string;
  type: string;
  color: string;
}

export class LinearClient {
  private token: string;

  constructor() {
    this.token = process.env.LINEAR_API_KEY || '';
  }

  hasToken(): boolean {
    return Boolean(this.token);
  }

  private async query<T>(queryStr: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(LINEAR_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.token,
      },
      body: JSON.stringify({ query: queryStr, variables }),
    });

    if (!response.ok) {
      throw new Error(`Linear API error: ${response.statusText}`);
    }

    const result = (await response.json()) as GraphQLResponse<T>;

    if (result.errors?.length) {
      throw new Error(`Linear GraphQL error: ${result.errors[0].message}`);
    }

    return result.data as T;
  }

  /**
   * List issues
   */
  async listIssues(options: { teamId?: string; limit?: number; filter?: string } = {}): Promise<Issue[]> {
    const { teamId, limit = 20, filter } = options;

    let filterObj: Record<string, unknown> = {};
    if (teamId) filterObj.team = { id: { eq: teamId } };
    if (filter === 'open') filterObj.state = { type: { nin: ['completed', 'canceled'] } };
    if (filter === 'closed') filterObj.state = { type: { in: ['completed', 'canceled'] } };

    const data = await this.query<{ issues: { nodes: Issue[] } }>(`
      query Issues($first: Int, $filter: IssueFilter) {
        issues(first: $first, filter: $filter, orderBy: updatedAt) {
          nodes {
            id
            identifier
            title
            description
            priority
            state { name color }
            assignee { name email }
            project { name }
            team { name key }
            createdAt
            updatedAt
            url
          }
        }
      }
    `, { first: limit, filter: Object.keys(filterObj).length ? filterObj : undefined });

    return data.issues.nodes;
  }

  /**
   * Get single issue
   */
  async getIssue(identifier: string): Promise<Issue> {
    const data = await this.query<{ issue: Issue }>(`
      query Issue($id: String!) {
        issue(id: $id) {
          id
          identifier
          title
          description
          priority
          state { name color }
          assignee { name email }
          project { name }
          team { name key }
          createdAt
          updatedAt
          url
        }
      }
    `, { id: identifier });

    return data.issue;
  }

  /**
   * Create issue
   */
  async createIssue(input: {
    teamId: string;
    title: string;
    description?: string;
    priority?: number;
    projectId?: string;
    assigneeId?: string;
  }): Promise<Issue> {
    const data = await this.query<{ issueCreate: { success: boolean; issue: Issue } }>(`
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            title
            url
            state { name }
            team { name key }
          }
        }
      }
    `, { input });

    return data.issueCreate.issue;
  }

  /**
   * Update issue
   */
  async updateIssue(id: string, input: {
    title?: string;
    description?: string;
    priority?: number;
    stateId?: string;
    assigneeId?: string;
  }): Promise<Issue> {
    const data = await this.query<{ issueUpdate: { success: boolean; issue: Issue } }>(`
      mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue {
            id
            identifier
            title
            state { name }
            url
          }
        }
      }
    `, { id, input });

    return data.issueUpdate.issue;
  }

  /**
   * Get workflow states for a team
   */
  async getWorkflowStates(teamId: string): Promise<WorkflowState[]> {
    const data = await this.query<{ team: { states: { nodes: WorkflowState[] } } }>(`
      query TeamStates($teamId: String!) {
        team(id: $teamId) {
          states {
            nodes {
              id
              name
              type
              color
            }
          }
        }
      }
    `, { teamId });

    return data.team.states.nodes;
  }

  /**
   * List projects
   */
  async listProjects(limit = 20): Promise<Project[]> {
    const data = await this.query<{ projects: { nodes: Project[] } }>(`
      query Projects($first: Int) {
        projects(first: $first, orderBy: updatedAt) {
          nodes {
            id
            name
            description
            state
            progress
            startDate
            targetDate
            lead { name }
            teams { nodes { name } }
            url
          }
        }
      }
    `, { first: limit });

    return data.projects.nodes;
  }

  /**
   * List teams
   */
  async listTeams(): Promise<Team[]> {
    const data = await this.query<{ teams: { nodes: Team[] } }>(`
      query Teams {
        teams {
          nodes {
            id
            name
            key
            description
            issueCount
          }
        }
      }
    `);

    return data.teams.nodes;
  }

  /**
   * Get comments on an issue
   */
  async getComments(issueId: string): Promise<Comment[]> {
    const data = await this.query<{ issue: { comments: { nodes: Comment[] } } }>(`
      query IssueComments($id: String!) {
        issue(id: $id) {
          comments {
            nodes {
              id
              body
              user { name }
              createdAt
            }
          }
        }
      }
    `, { id: issueId });

    return data.issue.comments.nodes;
  }

  /**
   * Add comment to issue
   */
  async addComment(issueId: string, body: string): Promise<Comment> {
    const data = await this.query<{ commentCreate: { success: boolean; comment: Comment } }>(`
      mutation CreateComment($input: CommentCreateInput!) {
        commentCreate(input: $input) {
          success
          comment {
            id
            body
            user { name }
            createdAt
          }
        }
      }
    `, { input: { issueId, body } });

    return data.commentCreate.comment;
  }

  /**
   * Search issues
   */
  async searchIssues(query: string, limit = 20): Promise<Issue[]> {
    const data = await this.query<{ searchIssues: { nodes: Issue[] } }>(`
      query SearchIssues($query: String!, $first: Int) {
        searchIssues(query: $query, first: $first) {
          nodes {
            id
            identifier
            title
            description
            state { name color }
            team { name key }
            url
          }
        }
      }
    `, { query, first: limit });

    return data.searchIssues.nodes;
  }
}

export const linear = new LinearClient();
