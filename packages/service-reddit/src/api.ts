/**
 * Reddit API client - JSON API (no auth required)
 * Append .json to any reddit URL
 */

const REDDIT_BASE = 'https://www.reddit.com';

export interface RedditPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  score: number;
  upvoteRatio: number;
  numComments: number;
  created: string;
  url: string;
  selftext?: string;
  flair?: string;
  isNsfw: boolean;
  permalink: string;
}

export interface RedditComment {
  id: string;
  author: string;
  body: string;
  score: number;
  created: string;
  replies?: RedditComment[];
}

// User agent to avoid 429 errors
const headers = {
  'User-Agent': 'uni-cli/1.0',
};

async function fetchReddit(path: string): Promise<unknown> {
  const url = `${REDDIT_BASE}${path}.json`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limited by Reddit. Please wait a moment.');
    }
    throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Fetch without auto-appending .json (for paths that already include it)
async function fetchRedditRaw(path: string): Promise<unknown> {
  const url = `${REDDIT_BASE}${path}`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limited by Reddit. Please wait a moment.');
    }
    throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function parsePost(data: Record<string, unknown>): RedditPost {
  const d = data.data as Record<string, unknown>;
  return {
    id: d.id as string,
    title: d.title as string,
    author: d.author as string,
    subreddit: d.subreddit as string,
    score: d.score as number,
    upvoteRatio: d.upvote_ratio as number,
    numComments: d.num_comments as number,
    created: new Date((d.created_utc as number) * 1000).toISOString(),
    url: d.url as string,
    selftext: (d.selftext as string) || undefined,
    flair: (d.link_flair_text as string) || undefined,
    isNsfw: d.over_18 as boolean,
    permalink: `https://reddit.com${d.permalink as string}`,
  };
}

function parseComment(data: Record<string, unknown>): RedditComment | null {
  if (data.kind !== 't1') return null;
  const d = data.data as Record<string, unknown>;

  const comment: RedditComment = {
    id: d.id as string,
    author: d.author as string,
    body: d.body as string,
    score: d.score as number,
    created: new Date((d.created_utc as number) * 1000).toISOString(),
  };

  // Parse nested replies
  const replies = d.replies as Record<string, unknown> | undefined;
  if (replies && typeof replies === 'object' && replies.data) {
    const replyData = replies.data as Record<string, unknown>;
    const children = replyData.children as Record<string, unknown>[];
    if (children) {
      comment.replies = children
        .map((c) => parseComment(c))
        .filter((c): c is RedditComment => c !== null)
        .slice(0, 3); // Limit nested replies
    }
  }

  return comment;
}

export async function getSubredditPosts(
  subreddit: string,
  sort: 'hot' | 'new' | 'top' | 'rising' = 'hot',
  time: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all' = 'day',
  limit: number = 10
): Promise<RedditPost[]> {
  let path = `/r/${subreddit}/${sort}.json`;
  if (sort === 'top') {
    path += `?t=${time}&limit=${limit}`;
  } else {
    path += `?limit=${limit}`;
  }

  const data = await fetchRedditRaw(path) as Record<string, unknown>;
  const listing = data.data as Record<string, unknown>;
  const children = listing.children as Record<string, unknown>[];

  return children.map(parsePost);
}

export async function searchReddit(
  query: string,
  subreddit?: string,
  sort: 'relevance' | 'hot' | 'top' | 'new' = 'relevance',
  limit: number = 10
): Promise<RedditPost[]> {
  const basePath = subreddit ? `/r/${subreddit}/search` : '/search';
  const params = new URLSearchParams({
    q: query,
    sort,
    limit: String(limit),
    restrict_sr: subreddit ? 'true' : 'false',
  });
  const path = `${basePath}.json?${params}`;

  const data = await fetchRedditRaw(path) as Record<string, unknown>;
  const listing = data.data as Record<string, unknown>;
  const children = listing.children as Record<string, unknown>[];

  return children.map(parsePost);
}

export async function getPost(
  subreddit: string,
  postId: string
): Promise<{ post: RedditPost; comments: RedditComment[] }> {
  const path = `/r/${subreddit}/comments/${postId}`;
  const data = await fetchReddit(path) as unknown[];

  // First item is the post, second is comments
  const postListing = (data[0] as Record<string, unknown>).data as Record<string, unknown>;
  const postChildren = postListing.children as Record<string, unknown>[];
  const post = parsePost(postChildren[0]);

  const commentListing = (data[1] as Record<string, unknown>).data as Record<string, unknown>;
  const commentChildren = commentListing.children as Record<string, unknown>[];
  const comments = commentChildren
    .map((c) => parseComment(c))
    .filter((c): c is RedditComment => c !== null)
    .slice(0, 10); // Limit top-level comments

  return { post, comments };
}

export async function getPostById(postId: string): Promise<{ post: RedditPost; comments: RedditComment[] } | null> {
  // First, get post info to find subreddit
  try {
    const infoPath = `/api/info.json?id=t3_${postId}`;
    const infoData = await fetchRedditRaw(infoPath) as Record<string, unknown>;
    const listing = infoData.data as Record<string, unknown>;
    const children = listing.children as Record<string, unknown>[];

    if (!children || children.length === 0) return null;

    const postData = (children[0] as Record<string, unknown>).data as Record<string, unknown>;
    const subreddit = postData.subreddit as string;

    return getPost(subreddit, postId);
  } catch {
    return null;
  }
}
