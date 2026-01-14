/**
 * Linear GraphQL API Client with OAuth
 *
 * Uses OAuth for authentication.
 * Run `uni linear auth` to authenticate.
 */

import { OAuthClient } from '@uni/shared';

const LINEAR_API = 'https://api.linear.app/graphql';

// Linear OAuth config with embedded defaults
export const linearOAuth = new OAuthClient({
  name: 'linear',
  authUrl: 'https://linear.app/oauth/authorize',
  tokenUrl: 'https://api.linear.app/oauth/token',
  scopes: ['read', 'write'],
  defaultClientId: 'a2c18107bd856c2dbb9da1845c7af278',
  defaultClientSecret: '18265e82181b6416deaf584e71ddb26b',
  envClientId: 'LINEAR_CLIENT_ID',
  envClientSecret: 'LINEAR_CLIENT_SECRET',
  supportsRefresh: false, // Linear tokens don't expire
});

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
  private async query<T>(queryStr: string, variables?: Record<string, unknown>): Promise<T> {
    const token = linearOAuth.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated. Run "uni linear auth" first.');
    }

    const response = await fetch(LINEAR_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: queryStr, variables }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Clear invalid token
        linearOAuth.logout();
        throw new Error('Linear token expired or invalid. Run "uni linear auth" to re-authenticate.');
      }
      throw new Error(`Linear API error: ${response.statusText}`);
    }

    const result = (await response.json()) as GraphQLResponse<T>;

    if (result.errors?.length) {
      throw new Error(`Linear GraphQL error: ${result.errors[0].message}`);
    }

    return result.data as T;
  }

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

  async searchIssues(query: string, limit = 20): Promise<Issue[]> {
    // Linear's search APIs are deprecated, so we filter issues by title/description containing query
    const data = await this.query<{ issues: { nodes: Issue[] } }>(`
      query SearchIssues($first: Int, $filter: IssueFilter) {
        issues(first: $first, filter: $filter) {
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
    `, {
      first: 100, // Fetch more to filter locally
      filter: {
        or: [
          { title: { containsIgnoreCase: query } },
          { description: { containsIgnoreCase: query } },
        ]
      }
    });

    return data.issues.nodes.slice(0, limit);
  }

  // ============================================
  // CYCLES
  // ============================================

  async listCycles(teamId?: string, limit = 20): Promise<Cycle[]> {
    const filter = teamId ? { team: { id: { eq: teamId } } } : undefined;

    const data = await this.query<{ cycles: { nodes: Cycle[] } }>(`
      query Cycles($first: Int, $filter: CycleFilter) {
        cycles(first: $first, filter: $filter, orderBy: createdAt) {
          nodes {
            id
            name
            number
            startsAt
            endsAt
            progress
            completedIssueCountHistory
            team { name key }
          }
        }
      }
    `, { first: limit, filter });

    return data.cycles.nodes;
  }

  async getCurrentCycle(teamId: string): Promise<Cycle | null> {
    const data = await this.query<{ cycles: { nodes: Cycle[] } }>(`
      query CurrentCycle($teamId: String!) {
        cycles(first: 1, filter: { team: { id: { eq: $teamId } }, isActive: { eq: true } }) {
          nodes {
            id
            name
            number
            startsAt
            endsAt
            progress
            team { name key }
          }
        }
      }
    `, { teamId });

    return data.cycles.nodes[0] || null;
  }

  // ============================================
  // LABELS
  // ============================================

  async listLabels(teamId?: string): Promise<Label[]> {
    const filter = teamId ? { team: { id: { eq: teamId } } } : undefined;

    const data = await this.query<{ issueLabels: { nodes: Label[] } }>(`
      query Labels($filter: IssueLabelFilter) {
        issueLabels(filter: $filter) {
          nodes {
            id
            name
            color
            description
            team { name key }
          }
        }
      }
    `, { filter });

    return data.issueLabels.nodes;
  }

  async createLabel(input: { teamId: string; name: string; color?: string; description?: string }): Promise<Label> {
    const data = await this.query<{ issueLabelCreate: { success: boolean; issueLabel: Label } }>(`
      mutation CreateLabel($input: IssueLabelCreateInput!) {
        issueLabelCreate(input: $input) {
          success
          issueLabel {
            id
            name
            color
            description
          }
        }
      }
    `, { input });

    return data.issueLabelCreate.issueLabel;
  }

  async addLabelToIssue(issueId: string, labelId: string): Promise<Issue> {
    const data = await this.query<{ issueUpdate: { success: boolean; issue: Issue } }>(`
      mutation AddLabel($id: String!, $labelIds: [String!]!) {
        issueUpdate(id: $id, input: { labelIds: $labelIds }) {
          success
          issue {
            id
            identifier
            title
            url
          }
        }
      }
    `, { id: issueId, labelIds: [labelId] });

    return data.issueUpdate.issue;
  }

  // ============================================
  // ATTACHMENTS
  // ============================================

  async listAttachments(issueId: string): Promise<Attachment[]> {
    const data = await this.query<{ issue: { attachments: { nodes: Attachment[] } } }>(`
      query IssueAttachments($id: String!) {
        issue(id: $id) {
          attachments {
            nodes {
              id
              title
              url
              createdAt
              creator { name }
            }
          }
        }
      }
    `, { id: issueId });

    return data.issue.attachments.nodes;
  }

  async createAttachment(issueId: string, url: string, title?: string): Promise<Attachment> {
    const data = await this.query<{ attachmentCreate: { success: boolean; attachment: Attachment } }>(`
      mutation CreateAttachment($input: AttachmentCreateInput!) {
        attachmentCreate(input: $input) {
          success
          attachment {
            id
            title
            url
            createdAt
          }
        }
      }
    `, { input: { issueId, url, title: title || url } });

    return data.attachmentCreate.attachment;
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    await this.query(`
      mutation DeleteAttachment($id: String!) {
        attachmentDelete(id: $id) {
          success
        }
      }
    `, { id: attachmentId });
  }
}

export interface Cycle {
  id: string;
  name?: string;
  number: number;
  startsAt: string;
  endsAt: string;
  progress: number;
  completedIssueCountHistory?: number[];
  team: { name: string; key: string };
}

export interface Label {
  id: string;
  name: string;
  color: string;
  description?: string;
  team?: { name: string; key: string };
}

export interface Attachment {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  creator?: { name: string };
}

export const linear = new LinearClient();
