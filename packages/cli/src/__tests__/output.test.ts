/**
 * Output formatter tests
 *
 * Tests for consistent output formatting between JSON and human-readable modes.
 */

import { describe, expect, it, spyOn, beforeEach, afterEach } from 'bun:test';
import { createOutputFormatter } from '../core/output';
import { isValidJson, hasAnsiCodes, stripAnsi } from '@uni/shared';

describe('output formatter', () => {
  let consoleLogSpy: ReturnType<typeof spyOn>;
  let consoleErrorSpy: ReturnType<typeof spyOn>;
  let capturedOutput: string[];
  let capturedErrors: string[];

  beforeEach(() => {
    capturedOutput = [];
    capturedErrors = [];
    consoleLogSpy = spyOn(console, 'log').mockImplementation((...args) => {
      capturedOutput.push(args.map(String).join(' '));
    });
    consoleErrorSpy = spyOn(console, 'error').mockImplementation((...args) => {
      capturedErrors.push(args.map(String).join(' '));
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('JSON mode', () => {
    const output = createOutputFormatter({ json: true });

    it('isJsonMode should return true', () => {
      expect(output.isJsonMode()).toBe(true);
    });

    it('json() should output valid JSON', () => {
      output.json({ foo: 'bar', count: 42 });
      expect(capturedOutput.length).toBe(1);
      expect(isValidJson(capturedOutput[0])).toBe(true);
      expect(JSON.parse(capturedOutput[0])).toEqual({ foo: 'bar', count: 42 });
    });

    it('success() should output JSON', () => {
      output.success('Operation completed');
      expect(isValidJson(capturedOutput[0])).toBe(true);
      const parsed = JSON.parse(capturedOutput[0]);
      expect(parsed.status).toBe('success');
      expect(parsed.message).toBe('Operation completed');
    });

    it('error() should output JSON to stderr', () => {
      output.error('Something went wrong');
      expect(capturedErrors.length).toBe(1);
      expect(isValidJson(capturedErrors[0])).toBe(true);
      const parsed = JSON.parse(capturedErrors[0]);
      expect(parsed.status).toBe('error');
    });

    it('warn() should output JSON', () => {
      output.warn('Be careful');
      expect(isValidJson(capturedOutput[0])).toBe(true);
      const parsed = JSON.parse(capturedOutput[0]);
      expect(parsed.status).toBe('warning');
    });

    it('info() should output JSON', () => {
      output.info('FYI');
      expect(isValidJson(capturedOutput[0])).toBe(true);
      const parsed = JSON.parse(capturedOutput[0]);
      expect(parsed.status).toBe('info');
    });

    it('table() should output JSON array', () => {
      output.table([{ name: 'Alice', age: 30 }]);
      expect(isValidJson(capturedOutput[0])).toBe(true);
      const parsed = JSON.parse(capturedOutput[0]);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('list() should output JSON array', () => {
      output.list(['item1', 'item2', 'item3']);
      expect(isValidJson(capturedOutput[0])).toBe(true);
      const parsed = JSON.parse(capturedOutput[0]);
      expect(parsed).toEqual(['item1', 'item2', 'item3']);
    });
  });

  describe('human readable mode', () => {
    // Human readable mode is the default (JSON only when --json flag is passed)
    const output = createOutputFormatter({});

    it('text() should output plain text', () => {
      output.text('Hello world');
      expect(capturedOutput[0]).toBe('Hello world');
    });

    it('text() should be silent in quiet mode', () => {
      const quietOutput = createOutputFormatter({ quiet: true });
      quietOutput.text('This should not appear');
      expect(capturedOutput.length).toBe(0);
    });
  });

  describe('quiet mode', () => {
    // Quiet mode suppresses success, warn, info output (but not errors)
    const output = createOutputFormatter({ quiet: true });

    it('should suppress text()', () => {
      output.text('suppressed');
      expect(capturedOutput.length).toBe(0);
    });

    it('should suppress success() in quiet mode', () => {
      output.success('suppressed');
      expect(capturedOutput.length).toBe(0);
    });

    it('should suppress warn() in quiet mode', () => {
      output.warn('suppressed');
      expect(capturedOutput.length).toBe(0);
    });

    it('should suppress info() in quiet mode', () => {
      output.info('suppressed');
      expect(capturedOutput.length).toBe(0);
    });

    it('should NOT suppress error()', () => {
      output.error('critical error');
      expect(capturedErrors.length).toBe(1);
    });
  });

  describe('verbose mode', () => {
    it('debug() should only show in verbose mode', () => {
      const normalOutput = createOutputFormatter({});
      normalOutput.debug('debug message');
      expect(capturedOutput.length).toBe(0);

      const verboseOutput = createOutputFormatter({ verbose: true });
      verboseOutput.debug('debug message');
      expect(capturedOutput.length).toBe(1);
    });
  });

  describe('table formatting', () => {
    it('should handle empty data', () => {
      const output = createOutputFormatter({});
      output.table([]);
      // Should output "No results" or similar, not crash
      expect(capturedOutput.length).toBeGreaterThan(0);
    });

    it('should handle custom columns', () => {
      const output = createOutputFormatter({ json: true });
      const data = [{ a: 1, b: 2, c: 3 }];
      output.table(data, ['a', 'b']); // Only show a and b
      const parsed = JSON.parse(capturedOutput[0]);
      expect(parsed).toEqual([{ a: 1, b: 2, c: 3 }]); // JSON includes all columns
    });
  });
});

describe('output utilities', () => {
  describe('isValidJson', () => {
    it('should validate JSON correctly', () => {
      expect(isValidJson('{"key":"value"}')).toBe(true);
      expect(isValidJson('not json')).toBe(false);
    });
  });

  describe('hasAnsiCodes', () => {
    it('should detect ANSI escape codes', () => {
      expect(hasAnsiCodes('\x1b[32mgreen\x1b[0m')).toBe(true);
      expect(hasAnsiCodes('plain text')).toBe(false);
    });
  });

  describe('stripAnsi', () => {
    it('should remove ANSI codes', () => {
      expect(stripAnsi('\x1b[32mgreen\x1b[0m')).toBe('green');
      expect(stripAnsi('\x1b[1m\x1b[36mblue bold\x1b[0m')).toBe('blue bold');
    });
  });
});
