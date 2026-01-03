// @bun
// src/api.ts
var NOTION_API = "https://api.notion.com/v1";
var NOTION_VERSION = "2022-06-28";

class NotionClient {
  token;
  constructor() {
    this.token = process.env.NOTION_TOKEN || "";
  }
  hasToken() {
    return Boolean(this.token);
  }
  async request(endpoint, options = {}) {
    const response = await fetch(`${NOTION_API}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
        ...options.headers
      }
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Notion API error: ${error.message || response.statusText}`);
    }
    return response.json();
  }
  async search(query, options = {}) {
    const { filter, pageSize = 20 } = options;
    const body = {
      query,
      page_size: pageSize
    };
    if (filter) {
      body.filter = { property: "object", value: filter };
    }
    const response = await this.request("/search", { method: "POST", body: JSON.stringify(body) });
    return (response.results || []).map((item) => {
      const isDatabase = "title" in item && Array.isArray(item.title);
      return {
        object: isDatabase ? "database" : "page",
        id: item.id,
        url: item.url,
        title: isDatabase ? item.title?.[0]?.plain_text : this.extractPageTitle(item)
      };
    });
  }
  async getPage(pageId) {
    return this.request(`/pages/${pageId}`);
  }
  async getPageContent(pageId) {
    const response = await this.request(`/blocks/${pageId}/children`);
    return response.results || [];
  }
  async createPage(parent, properties, children) {
    const body = { parent, properties };
    if (children) {
      body.children = children;
    }
    return this.request("/pages", {
      method: "POST",
      body: JSON.stringify(body)
    });
  }
  async queryDatabase(databaseId, options = {}) {
    const { filter, sorts, pageSize = 20 } = options;
    const body = { page_size: pageSize };
    if (filter)
      body.filter = filter;
    if (sorts)
      body.sorts = sorts;
    const response = await this.request(`/databases/${databaseId}/query`, { method: "POST", body: JSON.stringify(body) });
    return response.results || [];
  }
  async getDatabase(databaseId) {
    return this.request(`/databases/${databaseId}`);
  }
  async listDatabases(pageSize = 20) {
    const response = await this.request("/search", {
      method: "POST",
      body: JSON.stringify({
        filter: { property: "object", value: "database" },
        page_size: pageSize
      })
    });
    return response.results || [];
  }
  extractPageTitle(page) {
    for (const [, value] of Object.entries(page.properties)) {
      const prop = value;
      if (prop.type === "title" && Array.isArray(prop.title)) {
        const titleArray = prop.title;
        return titleArray.map((t) => t.plain_text).join("");
      }
    }
    return "Untitled";
  }
  extractBlockText(block) {
    const type = block.type;
    const content = block[type];
    if (!content)
      return "";
    if (Array.isArray(content.rich_text)) {
      return content.rich_text.map((t) => t.plain_text).join("");
    }
    if (type === "child_page") {
      return `[Page: ${content.title}]`;
    }
    if (type === "child_database") {
      return `[Database: ${content.title}]`;
    }
    return "";
  }
}
var notion = new NotionClient;

// src/commands/search.ts
var searchCommand = {
  name: "search",
  description: "Search pages and databases",
  aliases: ["s", "find"],
  args: [
    {
      name: "query",
      description: "Search query",
      required: true
    }
  ],
  options: [
    {
      name: "type",
      short: "t",
      type: "string",
      description: "Filter by type: page, database",
      choices: ["page", "database"]
    },
    {
      name: "limit",
      short: "l",
      type: "number",
      description: "Maximum results",
      default: 10
    }
  ],
  examples: [
    'uni notion search "meeting notes"',
    'uni notion search "projects" --type database'
  ],
  async handler(ctx) {
    const { output, args, flags, globalFlags } = ctx;
    if (!notion.hasToken()) {
      output.error("Notion token not configured. Set NOTION_TOKEN environment variable.");
      return;
    }
    const query = args.query;
    if (!query) {
      output.error("Please provide a search query");
      return;
    }
    const spinner = output.spinner(`Searching for "${query}"...`);
    try {
      const results = await notion.search(query, {
        filter: flags.type,
        pageSize: flags.limit
      });
      spinner.success(`Found ${results.length} results`);
      if (globalFlags.json) {
        output.json(results);
        return;
      }
      if (results.length === 0) {
        output.info("No results found");
        return;
      }
      console.log("");
      for (const result of results) {
        const icon = result.object === "database" ? "\uD83D\uDCCA" : "\uD83D\uDCC4";
        console.log(`${icon} \x1B[1m${result.title || "Untitled"}\x1B[0m`);
        console.log(`   \x1B[36m${result.url}\x1B[0m`);
        console.log("");
      }
    } catch (error) {
      spinner.fail("Search failed");
      throw error;
    }
  }
};

