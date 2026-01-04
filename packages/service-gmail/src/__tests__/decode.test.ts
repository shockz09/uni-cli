/**
 * Gmail email body decoder tests
 *
 * Tests for Bug #3: Gmail HTML Decode Failure
 * The decodeBody function was only searching top-level parts,
 * missing nested HTML content in multipart emails.
 */

import { describe, expect, it } from 'bun:test';
import { gmail } from '../api';

// Helper to base64url encode
const encode = (str: string) => Buffer.from(str).toString('base64url');

describe('gmail decodeBody', () => {
  describe('simple emails', () => {
    it('should decode plain text body directly on payload', () => {
      const email = {
        id: 'test',
        threadId: 'test',
        snippet: 'truncated...',
        labelIds: ['INBOX'],
        payload: {
          mimeType: 'text/plain',
          headers: [],
          body: { data: encode('Hello, World!') },
        },
      };

      const body = gmail.decodeBody(email);
      expect(body).toBe('Hello, World!');
    });

    it('should convert HTML body to text when directly on payload', () => {
      const email = {
        id: 'test',
        threadId: 'test',
        snippet: 'truncated...',
        labelIds: ['INBOX'],
        payload: {
          mimeType: 'text/html',
          headers: [],
          body: { data: encode('<p>Hello, World!</p>') },
        },
      };

      const body = gmail.decodeBody(email);
      expect(body).toContain('Hello, World!');
      expect(body).not.toContain('<p>');
    });
  });

  describe('multipart emails', () => {
    it('should find text/plain in flat parts', () => {
      const email = {
        id: 'test',
        threadId: 'test',
        snippet: 'truncated...',
        labelIds: ['INBOX'],
        payload: {
          mimeType: 'multipart/alternative',
          headers: [],
          parts: [
            {
              mimeType: 'text/plain',
              body: { data: encode('Plain text version') },
            },
            {
              mimeType: 'text/html',
              body: { data: encode('<p>HTML version</p>') },
            },
          ],
        },
      };

      const body = gmail.decodeBody(email);
      expect(body).toBe('Plain text version');
    });

    it('should prefer text/plain over text/html', () => {
      const email = {
        id: 'test',
        threadId: 'test',
        snippet: 'truncated...',
        labelIds: ['INBOX'],
        payload: {
          mimeType: 'multipart/alternative',
          headers: [],
          parts: [
            {
              mimeType: 'text/html',
              body: { data: encode('<p>HTML first in list</p>') },
            },
            {
              mimeType: 'text/plain',
              body: { data: encode('Plain text second') },
            },
          ],
        },
      };

      const body = gmail.decodeBody(email);
      expect(body).toBe('Plain text second');
    });

    it('should fall back to text/html when no text/plain exists', () => {
      const email = {
        id: 'test',
        threadId: 'test',
        snippet: 'truncated...',
        labelIds: ['INBOX'],
        payload: {
          mimeType: 'multipart/alternative',
          headers: [],
          parts: [
            {
              mimeType: 'text/html',
              body: { data: encode('<div>HTML only email</div>') },
            },
          ],
        },
      };

      const body = gmail.decodeBody(email);
      expect(body).toContain('HTML only email');
      expect(body).not.toContain('<div>');
    });
  });

  describe('BUG-003: nested HTML parts', () => {
    it('should find HTML in deeply nested multipart structure', () => {
      // This is the exact structure that caused Bug #3
      // Real booking emails have: multipart/mixed -> multipart/alternative -> text/html
      const email = {
        id: 'test',
        threadId: 'test',
        snippet: 'truncated...',
        labelIds: ['INBOX'],
        payload: {
          mimeType: 'multipart/mixed',
          headers: [],
          parts: [
            {
              mimeType: 'multipart/alternative',
              parts: [
                {
                  mimeType: 'text/html',
                  body: { data: encode('<p>PNR: BUQ7SV</p><p>Flight booking confirmed</p>') },
                },
              ],
            },
          ],
        },
      };

      const body = gmail.decodeBody(email);
      expect(body).toContain('PNR: BUQ7SV');
      expect(body).toContain('Flight booking confirmed');
      expect(body).not.toBe('truncated...');
    });

    it('should find text/plain in nested structure over nested HTML', () => {
      const email = {
        id: 'test',
        threadId: 'test',
        snippet: 'truncated...',
        labelIds: ['INBOX'],
        payload: {
          mimeType: 'multipart/mixed',
          headers: [],
          parts: [
            {
              mimeType: 'multipart/alternative',
              parts: [
                {
                  mimeType: 'text/plain',
                  body: { data: encode('Plain text nested') },
                },
                {
                  mimeType: 'text/html',
                  body: { data: encode('<p>HTML nested</p>') },
                },
              ],
            },
          ],
        },
      };

      const body = gmail.decodeBody(email);
      expect(body).toBe('Plain text nested');
    });

    it('should handle 3+ levels of nesting', () => {
      const email = {
        id: 'test',
        threadId: 'test',
        snippet: 'truncated...',
        labelIds: ['INBOX'],
        payload: {
          mimeType: 'multipart/mixed',
          headers: [],
          parts: [
            {
              mimeType: 'multipart/related',
              parts: [
                {
                  mimeType: 'multipart/alternative',
                  parts: [
                    {
                      mimeType: 'text/html',
                      body: { data: encode('<p>Deeply nested content</p>') },
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      const body = gmail.decodeBody(email);
      expect(body).toContain('Deeply nested content');
    });
  });

  describe('HTML to text conversion', () => {
    it('should remove HTML tags', () => {
      const email = {
        id: 'test',
        threadId: 'test',
        snippet: 'truncated...',
        labelIds: ['INBOX'],
        payload: {
          mimeType: 'text/html',
          headers: [],
          body: { data: encode('<div><p>Hello</p><br><b>World</b></div>') },
        },
      };

      const body = gmail.decodeBody(email);
      expect(body).not.toContain('<');
      expect(body).not.toContain('>');
      expect(body).toContain('Hello');
      expect(body).toContain('World');
    });

    it('should convert <br> to newlines', () => {
      const email = {
        id: 'test',
        threadId: 'test',
        snippet: '',
        labelIds: [],
        payload: {
          mimeType: 'text/html',
          headers: [],
          body: { data: encode('Line1<br>Line2<br/>Line3') },
        },
      };

      const body = gmail.decodeBody(email);
      expect(body).toContain('Line1\nLine2\nLine3');
    });

    it('should decode HTML entities', () => {
      const email = {
        id: 'test',
        threadId: 'test',
        snippet: '',
        labelIds: [],
        payload: {
          mimeType: 'text/html',
          headers: [],
          body: { data: encode('&amp; &lt; &gt; &quot; &nbsp;') },
        },
      };

      const body = gmail.decodeBody(email);
      expect(body).toContain('&');
      expect(body).toContain('<');
      expect(body).toContain('>');
      expect(body).toContain('"');
    });

    it('should remove style and script tags with content', () => {
      const email = {
        id: 'test',
        threadId: 'test',
        snippet: '',
        labelIds: [],
        payload: {
          mimeType: 'text/html',
          headers: [],
          body: {
            data: encode(
              '<style>.foo { color: red; }</style><p>Visible</p><script>alert("x")</script>'
            ),
          },
        },
      };

      const body = gmail.decodeBody(email);
      expect(body).toContain('Visible');
      expect(body).not.toContain('color');
      expect(body).not.toContain('alert');
      expect(body).not.toContain('style');
      expect(body).not.toContain('script');
    });
  });

  describe('fallback behavior', () => {
    it('should fall back to snippet when no body data', () => {
      const email = {
        id: 'test',
        threadId: 'test',
        snippet: 'This is the snippet',
        labelIds: ['INBOX'],
        payload: {
          mimeType: 'multipart/alternative',
          headers: [],
          parts: [
            {
              mimeType: 'text/plain',
              body: {}, // no data
            },
          ],
        },
      };

      const body = gmail.decodeBody(email);
      expect(body).toBe('This is the snippet');
    });

    it('should return empty string when no snippet and no body', () => {
      const email = {
        id: 'test',
        threadId: 'test',
        snippet: '',
        labelIds: ['INBOX'],
        payload: {
          mimeType: 'multipart/alternative',
          headers: [],
          parts: [],
        },
      };

      const body = gmail.decodeBody(email);
      expect(body).toBe('');
    });
  });
});
