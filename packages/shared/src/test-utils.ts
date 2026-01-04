/**
 * Test utilities for uni-cli
 *
 * Shared helpers for unit and integration testing.
 */

/**
 * Capture stdout during function execution
 */
export function captureStdout<T>(fn: () => T): { result: T; stdout: string } {
  const originalWrite = process.stdout.write.bind(process.stdout);
  let output = '';

  process.stdout.write = (chunk: string | Uint8Array): boolean => {
    output += typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk);
    return true;
  };

  try {
    const result = fn();
    return { result, stdout: output };
  } finally {
    process.stdout.write = originalWrite;
  }
}

/**
 * Capture stdout during async function execution
 */
export async function captureStdoutAsync<T>(fn: () => Promise<T>): Promise<{ result: T; stdout: string }> {
  const originalWrite = process.stdout.write.bind(process.stdout);
  let output = '';

  process.stdout.write = (chunk: string | Uint8Array): boolean => {
    output += typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk);
    return true;
  };

  try {
    const result = await fn();
    return { result, stdout: output };
  } finally {
    process.stdout.write = originalWrite;
  }
}

/**
 * Create a mock email with specific structure
 */
export interface MockEmailOptions {
  html?: string;
  plain?: string;
  nested?: boolean;
  snippet?: string;
}

export interface MockEmailPart {
  mimeType: string;
  body?: { data?: string };
  parts?: MockEmailPart[];
}

export interface MockEmail {
  id: string;
  threadId: string;
  snippet: string;
  labelIds: string[];
  payload?: {
    mimeType?: string;
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: MockEmailPart[];
  };
}

export function createMockEmail(options: MockEmailOptions = {}): MockEmail {
  const { html, plain, nested = false, snippet = 'truncated snippet...' } = options;

  const base: MockEmail = {
    id: 'test-id',
    threadId: 'test-thread',
    snippet,
    labelIds: ['INBOX'],
    payload: {
      headers: [
        { name: 'From', value: 'test@example.com' },
        { name: 'Subject', value: 'Test Email' },
      ],
    },
  };

  if (plain && !html && !nested) {
    // Simple plain text email
    base.payload!.mimeType = 'text/plain';
    base.payload!.body = { data: Buffer.from(plain).toString('base64url') };
    return base;
  }

  if (html && !plain && !nested) {
    // Simple HTML email
    base.payload!.mimeType = 'text/html';
    base.payload!.body = { data: Buffer.from(html).toString('base64url') };
    return base;
  }

  if (nested) {
    // Deeply nested multipart email (common in real emails)
    base.payload!.mimeType = 'multipart/mixed';
    base.payload!.parts = [
      {
        mimeType: 'multipart/alternative',
        parts: [],
      },
    ];

    const alternative = base.payload!.parts[0].parts!;

    if (plain) {
      alternative.push({
        mimeType: 'text/plain',
        body: { data: Buffer.from(plain).toString('base64url') },
      });
    }

    if (html) {
      alternative.push({
        mimeType: 'text/html',
        body: { data: Buffer.from(html).toString('base64url') },
      });
    }

    return base;
  }

  // Flat multipart
  if (plain || html) {
    base.payload!.mimeType = 'multipart/alternative';
    base.payload!.parts = [];

    if (plain) {
      base.payload!.parts.push({
        mimeType: 'text/plain',
        body: { data: Buffer.from(plain).toString('base64url') },
      });
    }

    if (html) {
      base.payload!.parts.push({
        mimeType: 'text/html',
        body: { data: Buffer.from(html).toString('base64url') },
      });
    }
  }

  return base;
}

/**
 * Create a mock calendar event
 */
export interface MockEventOptions {
  title: string;
  start: Date;
  end?: Date;
  allDay?: boolean;
  location?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

export interface MockCalendarEvent {
  id: string;
  summary: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
  location?: string;
  status: string;
}

export function createMockEvent(options: MockEventOptions): MockCalendarEvent {
  const { title, start, end, allDay = false, location, status = 'confirmed' } = options;

  const event: MockCalendarEvent = {
    id: `event-${Date.now()}`,
    summary: title,
    start: {},
    end: {},
    status,
  };

  if (allDay) {
    event.start.date = start.toISOString().split('T')[0];
    const endDate = end || new Date(start.getTime() + 24 * 60 * 60 * 1000);
    event.end.date = endDate.toISOString().split('T')[0];
  } else {
    event.start.dateTime = start.toISOString();
    const endTime = end || new Date(start.getTime() + 60 * 60 * 1000);
    event.end.dateTime = endTime.toISOString();
  }

  if (location) event.location = location;

  return event;
}

/**
 * Calculate end date for calendar listing
 * Extracted for testability - days=1 means same day, days=7 means 7 days total
 */
export function calculateEndDate(startDate: Date, days: number): Date {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days - 1);
  endDate.setHours(23, 59, 59, 999);
  return endDate;
}

/**
 * Mock fetch responses for testing
 */
export interface MockResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}

export function createMockFetch(responses: Map<string, MockResponse>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    const response = responses.get(url);

    if (!response) {
      return {
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
        text: () => Promise.resolve('Not found'),
      } as MockResponse;
    }

    return response;
  }) as typeof fetch;
}

/**
 * Check if output contains ANSI escape codes
 */
export function hasAnsiCodes(str: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /\x1b\[[0-9;]*m/.test(str);
}

/**
 * Strip ANSI escape codes from string
 */
export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Check if string is valid JSON
 */
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}