// src/commands/pages.ts
var viewCommand = {
  name: "view",
  description: "View a page",
  aliases: ["show", "get"],
  args: [
    {
      name: "page",
      description: "Page ID or URL",
      required: true
    }
  ],
  options: [
    {
      name: "content",
      short: "c",
      type: "boolean",
      description: "Include page content",
      default: false
    }
  ],
  examples: [
    "uni notion pages view abc123",
    "uni notion pages view abc123 --content"
  ],
  async handler(ctx) {
    const { output, args, flags, globalFlags } = ctx;
    if (!notion.hasToken()) {
      output.error("Notion token not configured.");
      return;
    }
    let pageId = args.page;
    if (pageId.includes("notion.so")) {
      const match = pageId.match(/([a-f0-9]{32})/);
      if (match)
        pageId = match[1];
    }
    if (pageId.length === 32 && !pageId.includes("-")) {
      pageId = `${pageId.slice(0, 8)}-${pageId.slice(8, 12)}-${pageId.slice(12, 16)}-${pageId.slice(16, 20)}-${pageId.slice(20)}`;
    }
    const spinner = output.spinner("Fetching page...");
    try {
      const page = await notion.getPage(pageId);
      spinner.success("Page loaded");
      if (globalFlags.json) {
        if (flags.content) {
          const blocks = await notion.getPageContent(pageId);
          output.json({ page, blocks });
        } else {
          output.json(page);
        }
        return;
      }
      let title = "Untitled";
      for (const [, value] of Object.entries(page.properties)) {
        const prop = value;
        if (prop.type === "title" && Array.isArray(prop.title)) {
          title = prop.title.map((t) => t.plain_text).join("");
          break;
        }
      }
      console.log("");
      console.log(`\uD83D\uDCC4 \x1B[1m${title}\x1B[0m`);
      console.log(`   \x1B[36m${page.url}\x1B[0m`);
      console.log(`   Created: ${new Date(page.created_time).toLocaleDateString()}`);
      console.log(`   Updated: ${new Date(page.last_edited_time).toLocaleDateString()}`);
      if (flags.content) {
        const blocks = await notion.getPageContent(pageId);
        console.log(`
\x1B[90m\u2500\u2500\u2500 Content \u2500\u2500\u2500\x1B[0m
`);
        for (const block of blocks) {
          const text = notion.extractBlockText(block);
          if (text) {
            const prefix = block.type === "heading_1" ? "# " : block.type === "heading_2" ? "## " : block.type === "heading_3" ? "### " : block.type === "bulleted_list_item" ? "\u2022 " : block.type === "numbered_list_item" ? "1. " : block.type === "to_do" ? "\u2610 " : "";
            console.log(`${prefix}${text}`);
          }
        }
      }
      console.log("");
    } catch (error) {
      spinner.fail("Failed to fetch page");
      throw error;
    }
  }
};
var pagesCommand = {
  name: "pages",
  description: "Manage pages",
  aliases: ["page", "p"],
  subcommands: [viewCommand],
  examples: [
    "uni notion pages view abc123"
  ],
  async handler(ctx) {
    const { output } = ctx;
    output.info('Use "uni notion pages view <id>" to view a page');
    output.info('Use "uni notion search" to find pages');
  }
};

