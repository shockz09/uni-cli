/**
 * URL Shortening API using is.gd (free, no API key required)
 */

const ISGD_API = 'https://is.gd/create.php';
const VGDAPI = 'https://v.gd/create.php'; // Fallback

export interface ShortenResult {
  original: string;
  short: string;
  service: string;
}

/**
 * Shorten a URL using is.gd
 */
export async function shorten(url: string): Promise<ShortenResult> {
  // Validate URL
  try {
    new URL(url);
  } catch {
    throw new Error('Invalid URL format');
  }

  const apiUrl = `${ISGD_API}?format=simple&url=${encodeURIComponent(url)}`;

  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  const shortUrl = await response.text();

  // Check for error response
  if (shortUrl.startsWith('Error:')) {
    throw new Error(shortUrl);
  }

  return {
    original: url,
    short: shortUrl.trim(),
    service: 'is.gd',
  };
}

/**
 * Expand a short URL to original
 */
export async function expand(shortUrl: string): Promise<string> {
  // Follow redirects to find original URL
  const response = await fetch(shortUrl, {
    redirect: 'manual',
  });

  const location = response.headers.get('location');

  if (!location) {
    throw new Error('Could not expand URL. It may not be a valid short URL.');
  }

  return location;
}

/**
 * Check if URL is a known short URL service
 */
export function isShortUrl(url: string): boolean {
  const shortDomains = [
    'is.gd',
    'v.gd',
    'bit.ly',
    'tinyurl.com',
    't.co',
    'goo.gl',
    'ow.ly',
    'buff.ly',
  ];

  try {
    const parsed = new URL(url);
    return shortDomains.some(domain => parsed.hostname.includes(domain));
  } catch {
    return false;
  }
}
