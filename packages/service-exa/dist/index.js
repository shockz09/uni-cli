// ../shared/src/errors.ts
class UniError extends Error {
  code;
  suggestion;
  constructor(message, code, suggestion) {
    super(message);
    this.code = code;
    this.suggestion = suggestion;
    this.name = "UniError";
  }
  toJSON() {
    return {
      error: this.message,
      code: this.code,
      suggestion: this.suggestion
    };
  }
}
class AuthFailedError extends UniError {
  constructor(serviceName, reason) {
    super(`Authentication failed for '${serviceName}'${reason ? `: ${reason}` : ""}`, "AUTH_FAILED", `Try 'uni auth login ${serviceName}' to re-authenticate`);
    this.name = "AuthFailedError";
  }
}
class NetworkError extends UniError {
  constructor(message, url) {
    super(message, "NETWORK_ERROR", "Check your internet connection and try again");
    this.name = "NetworkError";
  }
}

class RateLimitError extends UniError {
  constructor(serviceName, retryAfter) {
    const suggestion = retryAfter ? `Wait ${retryAfter} seconds before retrying` : "Wait a moment before retrying";
    super(`Rate limit exceeded for '${serviceName}'`, "RATE_LIMIT", suggestion);
    this.name = "RateLimitError";
  }
}
// ../shared/src/helpers.ts
var {spawn} = (() => ({}));
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
// src/mcp-client.ts
var MCP_SERVER_URL = "https://mcp.exa.ai/mcp?tools=web_search_exa,get_code_context_exa,crawling_exa,company_research_exa,linkedin_search_exa,deep_researcher_start,deep_researcher_check";

class ExaMCPClient {
  serverUrl;
  constructor(serverUrl) {
    this.serverUrl = serverUrl || MCP_SERVER_URL;
  }
  async callTool(tool) {
    try {
      const baseUrl = this.serverUrl.split("?")[0];
      const response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: {
            name: tool.name,
            arguments: tool.arguments
          }
        })
      });
      if (!response.ok) {
        throw new Error(`MCP error: ${response.status}`);
      }
      const text = await response.text();
      const result = this.parseSSEResponse(text);
      if (result.error) {
        throw new Error(result.error.message || "MCP call failed");
      }
      if (result.result?.content) {
        const textContent = result.result.content.find((c) => c.type === "text");
        if (textContent?.text) {
          try {
            return JSON.parse(textContent.text);
          } catch {
            return textContent.text;
          }
        }
      }
      return result.result;
    } catch (error) {
      throw new NetworkError(`MCP call failed: ${error}`, this.serverUrl);
    }
  }
  parseSSEResponse(text) {
    const lines = text.split(`
`);
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          return JSON.parse(line.slice(6));
        } catch {
          continue;
        }
      }
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Failed to parse MCP response");
    }
  }
  async search(query, options = {}) {
    const result = await this.callTool({
      name: "web_search_exa",
      arguments: {
        query,
        numResults: options.numResults || 5
      }
    });
    if (typeof result === "string") {
      return this.parseTextResults(result);
    }
    return this.parseSearchResults(result);
  }
  parseTextResults(text) {
    const results = [];
    const parts = text.split(/(?=Title:)/);
    for (const part of parts) {
      if (!part.trim())
        continue;
      const titleMatch = part.match(/Title:\s*(.+?)(?:\n|$)/);
      const urlMatch = part.match(/URL:\s*(.+?)(?:\n|$)/);
      const textMatch = part.match(/Text:\s*([\s\S]*?)(?=(?:Title:|$))/);
      if (titleMatch && urlMatch) {
        results.push({
          title: titleMatch[1].trim(),
          url: urlMatch[1].trim(),
          text: textMatch ? textMatch[1].trim().slice(0, 500) : undefined
        });
      }
    }
    return results;
  }
  async codeContext(query, options = {}) {
    const result = await this.callTool({
      name: "get_code_context_exa",
      arguments: {
        query,
        tokensNum: options.tokensNum || 5000
      }
    });
    return {
      context: typeof result === "string" ? result : JSON.stringify(result, null, 2),
      sources: []
    };
  }
  async companyResearch(companyName, numResults = 5) {
    const query = `${companyName} company official site news about`;
    return this.search(query, { numResults });
  }
  async research(query, mode = "quick") {
    if (mode === "quick") {
      const results = await this.search(query, { numResults: 10 });
      return {
        status: "completed",
        results
      };
    }
    const startResult = await this.callTool({
      name: "deep_researcher_start",
      arguments: {
        instructions: query,
        model: "exa-research-pro"
      }
    });
    let attempts = 0;
    while (attempts < 30) {
      await new Promise((r) => setTimeout(r, 2000));
      const checkResult = await this.callTool({
        name: "deep_researcher_check",
        arguments: {
          taskId: startResult.taskId
        }
      });
      if (checkResult.status === "completed") {
        return {
          status: "completed",
          content: checkResult.result
        };
      }
      if (checkResult.status === "failed") {
        throw new Error("Research failed");
      }
      attempts++;
    }
    throw new Error("Research timed out");
  }
  parseSearchResults(result) {
    if (Array.isArray(result)) {
      return result.map((r) => ({
        title: r.title || "",
        url: r.url || "",
        text: r.text || r.snippet || "",
        publishedDate: r.publishedDate
      }));
    }
    if (typeof result === "object" && result !== null) {
      const obj = result;
      if (Array.isArray(obj.results)) {
        return this.parseSearchResults(obj.results);
      }
    }
    return [];
  }
}

