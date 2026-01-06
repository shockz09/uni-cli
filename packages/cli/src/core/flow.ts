/**
 * Flow manager - handles multi-command execution and saved macros
 */

import { config } from './config';
import { parseArgs } from './parser';
import * as c from '../utils/colors';

export interface FlowResult {
  command: string;
  success: boolean;
  error?: string;
  duration: number;
  attempts?: number;
}

export interface RunOptions {
  parallel?: boolean;
  dryRun?: boolean;
  json?: boolean;
  retry?: number;
}

/**
 * Expand brace patterns in a string
 * Supports: {1..5} (numeric range), {a,b,c} (list)
 *
 * @example
 * expandBraces("hello{1..3}") // ["hello1", "hello2", "hello3"]
 * expandBraces("hello{a,b,c}") // ["helloa", "hellob", "helloc"]
 * expandBraces("{1..2}{a,b}") // ["1a", "1b", "2a", "2b"]
 */
export function expandBraces(input: string): string[] {
  // Find brace pattern
  const braceRegex = /\{([^{}]+)\}/;
  const match = input.match(braceRegex);

  if (!match) {
    return [input];
  }

  const before = input.slice(0, match.index);
  const after = input.slice(match.index! + match[0].length);
  const content = match[1];

  let expansions: string[] = [];

  // Check for range pattern: {1..5} or {a..z}
  const rangeMatch = content.match(/^(-?\d+)\.\.(-?\d+)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    const step = start <= end ? 1 : -1;
    for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
      expansions.push(String(i));
    }
  } else {
    // List pattern: {a,b,c}
    expansions = content.split(',').map(s => s.trim());
  }

  // Apply expansion and recurse for additional braces
  const results: string[] = [];
  for (const exp of expansions) {
    const combined = before + exp + after;
    results.push(...expandBraces(combined));
  }

  return results;
}

/**
 * Expand braces in an array of commands
 */
export function expandCommandBraces(commands: string[]): string[] {
  const expanded: string[] = [];
  for (const cmd of commands) {
    expanded.push(...expandBraces(cmd));
  }
  return expanded;
}

/**
 * Parse conditional operators (&& and ||) in commands
 * Returns array of { command, condition } objects
 */
export interface ConditionalCommand {
  command: string;
  condition: 'always' | 'on-success' | 'on-failure';
}

export function parseConditionals(commands: string[]): ConditionalCommand[] {
  const result: ConditionalCommand[] = [];

  for (const cmd of commands) {
    // Split by && and || while preserving the operator
    const parts = cmd.split(/(\s*&&\s*|\s*\|\|\s*)/);

    let condition: 'always' | 'on-success' | 'on-failure' = 'always';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part) continue;

      if (part === '&&') {
        condition = 'on-success';
      } else if (part === '||') {
        condition = 'on-failure';
      } else {
        result.push({ command: part, condition });
        condition = 'always'; // Reset for next independent command
      }
    }
  }

  return result;
}

/**
 * Read commands from a file (one per line)
 */
export async function readCommandsFromFile(filePath: string): Promise<string[]> {
  const fs = await import('node:fs/promises');
  const content = await fs.readFile(filePath, 'utf-8');

  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#')); // Skip empty lines and comments
}

/**
 * Sleep for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Substitute positional arguments ($1, $2, etc.) in commands
 */
export function substituteArgs(commands: string[], args: string[]): string[] {
  return commands.map(cmd => {
    let result = cmd;
    // Replace $1, $2, etc. with actual args
    for (let i = 0; i < args.length; i++) {
      const placeholder = `$${i + 1}`;
      result = result.replace(new RegExp(`\\$${i + 1}`, 'g'), args[i]);
    }
    return result;
  });
}

/**
 * Execute a single uni command by spawning a subprocess
 */
async function executeCommandOnce(command: string): Promise<FlowResult> {
  const start = Date.now();

  try {
    const { spawn } = await import('node:child_process');
    const path = await import('node:path');

    // Get the path to the uni CLI
    const uniPath = path.join(process.cwd(), 'packages/cli/src/main.ts');

    return new Promise((resolve) => {
      const child = spawn('bun', ['run', uniPath, ...command.split(/\s+/)], {
        stdio: 'pipe',
        cwd: process.cwd(),
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data);
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data);
      });

      child.on('close', (code) => {
        resolve({
          command,
          success: code === 0,
          error: code !== 0 ? stderr || `Exit code ${code}` : undefined,
          duration: Date.now() - start,
        });
      });

      child.on('error', (err) => {
        resolve({
          command,
          success: false,
          error: err.message,
          duration: Date.now() - start,
        });
      });
    });
  } catch (error) {
    return {
      command,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    };
  }
}

