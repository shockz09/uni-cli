/**
 * Notion API Client
 *
 * Uses Notion Integration Token for authentication.
 * Set NOTION_TOKEN environment variable.
 * Create integration: https://www.notion.so/my-integrations
 */

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

interface NotionResponse {
  object: string;
  results?: unknown[];
  next_cursor?: string | null;
  has_more?: boolean;
}

interface Database {
  id: string;
  title: Array<{ plain_text: string }>;
  description?: Array<{ plain_text: string }>;
  url: string;
  created_time: string;
  last_edited_time: string;
}

interface Page {
  id: string;
  url: string;
  created_time: string;
  last_edited_time: string;
  properties: Record<string, unknown>;
  parent: { type: string; database_id?: string; page_id?: string };
}

interface Block {
  id: string;
  type: string;
  has_children: boolean;
  [key: string]: unknown;
}

interface SearchResult {
  object: 'page' | 'database';
  id: string;
  url: string;
  title?: string;
}

export class NotionClient {
  private token: string;

  constructor() {
    this.token = process.env.NOTION_TOKEN || '';
  }

  hasToken(): boolean {
    return Boolean(this.token);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${NOTION_API}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { message?: string };
      throw new Error(`Notion API error: ${error.message || response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Search Notion
   */
  async search(query: string, options: { filter?: 'page' | 'database'; pageSize?: number } = {}): Promise<SearchResult[]> {
    const { filter, pageSize = 20 } = options;

    const body: Record<string, unknown> = {
      query,
      page_size: pageSize,
    };

    if (filter) {
      body.filter = { property: 'object', value: filter };
    }

    const response = await this.request<NotionResponse & { results: Array<Page | Database> }>(
      '/search',
      { method: 'POST', body: JSON.stringify(body) }
    );

    return (response.results || []).map((item: Page | Database) => {
      const isDatabase = 'title' in item && Array.isArray(item.title);
      return {
        object: isDatabase ? 'database' : 'page',
        id: item.id,
        url: item.url,
        title: isDatabase
          ? (item as Database).title?.[0]?.plain_text
          : this.extractPageTitle(item as Page),
      } as SearchResult;
    });
  }

  /**
   * Get a page
   */
  async getPage(pageId: string): Promise<Page> {
    return this.request<Page>(`/pages/${pageId}`);
  }

  /**
   * Get page content (blocks)
   */
  async getPageContent(pageId: string): Promise<Block[]> {
    const response = await this.request<NotionResponse & { results: Block[] }>(
      `/blocks/${pageId}/children`
    );
    return response.results || [];
  }

  /**
   * Create a page
   */
  async createPage(
    parent: { database_id: string } | { page_id: string },
    properties: Record<string, unknown>,
    children?: unknown[]
  ): Promise<Page> {
    const body: Record<string, unknown> = { parent, properties };
    if (children) {
      body.children = children;
    }

    return this.request<Page>('/pages', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Query a database
   */
  async queryDatabase(
    databaseId: string,
    options: { filter?: unknown; sorts?: unknown[]; pageSize?: number } = {}
  ): Promise<Page[]> {
    const { filter, sorts, pageSize = 20 } = options;

    const body: Record<string, unknown> = { page_size: pageSize };
    if (filter) body.filter = filter;
    if (sorts) body.sorts = sorts;

    const response = await this.request<NotionResponse & { results: Page[] }>(
      `/databases/${databaseId}/query`,
      { method: 'POST', body: JSON.stringify(body) }
    );

    return response.results || [];
  }

  /**
   * Get database info
   */
  async getDatabase(databaseId: string): Promise<Database> {
    return this.request<Database>(`/databases/${databaseId}`);
  }

  /**
   * List databases (via search)
   */
  async listDatabases(pageSize = 20): Promise<Database[]> {
    const response = await this.request<NotionResponse & { results: Database[] }>(
      '/search',
      {
        method: 'POST',
        body: JSON.stringify({
          filter: { property: 'object', value: 'database' },
          page_size: pageSize,
        }),
      }
    );

    return response.results || [];
  }

  /**
   * Extract title from page properties
   */
  private extractPageTitle(page: Page): string {
    for (const [, value] of Object.entries(page.properties)) {
      const prop = value as Record<string, unknown>;
      if (prop.type === 'title' && Array.isArray(prop.title)) {
        const titleArray = prop.title as Array<{ plain_text: string }>;
        return titleArray.map(t => t.plain_text).join('');
      }
    }
    return 'Untitled';
  }

  /**
   * Extract text content from blocks
   */
  extractBlockText(block: Block): string {
    const type = block.type;
    const content = block[type] as Record<string, unknown> | undefined;

    if (!content) return '';

    // Handle rich text blocks
    if (Array.isArray(content.rich_text)) {
      return (content.rich_text as Array<{ plain_text: string }>)
        .map(t => t.plain_text)
        .join('');
    }

    // Handle special blocks
    if (type === 'child_page') {
      return `[Page: ${(content as { title: string }).title}]`;
    }
    if (type === 'child_database') {
      return `[Database: ${(content as { title: string }).title}]`;
    }

    return '';
  }

  /**
   * Update page properties
   */
  async updatePage(
    pageId: string,
    properties: Record<string, unknown>,
    archived?: boolean
  ): Promise<Page> {
    const body: Record<string, unknown> = { properties };
    if (archived !== undefined) body.archived = archived;

    return this.request<Page>(`/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  /**
   * Archive/unarchive a page
   */
  async archivePage(pageId: string, archived = true): Promise<Page> {
    return this.request<Page>(`/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ archived }),
    });
  }

  /**
   * Append blocks to a page
   */
  async appendBlocks(pageId: string, blocks: unknown[]): Promise<Block[]> {
    const response = await this.request<{ results: Block[] }>(
      `/blocks/${pageId}/children`,
      {
        method: 'PATCH',
        body: JSON.stringify({ children: blocks }),
      }
    );
    return response.results || [];
  }

  /**
   * Delete (archive) a block
   */
  async deleteBlock(blockId: string): Promise<void> {
    await this.request(`/blocks/${blockId}`, { method: 'DELETE' });
  }

  /**
   * Update a block
   */
  async updateBlock(blockId: string, content: Record<string, unknown>): Promise<Block> {
    return this.request<Block>(`/blocks/${blockId}`, {
      method: 'PATCH',
      body: JSON.stringify(content),
    });
  }

  /**
   * Create a text block helper
   */
  createParagraphBlock(text: string): Record<string, unknown> {
    return {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: text } }],
      },
    };
  }

  /**
   * Create a heading block helper
   */
  createHeadingBlock(text: string, level: 1 | 2 | 3 = 1): Record<string, unknown> {
    const type = `heading_${level}` as const;
    return {
      object: 'block',
      type,
      [type]: {
        rich_text: [{ type: 'text', text: { content: text } }],
      },
    };
  }

  /**
   * Create a todo block helper
   */
  createTodoBlock(text: string, checked = false): Record<string, unknown> {
    return {
      object: 'block',
      type: 'to_do',
      to_do: {
        rich_text: [{ type: 'text', text: { content: text } }],
        checked,
      },
    };
  }

  /**
   * Create a bulleted list item block helper
   */
  createBulletBlock(text: string): Record<string, unknown> {
    return {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ type: 'text', text: { content: text } }],
      },
    };
  }
}

export const notion = new NotionClient();