// src/api.ts
var EXA_API_BASE = "https://api.exa.ai";

class ExaClient {
  apiKey;
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.EXA_API_KEY || "";
  }
  async search(query, options = {}) {
    const {
      numResults = 5,
      type = "auto",
      includeDomains,
      excludeDomains,
      startPublishedDate,
      endPublishedDate,
      useAutoprompt = true,
      category
    } = options;
    const body = {
      query,
      numResults,
      type,
      useAutoprompt,
      contents: {
        text: true
      }
    };
    if (includeDomains?.length)
      body.includeDomains = includeDomains;
    if (excludeDomains?.length)
      body.excludeDomains = excludeDomains;
    if (startPublishedDate)
      body.startPublishedDate = startPublishedDate;
    if (endPublishedDate)
      body.endPublishedDate = endPublishedDate;
    if (category)
      body.category = category;
    const response = await this.request("/search", body);
    return response;
  }
  async codeContext(query, options = {}) {
    const { tokensNum = 5000 } = options;
    const response = await this.request("/search", {
      query,
      numResults: 10,
      type: "neural",
      useAutoprompt: true,
      contents: {
        text: {
          maxCharacters: tokensNum * 4
        }
      },
      includeDomains: [
        "github.com",
        "stackoverflow.com",
        "dev.to",
        "medium.com",
        "docs.microsoft.com",
        "developer.mozilla.org",
        "reactjs.org",
        "vuejs.org",
        "angular.io",
        "nodejs.org",
        "python.org",
        "rust-lang.org",
        "go.dev"
      ]
    });
    const searchResponse = response;
    const context = searchResponse.results.map((r) => `## ${r.title}
Source: ${r.url}

${r.text || ""}`).join(`

---

`);
    return {
      context,
      sources: searchResponse.results.map((r) => ({
        title: r.title,
        url: r.url
      }))
    };
  }
  async companyResearch(companyName, numResults = 5) {
    const response = await this.request("/search", {
      query: `${companyName} company information news`,
      numResults,
      type: "neural",
      useAutoprompt: true,
      contents: {
        text: true
      },
      category: "company"
    });
    return response;
  }
  async startResearch(query, mode = "quick") {
    if (mode === "quick") {
      return { taskId: `quick_${Date.now()}` };
    }
    const response = await this.request("/research", {
      instructions: query,
      model: mode === "deep" ? "exa-research-pro" : "exa-research"
    });
    return { taskId: response.taskId };
  }
  async checkResearch(taskId) {
    if (taskId.startsWith("quick_")) {
      return {
        taskId,
        status: "completed",
        result: "Quick research completed. Use --mode deep for comprehensive research."
      };
    }
    const response = await this.request(`/research/${taskId}`, null, "GET");
    return response;
  }
  async request(endpoint, body, method = "POST") {
    const url = `${EXA_API_BASE}${endpoint}`;
    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey
        },
        body: body ? JSON.stringify(body) : undefined
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw new AuthFailedError("exa", "Invalid API key");
        }
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          throw new RateLimitError("exa", retryAfter ? parseInt(retryAfter) : undefined);
        }
        const errorText = await response.text();
        throw new NetworkError(`Exa API error: ${response.status} ${errorText}`, url);
      }
      return response.json();
    } catch (error) {
      if (error instanceof AuthFailedError || error instanceof RateLimitError || error instanceof NetworkError) {
        throw error;
      }
      throw new NetworkError(`Failed to connect to Exa API: ${error}`, url);
    }
  }
}

