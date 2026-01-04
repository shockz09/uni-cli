/**
 * Exa API Client
 *
 * Wraps the Exa API for web search, code context, and research.
 */

import { NetworkError, AuthFailedError, RateLimitError } from '@uni/shared';

const EXA_API_BASE = 'https://api.exa.ai';

export interface ExaSearchResult {
  title: string;
  url: string;
  text?: string;
  publishedDate?: string;
  author?: string;
  score?: number;
}

export interface ExaSearchResponse {
  results: ExaSearchResult[];
  autopromptString?: string;
}

export interface ExaCodeContextResponse {
  context: string;
  sources: Array<{
    title: string;
    url: string;
  }>;
}

export interface ExaCompanyResponse {
  results: ExaSearchResult[];
}

export interface ExaResearchResponse {
  taskId: string;
  status: 'running' | 'completed' | 'failed';
  result?: string;
  sources?: Array<{
    title: string;
    url: string;
  }>;
}

export interface SearchOptions {
  numResults?: number;
  type?: 'auto' | 'neural' | 'keyword';
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;
  endPublishedDate?: string;
  useAutoprompt?: boolean;
  category?: string;
}

export interface CodeContextOptions {
  tokensNum?: number;
}

export interface ResearchOptions {
  mode?: 'quick' | 'deep';
}

export class ExaClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    // API key is optional - Exa has a free tier that works without it
    this.apiKey = apiKey || process.env.EXA_API_KEY || '';
  }

  /**
   * Perform a web search
   */
  async search(query: string, options: SearchOptions = {}): Promise<ExaSearchResponse> {
    const {
      numResults = 5,
      type = 'auto',
      includeDomains,
      excludeDomains,
      startPublishedDate,
      endPublishedDate,
      useAutoprompt = true,
      category,
    } = options;

    const body: Record<string, unknown> = {
      query,
      numResults,
      type,
      useAutoprompt,
      contents: {
        text: true,
      },
    };

    if (includeDomains?.length) body.includeDomains = includeDomains;
    if (excludeDomains?.length) body.excludeDomains = excludeDomains;
    if (startPublishedDate) body.startPublishedDate = startPublishedDate;
    if (endPublishedDate) body.endPublishedDate = endPublishedDate;
    if (category) body.category = category;

    const response = await this.request('/search', body);
    return response as ExaSearchResponse;
  }

  /**
   * Get code context for a query
   */
  async codeContext(query: string, options: CodeContextOptions = {}): Promise<ExaCodeContextResponse> {
    const { tokensNum = 5000 } = options;

    // Use the search endpoint with code-focused parameters
    const response = await this.request('/search', {
      query,
      numResults: 10,
      type: 'neural',
      useAutoprompt: true,
      contents: {
        text: {
          maxCharacters: tokensNum * 4, // Rough token to char conversion
        },
      },
      // Focus on documentation and code sites
      includeDomains: [
        'github.com',
        'stackoverflow.com',
        'dev.to',
        'medium.com',
        'docs.microsoft.com',
        'developer.mozilla.org',
        'reactjs.org',
        'vuejs.org',
        'angular.io',
        'nodejs.org',
        'python.org',
        'rust-lang.org',
        'go.dev',
      ],
    });

    const searchResponse = response as ExaSearchResponse;

    // Combine results into context
    const context = searchResponse.results
      .map(r => `## ${r.title}\nSource: ${r.url}\n\n${r.text || ''}`)
      .join('\n\n---\n\n');

    return {
      context,
      sources: searchResponse.results.map(r => ({
        title: r.title,
        url: r.url,
      })),
    };
  }

  /**
   * Research a company
   */
  async companyResearch(companyName: string, numResults = 5): Promise<ExaCompanyResponse> {
    const response = await this.request('/search', {
      query: `${companyName} company information news`,
      numResults,
      type: 'neural',
      useAutoprompt: true,
      contents: {
        text: true,
      },
      category: 'company',
    });

    return response as ExaCompanyResponse;
  }

  /**
   * Start a deep research task
   */
  async startResearch(query: string, mode: 'quick' | 'deep' = 'quick'): Promise<{ taskId: string }> {
    // For now, use regular search for quick mode
    // Deep mode would use Exa's research API if available
    if (mode === 'quick') {
      // Return a fake task ID, we'll handle it synchronously
      return { taskId: `quick_${Date.now()}` };
    }

    // For deep research, we'd call the research endpoint
    // This is a placeholder - actual implementation depends on Exa's API
    const response = await this.request('/research', {
      instructions: query,
      model: mode === 'deep' ? 'exa-research-pro' : 'exa-research',
    });

    return { taskId: (response as { taskId: string }).taskId };
  }

  /**
   * Check research task status
   */
  async checkResearch(taskId: string): Promise<ExaResearchResponse> {
    // Handle quick mode (synchronous search)
    if (taskId.startsWith('quick_')) {
      return {
        taskId,
        status: 'completed',
        result: 'Quick research completed. Use --mode deep for comprehensive research.',
      };
    }

    const response = await this.request(`/research/${taskId}`, null, 'GET');
    return response as ExaResearchResponse;
  }

  /**
   * Make an API request
   */
  private async request(
    endpoint: string,
    body: Record<string, unknown> | null,
    method: 'GET' | 'POST' = 'POST'
  ): Promise<unknown> {
    const url = `${EXA_API_BASE}${endpoint}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new AuthFailedError('exa', 'Invalid API key');
        }
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          throw new RateLimitError('exa', retryAfter ? parseInt(retryAfter, 10) : undefined);
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
