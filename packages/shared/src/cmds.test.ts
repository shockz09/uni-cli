/**
 * Tests for the declarative command system (cmds.ts)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cmds, registerExtractor } from './cmds';
import type { CommandContext } from './types';

// Mock API client
const createMockApi = (isAuth = true) => ({
  isAuthenticated: () => isAuth,
  name: 'testapi',
  getStats: vi.fn().mockResolvedValue({ words: 100, chars: 500 }),
  copyDocument: vi.fn().mockResolvedValue('new-doc-id'),
  moveDocument: vi.fn().mockResolvedValue(undefined),
  listDocuments: vi.fn().mockResolvedValue([{ id: '1', name: 'Doc 1' }]),
  createDocument: vi.fn().mockResolvedValue({ id: 'new-id', title: 'Test' }),
});

// Mock command context
const createMockContext = (
  args: Record<string, string> = {},
  flags: Record<string, unknown> = {},
  json = false
): CommandContext => ({
  args,
  flags,
  rawArgs: [],
  config: {},
  auth: null,
  globalFlags: { json, verbose: false, quiet: false },
  output: {
    isJsonMode: () => json,
    isPiped: () => false,
    pipe: vi.fn(),
    getPipeResult: () => null,
    json: vi.fn(),
    table: vi.fn(),
    text: vi.fn(),
    list: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    spinner: vi.fn().mockReturnValue({
      update: vi.fn(),
      success: vi.fn(),
      fail: vi.fn(),
      stop: vi.fn(),
    }),
  },
  prompt: {
    text: vi.fn(),
    confirm: vi.fn(),
    select: vi.fn(),
    multiselect: vi.fn(),
    password: vi.fn(),
  },
});

describe('cmds()', () => {
  describe('array shorthand', () => {
    it('creates command from simple array', () => {
      const api = createMockApi();
      const commands = cmds(api, 'test', {
        stats: ['getStats', 'Show document statistics', 'document'],
      });

      expect(commands).toHaveLength(1);
      expect(commands[0].name).toBe('stats');
      expect(commands[0].description).toBe('Show document statistics');
      expect(commands[0].args).toHaveLength(1);
      expect(commands[0].args![0].name).toBe('document');
      expect(commands[0].args![0].required).toBe(true);
    });

    it('creates command with options', () => {
      const api = createMockApi();
      const commands = cmds(api, 'test', {
        copy: ['copyDocument', 'Copy a document', 'document', { name: 'n' }],
      });

      expect(commands[0].options).toHaveLength(1);
      expect(commands[0].options![0].name).toBe('name');
      expect(commands[0].options![0].short).toBe('n');
      expect(commands[0].options![0].type).toBe('string');
    });

    it('creates command with typed options', () => {
      const api = createMockApi();
      const commands = cmds(api, 'test', {
        list: ['listDocuments', 'List documents', { limit: 'l:number' }],
      });

      expect(commands[0].options![0].name).toBe('limit');
      expect(commands[0].options![0].short).toBe('l');
      expect(commands[0].options![0].type).toBe('number');
    });

    it('creates command with multiple args', () => {
      const api = createMockApi();
      const commands = cmds(api, 'test', {
        move: ['moveDocument', 'Move document', 'document', 'folder'],
      });

      expect(commands[0].args).toHaveLength(2);
      expect(commands[0].args![0].name).toBe('document');
      expect(commands[0].args![1].name).toBe('folder');
    });
  });

  describe('object form', () => {
    it('creates command from object definition', () => {
      const api = createMockApi();
      const commands = cmds(api, 'test', {
        stats: {
          method: 'getStats',
          desc: 'Show document statistics',
          args: ['document'],
          aliases: ['st'],
        },
      });

      expect(commands[0].name).toBe('stats');
      expect(commands[0].description).toBe('Show document statistics');
      expect(commands[0].aliases).toEqual(['st']);
    });

    it('creates command with full option objects', () => {
      const api = createMockApi();
      const commands = cmds(api, 'test', {
        list: {
          method: 'listDocuments',
          desc: 'List documents',
          opts: {
            limit: {
              short: 'l',
              type: 'number',
              desc: 'Max items to return',
              default: 10,
            },
          },
        },
      });

      expect(commands[0].options![0]).toEqual({
        name: 'limit',
        short: 'l',
        type: 'number',
        description: 'Max items to return',
        required: undefined,
        choices: undefined,
        default: 10,
      });
    });
  });

  describe('ID extractors', () => {
    it('extracts document ID from URL', async () => {
      const api = createMockApi();
      const commands = cmds(api, 'test', {
        stats: ['getStats', 'Show stats', 'document:docId'],
      });

      const ctx = createMockContext({
        document: 'https://docs.google.com/document/d/abc123xyz/edit',
      });
      await commands[0].handler(ctx);

      expect(api.getStats).toHaveBeenCalledWith('abc123xyz');
    });

    it('passes through raw ID when no URL pattern', async () => {
      const api = createMockApi();
      const commands = cmds(api, 'test', {
        stats: ['getStats', 'Show stats', 'document:docId'],
      });

      const ctx = createMockContext({ document: 'abc123xyz' });
      await commands[0].handler(ctx);

      expect(api.getStats).toHaveBeenCalledWith('abc123xyz');
    });

    it('extracts sheet ID from URL', async () => {
      const api = createMockApi();
      const commands = cmds(api, 'test', {
        stats: ['getStats', 'Show stats', 'sheet:sheetId'],
      });

      const ctx = createMockContext({
        sheet: 'https://docs.google.com/spreadsheets/d/xyz789/edit',
      });
      await commands[0].handler(ctx);

      expect(api.getStats).toHaveBeenCalledWith('xyz789');
    });

    it('extracts folder ID from URL', async () => {
      const api = createMockApi();
      const commands = cmds(api, 'test', {
        move: ['moveDocument', 'Move doc', 'doc', 'folder:folderId'],
      });

      const ctx = createMockContext({
        doc: 'doc-id',
        folder: 'https://drive.google.com/drive/folders/folder123',
      });
      await commands[0].handler(ctx);

      expect(api.moveDocument).toHaveBeenCalledWith('doc-id', 'folder123');
    });

    it('supports custom extractors', async () => {
      registerExtractor('customId', (v) => v.replace('prefix-', ''));

      const api = createMockApi();
      const commands = cmds(api, 'test', {
        stats: ['getStats', 'Show stats', 'item:customId'],
      });

      const ctx = createMockContext({ item: 'prefix-abc123' });
      await commands[0].handler(ctx);

      expect(api.getStats).toHaveBeenCalledWith('abc123');
    });
  });

  describe('handler execution', () => {
    it('checks authentication by default', async () => {
      const api = createMockApi(false);
      const commands = cmds(api, 'test', {
        stats: ['getStats', 'Show stats', 'document'],
      });

      const ctx = createMockContext({ document: 'doc-id' });
      await commands[0].handler(ctx);

      expect(ctx.output.error).toHaveBeenCalledWith(
        'Not authenticated. Run "uni test auth" first.'
      );
      expect(api.getStats).not.toHaveBeenCalled();
    });

    it('skips auth check when skipAuth is true', async () => {
      const api = createMockApi(false);
      const commands = cmds(api, 'test', {
        stats: {
          method: 'getStats',
          desc: 'Show stats',
          args: ['document'],
          skipAuth: true,
        },
      });

      const ctx = createMockContext({ document: 'doc-id' });
      await commands[0].handler(ctx);

      expect(api.getStats).toHaveBeenCalled();
    });

    it('passes options as last argument', async () => {
      const api = createMockApi();
      const commands = cmds(api, 'test', {
        copy: ['copyDocument', 'Copy doc', 'document', { name: 'n' }],
      });

      const ctx = createMockContext({ document: 'doc-id' }, { name: 'My Copy' });
      await commands[0].handler(ctx);

      expect(api.copyDocument).toHaveBeenCalledWith('doc-id', { name: 'My Copy' });
    });

    it('outputs JSON when --json flag is set', async () => {
      const api = createMockApi();
      const commands = cmds(api, 'test', {
        stats: ['getStats', 'Show stats', 'document'],
      });

      const ctx = createMockContext({ document: 'doc-id' }, {}, true);
      await commands[0].handler(ctx);

      expect(ctx.output.json).toHaveBeenCalledWith({ words: 100, chars: 500 });
    });

    it('uses custom output handler when provided', async () => {
      const api = createMockApi();
      const customOutput = vi.fn();

      const commands = cmds(api, 'test', {
        stats: {
          method: 'getStats',
          desc: 'Show stats',
          args: ['document'],
          output: customOutput,
        },
      });

      const ctx = createMockContext({ document: 'doc-id' });
      await commands[0].handler(ctx);

      expect(customOutput).toHaveBeenCalledWith({ words: 100, chars: 500 }, ctx);
    });

    it('runs custom validation', async () => {
      const api = createMockApi();
      const commands = cmds(api, 'test', {
        stats: {
          method: 'getStats',
          desc: 'Show stats',
          args: ['document'],
          validate: (ctx) => (ctx.args.document === 'invalid' ? 'Invalid document' : null),
        },
      });

      const ctx = createMockContext({ document: 'invalid' });
      await commands[0].handler(ctx);

      expect(ctx.output.error).toHaveBeenCalledWith('Invalid document');
      expect(api.getStats).not.toHaveBeenCalled();
    });

    it('handles API errors', async () => {
      const api = createMockApi();
      api.getStats.mockRejectedValue(new Error('API Error'));

      const commands = cmds(api, 'test', {
        stats: ['getStats', 'Show stats', 'document'],
      });

      const ctx = createMockContext({ document: 'doc-id' });
      const spinner = ctx.output.spinner('');

      await expect(commands[0].handler(ctx)).rejects.toThrow('API Error');
      expect(spinner.fail).toHaveBeenCalledWith('Failed');
    });
  });

  describe('optional arguments', () => {
    it('handles optional arguments with ? suffix', () => {
      const api = createMockApi();
      const commands = cmds(api, 'test', {
        create: ['createDocument', 'Create document', 'title?'],
      });

      expect(commands[0].args![0].required).toBe(false);
    });

    it('passes undefined for missing optional args', async () => {
      const api = createMockApi();
      const commands = cmds(api, 'test', {
        create: ['createDocument', 'Create document', 'title?'],
      });

      const ctx = createMockContext({});
      await commands[0].handler(ctx);

      // Should not include undefined in args
      expect(api.createDocument).toHaveBeenCalledWith();
    });
  });
});