// src/commands/search.ts
var searchCommand = {
  name: "search",
  description: "Search the web for information",
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
      name: "num",
      short: "n",
      type: "number",
      description: "Number of results",
      default: 5
    },
    {
      name: "api",
      type: "boolean",
      description: "Use direct API instead of MCP (requires EXA_API_KEY)",
      default: false
    }
  ],
  examples: [
    'uni exa search "React 19 server components"',
    'uni exa search "TypeScript 5.0 features" --num 10',
    'uni exa search "AI news" --api'
  ],
  async handler(ctx) {
    const { output, args, flags, globalFlags } = ctx;
    const query = args.query;
    if (!query) {
      output.error("Please provide a search query");
      return;
    }
    const spinner = output.spinner(`Searching for "${query}"...`);
    try {
      let results;
      if (flags.api || process.env.EXA_API_KEY) {
        const client = new ExaClient;
        const response = await client.search(query, {
          numResults: flags.num
        });
        results = response.results;
      } else {
        const mcpClient = new ExaMCPClient;
        results = await mcpClient.search(query, {
          numResults: flags.num
        });
      }
      spinner.success(`Found ${results.length} results`);
      if (globalFlags.json) {
        output.json({ results });
        return;
      }
      console.log("");
      for (const result of results) {
        console.log(`\x1B[1m${result.title}\x1B[0m`);
        console.log(`\x1B[36m${result.url}\x1B[0m`);
        if (result.text) {
          const snippet = result.text.slice(0, 200).replace(/\n/g, " ");
          console.log(`\x1B[90m${snippet}${result.text.length > 200 ? "..." : ""}\x1B[0m`);
        }
        if (result.publishedDate) {
          console.log(`\x1B[90mPublished: ${result.publishedDate}\x1B[0m`);
        }
        console.log("");
      }
    } catch (error) {
      spinner.fail("Search failed");
      throw error;
    }
  }
};

