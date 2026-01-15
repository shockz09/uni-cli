/**
 * Wikipedia API client
 * https://en.wikipedia.org/api/rest_v1/
 * https://www.mediawiki.org/wiki/API:Main_page
 */

const REST_API = 'https://en.wikipedia.org/api/rest_v1';
const ACTION_API = 'https://en.wikipedia.org/w/api.php';

export interface WikiSummary {
  title: string;
  extract: string;
  description?: string;
  pageId: number;
  url: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
}

export interface WikiSearchResult {
  title: string;
  snippet: string;
  pageId: number;
  url: string;
}

export interface WikiArticle {
  title: string;
  extract: string;
  categories: string[];
  url: string;
  pageId: number;
}

async function fetchRest<T>(path: string): Promise<T> {
  const response = await fetch(`${REST_API}${path}`, {
    headers: {
      'User-Agent': 'uni-cli/1.0 (https://github.com/uni-cli)',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Article not found');
    }
    throw new Error(`Wikipedia API error: ${response.statusText}`);
  }

  return response.json();
}

async function fetchAction(params: Record<string, string>): Promise<unknown> {
  const searchParams = new URLSearchParams({
    ...params,
    format: 'json',
    origin: '*',
  });

  const response = await fetch(`${ACTION_API}?${searchParams}`, {
    headers: {
      'User-Agent': 'uni-cli/1.0 (https://github.com/uni-cli)',
    },
  });

  if (!response.ok) {
    throw new Error(`Wikipedia API error: ${response.statusText}`);
  }

  return response.json();
}

export async function getSummary(title: string): Promise<WikiSummary | null> {
  try {
    const encodedTitle = encodeURIComponent(title.replace(/ /g, '_'));
    const data = await fetchRest<Record<string, unknown>>(`/page/summary/${encodedTitle}`);

    return {
      title: data.title as string,
      extract: data.extract as string,
      description: data.description as string | undefined,
      pageId: data.pageid as number,
      url: (data.content_urls as Record<string, Record<string, string>>)?.desktop?.page || `https://en.wikipedia.org/wiki/${encodedTitle}`,
      thumbnail: data.thumbnail as WikiSummary['thumbnail'],
    };
  } catch (error) {
    if ((error as Error).message === 'Article not found') {
      return null;
    }
    throw error;
  }
}

export async function searchWiki(query: string, limit: number = 10): Promise<WikiSearchResult[]> {
  const data = await fetchAction({
    action: 'query',
    list: 'search',
    srsearch: query,
    srlimit: String(limit),
    srprop: 'snippet',
  }) as Record<string, unknown>;

  const queryData = data.query as Record<string, unknown>;
  const results = queryData.search as Array<Record<string, unknown>>;

  return results.map((r) => ({
    title: r.title as string,
    snippet: (r.snippet as string).replace(/<[^>]+>/g, ''), // Strip HTML
    pageId: r.pageid as number,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent((r.title as string).replace(/ /g, '_'))}`,
  }));
}

export async function getRandomArticle(): Promise<WikiSummary> {
  const data = await fetchRest<Record<string, unknown>>('/page/random/summary');

  return {
    title: data.title as string,
    extract: data.extract as string,
    description: data.description as string | undefined,
    pageId: data.pageid as number,
    url: (data.content_urls as Record<string, Record<string, string>>)?.desktop?.page || '',
    thumbnail: data.thumbnail as WikiSummary['thumbnail'],
  };
}

export async function getFullArticle(title: string): Promise<WikiArticle | null> {
  try {
    // Get article extract (longer version)
    const extractData = await fetchAction({
      action: 'query',
      titles: title,
      prop: 'extracts|categories|info',
      exintro: '0',
      explaintext: '1',
      exsectionformat: 'plain',
      cllimit: '10',
      inprop: 'url',
    }) as Record<string, unknown>;

    const queryData = extractData.query as Record<string, unknown>;
    const pages = queryData.pages as Record<string, Record<string, unknown>>;
    const pageId = Object.keys(pages)[0];

    if (pageId === '-1') {
      return null;
    }

    const page = pages[pageId];

    const categories = (page.categories as Array<Record<string, string>> || [])
      .map((cat) => cat.title.replace('Category:', ''));

    return {
      title: page.title as string,
      extract: (page.extract as string) || '',
      categories,
      url: page.fullurl as string || `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
      pageId: parseInt(pageId, 10),
    };
  } catch {
    return null;
  }
}

export interface WikiLanguage {
  lang: string;
  langname: string;
  title: string;
  url: string;
}

export async function getLanguages(title: string): Promise<WikiLanguage[]> {
  const data = await fetchAction({
    action: 'query',
    titles: title,
    prop: 'langlinks',
    lllimit: '500',
  }) as Record<string, unknown>;

  const queryData = data.query as Record<string, unknown>;
  const pages = queryData.pages as Record<string, Record<string, unknown>>;
  const pageId = Object.keys(pages)[0];

  if (pageId === '-1') {
    return [];
  }

  const page = pages[pageId];
  const langlinks = (page.langlinks as Array<Record<string, string>>) || [];

  return langlinks.map((link) => ({
    lang: link.lang,
    langname: link.langname || link.lang,
    title: link['*'] || link.title || '',
    url: `https://${link.lang}.wikipedia.org/wiki/${encodeURIComponent((link['*'] || link.title || '').replace(/ /g, '_'))}`,
  }));
}

export interface RelatedPage {
  title: string;
  extract?: string;
  pageId: number;
  url: string;
}

export async function getRelatedPages(title: string, limit: number = 10): Promise<RelatedPage[]> {
  // Use Wikipedia's "See also" links or related pages API
  const encodedTitle = encodeURIComponent(title.replace(/ /g, '_'));

  try {
    // Try using the REST API's related pages endpoint
    const data = await fetchRest<{ pages?: Array<Record<string, unknown>> }>(`/page/related/${encodedTitle}`);

    if (data.pages && data.pages.length > 0) {
      return data.pages.slice(0, limit).map((page) => ({
        title: page.title as string,
        extract: (page.extract as string) || undefined,
        pageId: page.pageid as number || 0,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent((page.title as string).replace(/ /g, '_'))}`,
      }));
    }
  } catch {
    // Fallback to links-based approach
  }

  // Fallback: get "See also" section links or category siblings
  const linksData = await fetchAction({
    action: 'query',
    titles: title,
    prop: 'links',
    pllimit: String(limit * 2),
    plnamespace: '0', // Main namespace only
  }) as Record<string, unknown>;

  const queryData = linksData.query as Record<string, unknown>;
  const pages = queryData.pages as Record<string, Record<string, unknown>>;
  const pageId = Object.keys(pages)[0];

  if (pageId === '-1') {
    return [];
  }

  const page = pages[pageId];
  const links = (page.links as Array<Record<string, unknown>>) || [];

  return links.slice(0, limit).map((link) => ({
    title: link.title as string,
    pageId: 0,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent((link.title as string).replace(/ /g, '_'))}`,
  }));
}
