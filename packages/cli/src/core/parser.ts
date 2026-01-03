/**
 * Argument parser for uni CLI
 *
 * Parses: uni [global-opts] <service> <command> [command-opts] [args]
 */

import type { GlobalFlags, OptionDef, ArgDef } from '@uni/shared';
import { InvalidOptionError, MissingArgumentError } from '@uni/shared';

export interface ParsedArgs {
  /** Global flags */
  globalFlags: GlobalFlags;

  /** Service name (e.g., 'exa', 'gh') */
  service: string | null;

  /** Command name (e.g., 'search', 'pr') */
  command: string | null;

  /** Subcommand (e.g., 'list', 'create') */
  subcommand: string | null;

  /** Parsed flag values */
  flags: Record<string, string | boolean | number>;

  /** Positional arguments */
  args: string[];

  /** Raw argv for pass-through */
  raw: string[];
}

const GLOBAL_OPTIONS: OptionDef[] = [
  { name: 'help', short: 'h', type: 'boolean', description: 'Show help' },
  { name: 'version', short: 'v', type: 'boolean', description: 'Show version' },
  { name: 'json', type: 'boolean', description: 'Output as JSON' },
  { name: 'verbose', type: 'boolean', description: 'Verbose output' },
  { name: 'quiet', short: 'q', type: 'boolean', description: 'Suppress output' },
  { name: 'config', short: 'c', type: 'string', description: 'Config file path' },
];

export function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {
    globalFlags: {
      json: false,
      verbose: false,
      quiet: false,
    },
    service: null,
    command: null,
    subcommand: null,
    flags: {},
    args: [],
    raw: argv,
  };

  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];

    // Check for flags
    if (arg.startsWith('--')) {
      const flagName = arg.slice(2);
      const [name, value] = flagName.includes('=')
        ? flagName.split('=', 2)
        : [flagName, undefined];

      // Check if it's a global flag (global flags work anywhere in command)
      const globalOpt = GLOBAL_OPTIONS.find(o => o.name === name);

      if (globalOpt) {
        if (globalOpt.type === 'boolean') {
          (result.globalFlags as Record<string, unknown>)[name] = true;
        } else {
          (result.globalFlags as Record<string, unknown>)[name] = value ?? argv[++i];
        }
      } else {
        // Command-specific flag
        if (value !== undefined) {
          result.flags[name] = value;
        } else {
          // Check if next arg is the value or if it's a boolean flag
          const nextArg = argv[i + 1];
          if (nextArg && !nextArg.startsWith('-')) {
            result.flags[name] = nextArg;
            i++;
          } else {
            result.flags[name] = true;
          }
        }
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      // Short flag
      const shortFlag = arg.slice(1);
      const globalOpt = GLOBAL_OPTIONS.find(o => o.short === shortFlag);

      if (globalOpt) {
        if (globalOpt.type === 'boolean') {
          (result.globalFlags as Record<string, unknown>)[globalOpt.name] = true;
        } else {
          (result.globalFlags as Record<string, unknown>)[globalOpt.name] = argv[++i];
        }
      } else {
        // Check if next arg is the value (not a flag)
        const nextArg = argv[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          result.flags[shortFlag] = nextArg;
          i++;
        } else {
          result.flags[shortFlag] = true;
        }
      }
    } else {
      // Positional argument
      if (!result.service) {
        result.service = arg;
      } else if (!result.command) {
        result.command = arg;
      } else if (!result.subcommand) {
        // Could be subcommand or argument
        result.subcommand = arg;
      } else {
        result.args.push(arg);
      }
    }

    i++;
  }

  return result;
}

/**
 * Parse command-specific arguments against definitions
 */
export function parseCommandArgs(
  args: string[],
  flags: Record<string, string | boolean | number>,
  argDefs: ArgDef[] = [],
  optionDefs: OptionDef[] = []
): { args: Record<string, string>; flags: Record<string, string | boolean | number> } {
  const parsedArgs: Record<string, string> = {};
  const parsedFlags: Record<string, string | boolean | number> = {};

  // Parse positional args
  for (let i = 0; i < argDefs.length; i++) {
    const def = argDefs[i];
    const value = args[i];

    if (value !== undefined) {
      parsedArgs[def.name] = value;
    } else if (def.required) {
      throw new MissingArgumentError(def.name, 'command');
    } else if (def.default !== undefined) {
      parsedArgs[def.name] = def.default;
    }
  }

  // Parse flags against definitions
  for (const def of optionDefs) {
    const value = flags[def.name] ?? flags[def.short ?? ''];

    if (value !== undefined) {
      // Validate type
      if (def.type === 'number' && typeof value === 'string') {
        const num = Number(value);
        if (isNaN(num)) {
          throw new InvalidOptionError(def.name, String(value), 'number');
        }
        parsedFlags[def.name] = num;
      } else if (def.type === 'boolean') {
        parsedFlags[def.name] = value === true || value === 'true';
      } else {
        parsedFlags[def.name] = value;
      }

      // Validate choices
      if (def.choices && typeof parsedFlags[def.name] === 'string') {
        if (!def.choices.includes(parsedFlags[def.name] as string)) {
          throw new InvalidOptionError(
            def.name,
            String(parsedFlags[def.name]),
            `one of: ${def.choices.join(', ')}`
          );
        }
      }
    } else if (def.required) {
      throw new MissingArgumentError(`--${def.name}`, 'command');
    } else if (def.default !== undefined) {
      parsedFlags[def.name] = def.default;
    }
  }

  // Pass through unknown flags
  for (const [key, value] of Object.entries(flags)) {
    if (!(key in parsedFlags)) {
      parsedFlags[key] = value;
    }
  }

  return { args: parsedArgs, flags: parsedFlags };
}