// src/commands/code.ts
var codeCommand = {
  name: "code",
  description: "Get code context and documentation",
  aliases: ["docs", "context"],
  args: [
    {
      name: "query",
      description: "Code/documentation query",
      required: true
    }
  ],
  options: [
    {
      name: "tokens",
      short: "t",
      type: "number",
      description: "Max tokens to return",
      default: 5000
    },
    {
      name: "api",
      type: "boolean",
      description: "Use direct API instead of MCP (requires EXA_API_KEY)",
      default: false
    }
  ],
  examples: [
    'uni exa code "Express.js middleware authentication"',
    'uni exa code "Python pandas groupby aggregate"',
    'uni exa code "React useEffect cleanup" --tokens 10000'
  ],
  async handler(ctx) {
    const { output, args, flags, globalFlags } = ctx;
    const query = args.query;
    if (!query) {
      output.error("Please provide a code/documentation query");
      return;
    }
    const spinner = output.spinner(`Finding code context for "${query}"...`);
    try {
      let response;
      if (flags.api || process.env.EXA_API_KEY) {
        const client = new ExaClient;
        response = await client.codeContext(query, {
          tokensNum: flags.tokens
        });
      } else {
        const mcpClient = new ExaMCPClient;
        response = await mcpClient.codeContext(query, {
          tokensNum: flags.tokens
        });
      }
      spinner.success(response.sources.length ? `Found ${response.sources.length} sources` : "Found code context");
      if (globalFlags.json) {
        output.json(response);
        return;
      }
      console.log(`
\x1B[1mSources:\x1B[0m`);
      for (const source of response.sources) {
        console.log(`  • \x1B[36m${source.title}\x1B[0m`);
        console.log(`    ${source.url}`);
      }
      console.log(`
\x1B[1m─── Context ───\x1B[0m
`);
      console.log(response.context);
    } catch (error) {
      spinner.fail("Code context search failed");
      throw error;
    }
  }
};

// src/commands/research.ts
var researchCommand = {
  name: "research",
  description: "Perform research on a topic",
  aliases: ["r"],
  args: [
    {
      name: "query",
      description: "Research topic or question",
      required: true
    }
  ],
  options: [
    {
      name: "mode",
      short: "m",
      type: "string",
      description: "Research mode: quick or deep",
      default: "quick",
      choices: ["quick", "deep"]
    },
    {
      name: "num",
      short: "n",
      type: "number",
      description: "Number of sources for quick mode",
      default: 8
    },
    {
      name: "api",
      type: "boolean",
      description: "Use direct API instead of MCP (requires EXA_API_KEY)",
      default: false
    }
  ],
  examples: [
    'uni exa research "AI agent frameworks comparison 2025"',
    'uni exa research "best practices microservices" --mode deep',
    'uni exa research "React vs Vue 2025" --num 15'
  ],
  async handler(ctx) {
    const { output, args, flags, globalFlags } = ctx;
    const query = args.query;
    if (!query) {
      output.error("Please provide a research topic");
      return;
    }
    const mode = flags.mode;
    const spinner = output.spinner(`Researching "${query}" (${mode} mode)...`);
    try {
      const useApi = flags.api || process.env.EXA_API_KEY;
      if (mode === "quick") {
        let results;
        if (useApi) {
          const client = new ExaClient;
          const response = await client.search(query, {
            numResults: flags.num,
            type: "neural",
            useAutoprompt: true
          });
          results = response.results;
        } else {
          const mcpClient = new ExaMCPClient;
          results = await mcpClient.search(query, {
            numResults: flags.num
          });
        }
        spinner.success(`Research complete - ${results.length} sources`);
        if (globalFlags.json) {
          output.json({
            mode: "quick",
            query,
            results
          });
          return;
        }
        console.log(`
\x1B[1m\uD83D\uDCDA Research Results\x1B[0m
`);
        for (let i = 0;i < results.length; i++) {
          const result = results[i];
          console.log(`\x1B[1m${i + 1}. ${result.title}\x1B[0m`);
          console.log(`   \x1B[36m${result.url}\x1B[0m`);
          if (result.text) {
            const snippet = result.text.slice(0, 300).replace(/\n/g, " ");
            console.log(`   \x1B[90m${snippet}...\x1B[0m`);
          }
          console.log("");
        }
        output.info("For comprehensive analysis, use --mode deep");
      } else {
        spinner.update("Starting deep research...");
        if (useApi) {
          const client = new ExaClient;
          const { taskId } = await client.startResearch(query, "deep");
          let attempts = 0;
          const maxAttempts = 60;
          while (attempts < maxAttempts) {
            const status = await client.checkResearch(taskId);
            if (status.status === "completed") {
              spinner.success("Deep research complete");
              if (globalFlags.json) {
                output.json(status);
                return;
              }
              console.log(`
\x1B[1m\uD83D\uDD2C Deep Research Results\x1B[0m
`);
              console.log(status.result);
              if (status.sources?.length) {
                console.log(`
\x1B[1mSources:\x1B[0m`);
                for (const source of status.sources) {
                  console.log(`  • ${source.title}`);
                  console.log(`    \x1B[36m${source.url}\x1B[0m`);
                }
              }
              return;
            }
            if (status.status === "failed") {
              throw new Error("Research task failed");
            }
            spinner.update(`Researching... (${attempts * 2}s elapsed)`);
            await sleep(2000);
            attempts++;
          }
          spinner.fail("Research timed out");
          output.warn("Research is taking longer than expected. Try again later.");
        } else {
          const mcpClient = new ExaMCPClient;
          const result = await mcpClient.research(query, "deep");
          spinner.success("Deep research complete");
          if (globalFlags.json) {
            output.json(result);
            return;
          }
          console.log(`
\x1B[1m\uD83D\uDD2C Deep Research Results\x1B[0m
`);
          console.log(result.content || "No content returned");
        }
      }
    } catch (error) {
      spinner.fail("Research failed");
      throw error;
    }
  }
};

