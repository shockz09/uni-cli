/**
 * Declarative Command System
 *
 * Converts a simple declarative syntax into full Command objects.
 * Reduces ~65 lines per command to ~1 line.
 *
 * @example
 * // Array shorthand (1 line per command)
 * export const commands = cmds(api, 'gdocs', {
 *   stats:  ['getStats',     'Show document statistics', 'document:docId'],
 *   copy:   ['copyDocument', 'Copy a document',          'document:docId', { name: 'n' }],
 *   move:   ['moveDocument', 'Move to folder',           'document:docId', 'folder:folderId'],
 * });
 *
 * @example
 * // Object form (for complex commands)
 * export const commands = cmds(api, 'gdocs', {
 *   comments: {
 *     method: 'listComments',
 *     desc: 'List document comments',
 *     args: ['document:docId'],
 *     opts: { limit: 'l:number' },
 *     aliases: ['cmt'],
 *     output: (result, ctx) => { ... },
 *   },
 * });
 */

import type { Command, CommandContext, ArgDef, OptionDef } from './types';

// ============================================================
// Types
// ============================================================

/** API client interface - must have isAuthenticated() and name */
export interface ApiClient {
  isAuthenticated(): boolean;
  name: string;
}

/**
 * Option definition - either shorthand string or full object
 *
 * Shorthand: 'l:number' = { short: 'l', type: 'number' }
 * Shorthand: 'n' = { short: 'n', type: 'string' }
 */
type OptDef =
  | string // shorthand: 'l:number' or just 'l' for string
  | {
      short?: string;
      desc?: string;
      type?: 'string' | 'boolean' | 'number';
      required?: boolean;
      choices?: string[];
      default?: string | boolean | number;
    };

/**
 * Argument definition - string with optional extractor
 *
 * 'document' = simple required arg
 * 'document:docId' = arg with ID extractor
 * 'document?' = optional arg
 * 'document:docId?' = optional arg with extractor
 */
type ArgSpec = string;

/**
 * Array shorthand for simple commands
 * [method, description, ...args, options?]
 */
type CmdArray = [method: string, desc: string, ...rest: (ArgSpec | Record<string, OptDef>)[]];

/**
 * Object form for complex commands
 */
interface CmdObject {
  method: string;
  desc: string;
  args?: ArgSpec[];
  opts?: Record<string, OptDef>;
  aliases?: string[];
  examples?: string[];
  /** Custom output handler (receives API result and context) */
  output?: (result: unknown, ctx: CommandContext) => void;
  /** Custom pre-handler validation */
  validate?: (ctx: CommandContext) => string | null;
  /** Skip automatic auth check */
  skipAuth?: boolean;
  /** Custom spinner message */
  spinnerMsg?: string;
}

type CmdDef = CmdArray | CmdObject;

// ============================================================
// ID Extractors
// ============================================================

const ID_EXTRACTORS: Record<string, (value: string) => string> = {
  // Google Docs/Drive
  docId: (v) => v.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)?.[1] || v,
  sheetId: (v) => v.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)?.[1] || v,
  slideId: (v) => v.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/)?.[1] || v,
  formId: (v) => v.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/)?.[1] || v,
  folderId: (v) => v.match(/\/folders\/([a-zA-Z0-9_-]+)/)?.[1] || v,
  fileId: (v) => v.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] || v,

  // Calendar
  calendarId: (v) => v,
  eventId: (v) => v,

  // Generic
  id: (v) => v,
};

/**
 * Register a custom ID extractor
 */
export function registerExtractor(name: string, fn: (value: string) => string): void {
  ID_EXTRACTORS[name] = fn;
}

// ============================================================
// Main Function
// ============================================================

/**
 * Create commands from declarative definitions
 *
 * @param api - API client (must have isAuthenticated() and name)
 * @param serviceName - Service name for auth messages
 * @param defs - Command definitions
 */
export function cmds<T extends ApiClient>(
  api: T,
  serviceName: string,
  defs: Record<string, CmdDef>
): Command[] {
  return Object.entries(defs).map(([name, def]) => createCommand(name, def, api, serviceName));
}

// ============================================================
// Implementation
// ============================================================

