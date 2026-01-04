/**
 * arXiv API client - free, no auth required
 * https://arxiv.org/help/api/
 */

const ARXIV_API = 'https://export.arxiv.org/api/query';

export interface ArxivPaper {
  id: string;
  title: string;
  authors: string[];
  summary: string;
  published: string;
  updated: string;
  categories: string[];
  pdfUrl: string;
  arxivUrl: string;
  doi?: string;
}

// Parse arXiv XML response
function parseArxivXml(xml: string): ArxivPaper[] {
  const papers: ArxivPaper[] = [];

  // Match each entry
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];

    // Extract fields
    const id = entry.match(/<id>(.*?)<\/id>/)?.[1]?.replace('http://arxiv.org/abs/', '') || '';
    const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/\s+/g, ' ').trim() || '';
    const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.replace(/\s+/g, ' ').trim() || '';
    const published = entry.match(/<published>(.*?)<\/published>/)?.[1] || '';
    const updated = entry.match(/<updated>(.*?)<\/updated>/)?.[1] || '';

    // Authors
    const authors: string[] = [];
    const authorRegex = /<author>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/author>/g;
    let authorMatch;
    while ((authorMatch = authorRegex.exec(entry)) !== null) {
      authors.push(authorMatch[1]);
    }

    // Categories
    const categories: string[] = [];
    const catRegex = /<category[^>]*term="([^"]+)"/g;
    let catMatch;
    while ((catMatch = catRegex.exec(entry)) !== null) {
      categories.push(catMatch[1]);
    }

    // DOI
    const doi = entry.match(/<arxiv:doi[^>]*>(.*?)<\/arxiv:doi>/)?.[1];

    // PDF link
    const pdfMatch = entry.match(/<link[^>]*title="pdf"[^>]*href="([^"]+)"/);
    const pdfUrl = pdfMatch?.[1] || `https://arxiv.org/pdf/${id}`;

    papers.push({
      id: id.split('/').pop() || id,
      title,
      authors,
      summary,
      published,
      updated,
      categories,
      pdfUrl,
      arxivUrl: `https://arxiv.org/abs/${id.split('/').pop() || id}`,
      doi,
    });
  }

  return papers;
}

export async function searchPapers(query: string, maxResults: number = 10): Promise<ArxivPaper[]> {
  const params = new URLSearchParams({
    search_query: `all:${query}`,
    start: '0',
    max_results: String(maxResults),
    sortBy: 'relevance',
    sortOrder: 'descending',
  });

  const response = await fetch(`${ARXIV_API}?${params}`);
  if (!response.ok) {
    throw new Error(`arXiv API error: ${response.statusText}`);
  }

  const xml = await response.text();
  return parseArxivXml(xml);
}

export async function getPaper(id: string): Promise<ArxivPaper | null> {
  // Clean up ID - handle various formats
  const cleanId = id.replace('arXiv:', '').replace('arxiv:', '');

  const params = new URLSearchParams({
    id_list: cleanId,
  });

  const response = await fetch(`${ARXIV_API}?${params}`);
  if (!response.ok) {
    throw new Error(`arXiv API error: ${response.statusText}`);
  }

  const xml = await response.text();
  const papers = parseArxivXml(xml);
  return papers[0] || null;
}

export async function getRecentPapers(category: string, maxResults: number = 10): Promise<ArxivPaper[]> {
  const params = new URLSearchParams({
    search_query: `cat:${category}`,
    start: '0',
    max_results: String(maxResults),
    sortBy: 'submittedDate',
    sortOrder: 'descending',
  });

  const response = await fetch(`${ARXIV_API}?${params}`);
  if (!response.ok) {
    throw new Error(`arXiv API error: ${response.statusText}`);
  }

  const xml = await response.text();
  return parseArxivXml(xml);
}

// Common arXiv categories
export const CATEGORIES: Record<string, string> = {
  'cs.AI': 'Artificial Intelligence',
  'cs.CL': 'Computation and Language',
  'cs.CV': 'Computer Vision',
  'cs.LG': 'Machine Learning',
  'cs.NE': 'Neural/Evolutionary Computing',
  'cs.RO': 'Robotics',
  'cs.SE': 'Software Engineering',
  'stat.ML': 'Machine Learning (Stats)',
  'math.OC': 'Optimization and Control',
  'physics': 'Physics (all)',
  'quant-ph': 'Quantum Physics',
  'econ': 'Economics',
};
