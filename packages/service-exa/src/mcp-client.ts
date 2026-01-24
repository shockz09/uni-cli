/**
 * MCP Client for Exa
 *
 * Connects to the Exa MCP server on Smithery and calls tools via MCP protocol.
 * This way we piggyback on Smithery's API key - no key needed locally.
 */

import { NetworkError } from '@uni/shared';

// Exa MCP endpoint
const MCP_SERVER_URL = 'https://mcp.exa.ai/mcp?tools=web_search_exa,get_code_context_exa,crawling_exa,company_research_exa,linkedin_search_exa,deep_researcher_start,deep_researcher_check';

interface MCPToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

interface MCPResponse {
  content: Array<{
    type: string;
    text?: string;
  }>;
}

export class ExaMCPClient {
  private serverUrl: string;

  constructor(serverUrl?: string) {
    this.serverUrl = serverUrl || MCP_SERVER_URL;
  }

  /**
   * Call an MCP tool via HTTP with SSE response
   */
  private async callTool(tool: MCPToolCall): Promise<unknown> {
    try {
      // MCP server URL without the query params
      const baseUrl = this.serverUrl.split('?')[0];

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: tool.name,
            arguments: tool.arguments,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`MCP error: ${response.status}`);
      }

      // Parse SSE response
      const text = await response.text();
      const result = this.parseSSEResponse(text);

      if (result.error) {
        throw new Error(result.error.message || 'MCP call failed');
      }

      // Parse the response content
      if (result.result?.content) {
        const textContent = result.result.content.find((c: any) => c.type === 'text');
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

  /**
   * Parse SSE response format
   */
  private parseSSEResponse(text: string): any {
    // SSE format: "event: message\ndata: {...}\n\n"
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          return JSON.parse(line.slice(6));
        } catch {
          continue;
        }
      }
    }
    // Try parsing as plain JSON
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Failed to parse MCP response');
    }
  }

  /**
   * Web search via MCP
   */
  async search(query: string, options: { numResults?: number } = {}): Promise<SearchResult[]> {
    const result = await this.callTool({
      name: 'web_search_exa',
      arguments: {
        query,
        numResults: options.numResults || 5,
      },
    });

    // MCP returns formatted text, parse it
    if (typeof result === 'string') {
      return this.parseTextResults(result);
    }

    return this.parseSearchResults(result);
  }

  /**
   * Parse text format results from MCP
   * Format: "Title: ...\nURL: ...\nText: ..."
   */
  private parseTextResults(text: string): SearchResult[] {
    const results: SearchResult[] = [];

    // Split by "Title:" to get individual results
    const parts = text.split(/(?=Title:)/);

    for (const part of parts) {
      if (!part.trim()) continue;

      const titleMatch = part.match(/Title:\s*(.+?)(?:\n|$)/);
      const urlMatch = part.match(/URL:\s*(.+?)(?:\n|$)/);
      const textMatch = part.match(/Text:\s*([\s\S]*?)(?=(?:Title:|$))/);

      if (titleMatch && urlMatch) {
        results.push({
          title: titleMatch[1].trim(),
          url: urlMatch[1].trim(),
          text: textMatch ? textMatch[1].trim().slice(0, 500) : undefined,
        });
      }
    }

    return results;
  }

  /**
   * Code context search via MCP
   */
  async codeContext(query: string, options: { tokensNum?: number } = {}): Promise<CodeContextResult> {
    const result = await this.callTool({
      name: 'get_code_context_exa',
      arguments: {
        query,
        tokensNum: options.tokensNum || 5000,
      },
    });

    return {
      context: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
      sources: [],
    };
  }

  /**
   * Company research via MCP
   * Falls back to web search with company-specific query since company_research_exa
   * may not be available on free tier
   */
  async companyResearch(companyName: string, numResults = 5): Promise<SearchResult[]> {
    // Use web search with company-focused query as company_research_exa isn't always available
    const query = `${companyName} company official site news about`;
    return this.search(query, { numResults });
  }

  /**
   * LinkedIn profile search via MCP
   */
  async linkedinSearch(query: string, numResults = 5): Promise<SearchResult[]> {
    const result = await this.callTool({
      name: 'linkedin_search_exa',
      arguments: {
        query,
        numResults,
      },
    });

    if (typeof result === 'string') {
      return this.parseTextResults(result);
    }

    return this.parseSearchResults(result);
  }

  /**
   * Deep research via MCP
   */
  async research(query: string, mode: 'quick' | 'deep' = 'quick'): Promise<ResearchResult> {
    if (mode === 'quick') {
      // Quick mode: just do a comprehensive search
      const results = await this.search(query, { numResults: 10 });
      return {
        status: 'completed',
        results,
      };
    }

    // Deep mode: use the research API
    const startResult = await this.callTool({
      name: 'deep_researcher_start',
      arguments: {
        instructions: query,
        model: 'exa-research-pro',
      },
    }) as { taskId: string };

    // Poll for results
    let attempts = 0;
    while (attempts < 30) {
      await new Promise(r => setTimeout(r, 2000));

      const checkResult = await this.callTool({
        name: 'deep_researcher_check',
        arguments: {
          taskId: startResult.taskId,
        },
      }) as { status: string; result?: string };

      if (checkResult.status === 'completed') {
        return {
          status: 'completed',
          content: checkResult.result,
        };
      }

      if (checkResult.status === 'failed') {
        throw new Error('Research failed');
      }

      attempts++;
    }

    throw new Error('Research timed out');
  }

  /**
   * Parse search results from MCP response
   */
  private parseSearchResults(result: unknown): SearchResult[] {
    if (Array.isArray(result)) {
      return result.map(r => ({
        title: r.title || '',
        url: r.url || '',
        text: r.text || r.snippet || '',
        publishedDate: r.publishedDate,
      }));
    }

    if (typeof result === 'object' && result !== null) {
      const obj = result as Record<string, unknown>;
      if (Array.isArray(obj.results)) {
        return this.parseSearchResults(obj.results);
      }
    }

    return [];
  }
}

export interface SearchResult {
  title: string;
  url: string;
  text?: string;
  publishedDate?: string;
}

export interface CodeContextResult {
  context: string;
  sources: Array<{ title: string; url: string }>;
}

export interface ResearchResult {
  status: 'completed' | 'running' | 'failed';
  results?: SearchResult[];
  content?: string;
}