// src/commands/company.ts
var companyCommand = {
  name: "company",
  description: "Research a company",
  aliases: ["co", "org"],
  args: [
    {
      name: "name",
      description: "Company name",
      required: true
    }
  ],
  options: [
    {
      name: "num",
      short: "n",
      type: "number",
      description: "Number of results",
      default: 5
    },
    {
      name: "api",
      type: "boolean",
      description: "Use direct API instead of MCP (requires EXA_API_KEY)",
      default: false
    }
  ],
  examples: [
    'uni exa company "Anthropic"',
    'uni exa company "OpenAI" --num 10',
    'uni exa company "Stripe"'
  ],
  async handler(ctx) {
    const { output, args, flags, globalFlags } = ctx;
    const companyName = args.name;
    if (!companyName) {
      output.error("Please provide a company name");
      return;
    }
    const spinner = output.spinner(`Researching ${companyName}...`);
    try {
      let results;
      if (flags.api || process.env.EXA_API_KEY) {
        const client = new ExaClient;
        const response = await client.companyResearch(companyName, flags.num);
        results = response.results;
      } else {
        const mcpClient = new ExaMCPClient;
        results = await mcpClient.companyResearch(companyName, flags.num);
      }
      spinner.success(`Found ${results.length} results about ${companyName}`);
      if (globalFlags.json) {
        output.json({
          company: companyName,
          results
        });
        return;
      }
      console.log(`
\x1B[1m\uD83C\uDFE2 ${companyName}\x1B[0m
`);
      for (const result of results) {
        console.log(`\x1B[1m${result.title}\x1B[0m`);
        console.log(`\x1B[36m${result.url}\x1B[0m`);
        if (result.text) {
          const snippet = result.text.slice(0, 250).replace(/\n/g, " ");
          console.log(`\x1B[90m${snippet}${result.text.length > 250 ? "..." : ""}\x1B[0m`);
        }
        if (result.publishedDate) {
          console.log(`\x1B[90m\uD83D\uDCC5 ${result.publishedDate}\x1B[0m`);
        }
        console.log("");
      }
    } catch (error) {
      spinner.fail("Company research failed");
      throw error;
    }
  }
};

// src/index.ts
var exaService = {
  name: "exa",
  description: "Web search, code context, and research powered by Exa AI",
  version: "0.1.0",
  commands: [
    searchCommand,
    codeCommand,
    researchCommand,
    companyCommand
  ],
  auth: {
    type: "apikey",
    envVar: "EXA_API_KEY",
    flow: "manual"
  },
  async setup() {}
};
var src_default = exaService;
export {
  src_default as default
};
