/**
 * Hacker News API client
 * Official API: https://github.com/HackerNews/API
 * Algolia search: https://hn.algolia.com/api
 */

const HN_API = 'https://hacker-news.firebaseio.com/v0';
const ALGOLIA_API = 'https://hn.algolia.com/api/v1';

export interface HNStory {
  id: number;
  title: string;
  url?: string;
  text?: string;
  by: string;
  score: number;
  descendants: number; // comment count
  time: number;
  type: 'story' | 'job' | 'poll';
  domain?: string;
}

export interface HNComment {
  id: number;
  text: string;
  by: string;
  time: number;
  kids?: number[];
  parent: number;
}

export interface AlgoliaHit {
  objectID: string;
  title: string;
  url?: string;
  author: string;
  points: number;
  num_comments: number;
  created_at: string;
  story_text?: string;
}

async function fetchHN<T>(path: string): Promise<T> {
  const response = await fetch(`${HN_API}${path}.json`);
  if (!response.ok) {
    throw new Error(`HN API error: ${response.statusText}`);
  }
  return response.json();
}

export async function getStoryIds(type: 'top' | 'new' | 'best' | 'ask' | 'show' | 'job'): Promise<number[]> {
  return fetchHN<number[]>(`/${type}stories`);
}

export async function getItem<T>(id: number): Promise<T> {
  return fetchHN<T>(`/item/${id}`);
}

export async function getStory(id: number): Promise<HNStory | null> {
  const item = await getItem<HNStory>(id);
  if (!item || item.type === undefined) return null;

  // Extract domain from URL
  if (item.url) {
    try {
      item.domain = new URL(item.url).hostname.replace('www.', '');
    } catch {
      // Invalid URL
    }
  }

  return item;
}

export async function getStories(
  type: 'top' | 'new' | 'best' | 'ask' | 'show' | 'job',
  limit: number = 10
): Promise<HNStory[]> {
  const ids = await getStoryIds(type);
  const limitedIds = ids.slice(0, limit);

  // Fetch stories in parallel
  const stories = await Promise.all(
    limitedIds.map((id) => getStory(id))
  );

  return stories.filter((s): s is HNStory => s !== null);
}

export async function getComment(id: number): Promise<HNComment | null> {
  const item = await getItem<HNComment & { type?: string; deleted?: boolean; dead?: boolean }>(id);
  if (!item || item.deleted || item.dead) return null;
  return item;
}

export async function getStoryWithComments(
  id: number,
  commentLimit: number = 10
): Promise<{ story: HNStory; comments: HNComment[] } | null> {
  const story = await getStory(id);
  if (!story) return null;

  // Get top-level comment IDs
  const kids = (story as unknown as { kids?: number[] }).kids || [];
  const topKids = kids.slice(0, commentLimit);

  // Fetch comments in parallel
  const comments = await Promise.all(
    topKids.map((kid) => getComment(kid))
  );

  return {
    story,
    comments: comments.filter((c): c is HNComment => c !== null),
  };
}

export async function searchHN(
  query: string,
  options: {
    type?: 'story' | 'comment';
    sortBy?: 'relevance' | 'date';
    limit?: number;
  } = {}
): Promise<AlgoliaHit[]> {
  const { type = 'story', sortBy = 'relevance', limit = 10 } = options;

  const endpoint = sortBy === 'date' ? 'search_by_date' : 'search';
  const params = new URLSearchParams({
    query,
    tags: type,
    hitsPerPage: String(limit),
  });

  const response = await fetch(`${ALGOLIA_API}/${endpoint}?${params}`);
  if (!response.ok) {
    throw new Error(`Algolia API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.hits as AlgoliaHit[];
}

// Format relative time
export function timeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

  return new Date(timestamp * 1000).toLocaleDateString();
}