function createCommand<T extends ApiClient>(
  name: string,
  def: CmdDef,
  api: T,
  serviceName: string
): Command {
  const normalized = normalizeDef(def);
  const { method, desc, args, opts, aliases, examples, output, validate, skipAuth, spinnerMsg } =
    normalized;

  // Parse args into ArgDef[]
  const argDefs: ArgDef[] = args.map((a) => {
    const { argName, isOptional } = parseArgSpec(a);
    return {
      name: argName,
      description: `The ${argName}`,
      required: !isOptional,
    };
  });

  // Parse opts into OptionDef[]
  const optionDefs: OptionDef[] = Object.entries(opts).map(([n, o]) => normalizeOpt(n, o));

  return {
    name,
    description: desc,
    aliases,
    args: argDefs.length > 0 ? argDefs : undefined,
    options: optionDefs.length > 0 ? optionDefs : undefined,
    examples,

    async handler(ctx: CommandContext): Promise<void> {
      const { output: out, globalFlags } = ctx;

      // Auth check (unless skipped)
      if (!skipAuth && !api.isAuthenticated()) {
        out.error(`Not authenticated. Run "uni ${serviceName} auth" first.`);
        return;
      }

      // Custom validation
      if (validate) {
        const error = validate(ctx);
        if (error) {
          out.error(error);
          return;
        }
      }

      // Extract args with ID conversion
      const parsedArgs: unknown[] = [];
      for (const argSpec of args) {
        const { argName, extractor } = parseArgSpec(argSpec);
        const value = ctx.args[argName] as string | undefined;

        if (value !== undefined) {
          parsedArgs.push(extractor ? extractId(extractor, value) : value);
        }
      }

      // Build options object from flags
      const optValues: Record<string, unknown> = {};
      for (const [key, optDef] of Object.entries(opts)) {
        if (ctx.flags[key] !== undefined) {
          optValues[key] = ctx.flags[key];
        } else {
          // Check if option has a default
          const normalized = typeof optDef === 'string' ? {} : optDef;
          if (normalized.default !== undefined) {
            optValues[key] = normalized.default;
          }
        }
      }

      // Add options as final arg if any were passed
      if (Object.keys(optValues).length > 0) {
        parsedArgs.push(optValues);
      }

      // Execute with spinner
      const spinnerText = spinnerMsg || `Working...`;
      const spinner = out.spinner(spinnerText);

      try {
        // Call the API method
        const apiMethod = (api as unknown as Record<string, Function>)[method];
        if (typeof apiMethod !== 'function') {
          spinner.fail(`API method "${method}" not found`);
          return;
        }

        const result = await apiMethod.apply(api, parsedArgs);
        spinner.stop();

        // Output handling
        if (globalFlags.json) {
          out.json(result);
        } else if (output) {
          output(result, ctx);
        } else {
          // Default: show JSON for objects/arrays, text for primitives
          if (result === undefined || result === null) {
            out.success('Done');
          } else if (typeof result === 'object') {
            out.json(result);
          } else {
            out.text(String(result));
          }
        }
      } catch (error) {
        spinner.fail('Failed');
        throw error;
      }
    },
  };
}

// ============================================================
// Helper Functions
// ============================================================

interface NormalizedDef {
  method: string;
  desc: string;
  args: ArgSpec[];
  opts: Record<string, OptDef>;
  aliases?: string[];
  examples?: string[];
  output?: (result: unknown, ctx: CommandContext) => void;
  validate?: (ctx: CommandContext) => string | null;
  skipAuth?: boolean;
  spinnerMsg?: string;
}

function normalizeDef(def: CmdDef): NormalizedDef {
  if (Array.isArray(def)) {
    const [method, desc, ...rest] = def;

    // Last item might be options object
    const lastItem = rest[rest.length - 1];
    const hasOpts = lastItem && typeof lastItem === 'object' && !Array.isArray(lastItem);

    return {
      method,
      desc,
      args: (hasOpts ? rest.slice(0, -1) : rest) as string[],
      opts: (hasOpts ? lastItem : {}) as Record<string, OptDef>,
    };
  }

  return {
    method: def.method,
    desc: def.desc,
    args: def.args || [],
    opts: def.opts || {},
    aliases: def.aliases,
    examples: def.examples,
    output: def.output,
    validate: def.validate,
    skipAuth: def.skipAuth,
    spinnerMsg: def.spinnerMsg,
  };
}

interface ParsedArg {
  argName: string;
  extractor: string | null;
  isOptional: boolean;
}

function parseArgSpec(spec: string): ParsedArg {
  // Handle optional marker
  const isOptional = spec.endsWith('?');
  const cleanSpec = isOptional ? spec.slice(0, -1) : spec;

  // Handle extractor: 'document:docId' -> argName='document', extractor='docId'
  const [argName, extractor] = cleanSpec.split(':');

  return {
    argName,
    extractor: extractor || null,
    isOptional,
  };
}

function normalizeOpt(name: string, opt: OptDef): OptionDef {
  if (typeof opt === 'string') {
    // Parse shorthand: 'l:number', 'n', 'v:boolean'
    const parts = opt.split(':');
    const short = parts[0] || undefined;
    const typeStr = parts[1] || 'string';

    return {
      name,
      short: short && short.length === 1 ? short : undefined,
      description: `The ${name}`,
      type: typeStr as 'string' | 'boolean' | 'number',
    };
  }

  return {
    name,
    short: opt.short,
    description: opt.desc || `The ${name}`,
    type: opt.type || 'string',
    required: opt.required,
    choices: opt.choices,
    default: opt.default,
  };
}

function extractId(type: string, value: string): string {
  const extractor = ID_EXTRACTORS[type];
  return extractor ? extractor(value) : value;
}