/**
 * Execute a command with retry and exponential backoff
 */
async function executeCommand(command: string, retry: number = 0): Promise<FlowResult> {
  const maxAttempts = retry + 1;
  let lastResult: FlowResult | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    lastResult = await executeCommandOnce(command);

    if (lastResult.success || attempt === maxAttempts) {
      lastResult.attempts = attempt;
      return lastResult;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s...
    const delayMs = Math.pow(2, attempt - 1) * 1000;
    console.log(`${c.yellow('↻')} Retry ${attempt}/${retry} in ${delayMs / 1000}s...`);
    await sleep(delayMs);
  }

  return lastResult!;
}

/**
 * Run multiple commands sequentially with conditional support
 */
export async function runSequential(commands: string[], options: RunOptions = {}): Promise<FlowResult[]> {
  const results: FlowResult[] = [];

  // Parse conditionals from commands
  const conditionalCommands = parseConditionals(commands);
  let lastSuccess = true;

  for (const { command, condition } of conditionalCommands) {
    // Check if we should run this command based on condition
    if (condition === 'on-success' && !lastSuccess) {
      continue; // Skip - previous command failed
    }
    if (condition === 'on-failure' && lastSuccess) {
      continue; // Skip - previous command succeeded
    }

    if (options.dryRun) {
      console.log(`${c.dim('→')} ${command}`);
      results.push({ command, success: true, duration: 0 });
      lastSuccess = true;
    } else {
      console.log(`\n${c.dim('─')} ${c.cyan(command)}`);
      const result = await executeCommand(command, options.retry);
      results.push(result);
      lastSuccess = result.success;

      // Stop on first failure only for 'always' condition (no chaining)
      // For && and || chains, we continue to evaluate the chain
      if (!result.success && condition === 'always') {
        break;
      }
    }
  }

  return results;
}

/**
 * Run multiple commands in parallel
 */
export async function runParallel(commands: string[], options: RunOptions = {}): Promise<FlowResult[]> {
  if (options.dryRun) {
    for (const command of commands) {
      console.log(`${c.dim('→')} ${command}`);
    }
    return commands.map(command => ({ command, success: true, duration: 0 }));
  }

  // Run all commands in parallel
  const promises = commands.map(async (command) => {
    console.log(`\n${c.dim('─')} ${c.cyan(command)}`);
    return executeCommand(command, options.retry);
  });

  return Promise.all(promises);
}

/**
 * Run commands with options
 */
export async function runCommands(commands: string[], options: RunOptions = {}): Promise<FlowResult[]> {
  const start = Date.now();
  const count = commands.length;

  if (!options.dryRun) {
    console.log(`${c.dim('⟳')} Running ${count} command${count === 1 ? '' : 's'}...`);
  }

  const results = options.parallel
    ? await runParallel(commands, options)
    : await runSequential(commands, options);

  const totalDuration = Date.now() - start;
  const allSuccess = results.every(r => r.success);

  if (!options.dryRun) {
    console.log('');
    if (allSuccess) {
      console.log(`${c.green('✓')} Done (${(totalDuration / 1000).toFixed(1)}s)`);
    } else {
      const failed = results.filter(r => !r.success).length;
      console.log(`${c.red('✗')} ${failed} command${failed === 1 ? '' : 's'} failed`);
    }
  }

  return results;
}

/**
 * Flow manager class
 */
export class FlowManager {
  /**
   * Get all flows
   */
  getFlows(): Record<string, string[]> {
    return config.getFlows();
  }

  /**
   * Get a specific flow
   */
  getFlow(name: string): string[] | undefined {
    return config.getFlow(name);
  }

  /**
   * Add a flow
   */
  async addFlow(name: string, commands: string[]): Promise<void> {
    await config.setFlow(name, commands);
  }

  /**
   * Remove a flow
   */
  async removeFlow(name: string): Promise<boolean> {
    return config.removeFlow(name);
  }

  /**
   * Run a flow with argument substitution
   */
  async runFlow(name: string, args: string[], options: RunOptions = {}): Promise<FlowResult[]> {
    const commands = this.getFlow(name);
    if (!commands) {
      throw new Error(`Flow not found: ${name}`);
    }

    const substituted = substituteArgs(commands, args);
    return runCommands(substituted, options);
  }

  /**
   * Check if a name is a flow (not a service/builtin)
   */
  hasFlow(name: string): boolean {
    return !!this.getFlow(name);
  }
}

// Singleton instance
export const flow = new FlowManager();