// src/commands/databases.ts
var listCommand = {
  name: "list",
  description: "List databases",
  aliases: ["ls"],
  options: [
    {
      name: "limit",
      short: "l",
      type: "number",
      description: "Maximum databases",
      default: 20
    }
  ],
  examples: [
    "uni notion databases list"
  ],
  async handler(ctx) {
    const { output, flags, globalFlags } = ctx;
    if (!notion.hasToken()) {
      output.error("Notion token not configured.");
      return;
    }
    const spinner = output.spinner("Fetching databases...");
    try {
      const databases = await notion.listDatabases(flags.limit);
      spinner.success(`Found ${databases.length} databases`);
      if (globalFlags.json) {
        output.json(databases);
        return;
      }
      if (databases.length === 0) {
        output.info("No databases found (make sure they are shared with your integration)");
        return;
      }
      console.log("");
      for (const db of databases) {
        const title = db.title?.[0]?.plain_text || "Untitled";
        console.log(`\uD83D\uDCCA \x1B[1m${title}\x1B[0m`);
        console.log(`   \x1B[36m${db.url}\x1B[0m`);
        if (db.description?.[0]?.plain_text) {
          console.log(`   \x1B[90m${db.description[0].plain_text}\x1B[0m`);
        }
        console.log("");
      }
    } catch (error) {
      spinner.fail("Failed to fetch databases");
      throw error;
    }
  }
};
var queryCommand = {
  name: "query",
  description: "Query a database",
  aliases: ["q"],
  args: [
    {
      name: "database",
      description: "Database ID",
      required: true
    }
  ],
  options: [
    {
      name: "limit",
      short: "l",
      type: "number",
      description: "Maximum results",
      default: 20
    }
  ],
  examples: [
    "uni notion databases query abc123",
    "uni notion databases query abc123 --limit 50"
  ],
  async handler(ctx) {
    const { output, args, flags, globalFlags } = ctx;
    if (!notion.hasToken()) {
      output.error("Notion token not configured.");
      return;
    }
    let dbId = args.database;
    if (dbId.includes("notion.so")) {
      const match = dbId.match(/([a-f0-9]{32})/);
      if (match)
        dbId = match[1];
    }
    const spinner = output.spinner("Querying database...");
    try {
      const pages = await notion.queryDatabase(dbId, {
        pageSize: flags.limit
      });
      spinner.success(`Found ${pages.length} items`);
      if (globalFlags.json) {
        output.json(pages);
        return;
      }
      if (pages.length === 0) {
        output.info("No items in database");
        return;
      }
      console.log("");
      for (const page of pages) {
        let title = "Untitled";
        for (const [, value] of Object.entries(page.properties)) {
          const prop = value;
          if (prop.type === "title" && Array.isArray(prop.title)) {
            title = prop.title.map((t) => t.plain_text).join("");
            break;
          }
        }
        console.log(`\uD83D\uDCC4 \x1B[1m${title}\x1B[0m`);
        console.log(`   \x1B[36m${page.url}\x1B[0m`);
      }
      console.log("");
    } catch (error) {
      spinner.fail("Failed to query database");
      throw error;
    }
  }
};
var databasesCommand = {
  name: "databases",
  description: "Manage databases",
  aliases: ["db", "dbs"],
  subcommands: [listCommand, queryCommand],
  examples: [
    "uni notion databases list",
    "uni notion databases query abc123"
  ],
  async handler(ctx) {
    await listCommand.handler(ctx);
  }
};

// src/index.ts
var notionService = {
  name: "notion",
  description: "Notion - pages, databases, and search",
  version: "0.1.0",
  commands: [searchCommand, pagesCommand, databasesCommand],
  auth: {
    type: "token",
    envVar: "NOTION_TOKEN",
    flow: "manual"
  },
  async setup() {
    if (!notion.hasToken()) {
      console.error("\x1B[33mWarning: NOTION_TOKEN not set.\x1B[0m");
    }
  }
};
var src_default = notionService;
export {
  src_default as default
};
