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
  output?: string; // Captured stdout (for piping)
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
 * Parse conditional and pipe operators (&&, ||, |) in commands
 * Returns array of { command, condition, pipe } objects
 */
export interface ConditionalCommand {
  command: string;
  condition: 'always' | 'on-success' | 'on-failure';
  pipe?: boolean; // If true, previous command's output is piped to this one
}

export function parseConditionals(commands: string[]): ConditionalCommand[] {
  const result: ConditionalCommand[] = [];

  for (const cmd of commands) {
    // Split by &&, ||, and | while preserving the operator
    // Note: | must be checked carefully to not conflict with ||
    const parts = cmd.split(/(\s*&&\s*|\s*\|\|\s*|\s*\|\s*(?!\|))/);

    let condition: 'always' | 'on-success' | 'on-failure' = 'always';
    let pipe = false;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part) continue;

      if (part === '&&') {
        condition = 'on-success';
        pipe = false;
      } else if (part === '||') {
        condition = 'on-failure';
        pipe = false;
      } else if (part === '|') {
        condition = 'on-success'; // Pipe only runs if previous succeeds
        pipe = true;
      } else {
        result.push({ command: part, condition, pipe });
        condition = 'always'; // Reset for next independent command
        pipe = false;
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
 * Strip ANSI escape codes from a string
 */
export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
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
 * @param command - The command to execute
 * @param captureOutput - If true, capture output for piping instead of printing
 */
async function executeCommandOnce(command: string, captureOutput: boolean = false): Promise<FlowResult> {
  const start = Date.now();

  try {
    const { spawn } = await import('node:child_process');
    const path = await import('node:path');

    // Get the path to the uni CLI
    const uniPath = path.join(process.cwd(), 'packages/cli/src/main.ts');

    // Use shell to properly handle quoted arguments
    const fullCommand = `bun run ${uniPath} ${command}`;

    return new Promise((resolve) => {
      const child = spawn('sh', ['-c', fullCommand], {
        stdio: 'pipe',
        cwd: process.cwd(),
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
        if (!captureOutput) {
          process.stdout.write(data);
        }
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
          output: captureOutput ? stripAnsi(stdout.trim()) : undefined,
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
async function executeCommand(command: string, retry: number = 0, captureOutput: boolean = false): Promise<FlowResult> {
  const maxAttempts = retry + 1;
  let lastResult: FlowResult | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    lastResult = await executeCommandOnce(command, captureOutput);

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
 * Run multiple commands sequentially with conditional and pipe support
 */
export async function runSequential(commands: string[], options: RunOptions = {}): Promise<FlowResult[]> {
  const results: FlowResult[] = [];

  // Parse conditionals from commands
  const conditionalCommands = parseConditionals(commands);
  let lastSuccess = true;
  let lastOutput: string | undefined;

  for (let i = 0; i < conditionalCommands.length; i++) {
    const { command, condition, pipe } = conditionalCommands[i];
    const nextCmd = conditionalCommands[i + 1];
    const shouldCaptureForPipe = nextCmd?.pipe === true;

    // Check if we should run this command based on condition
    if (condition === 'on-success' && !lastSuccess) {
      continue; // Skip - previous command failed
    }
    if (condition === 'on-failure' && lastSuccess) {
      continue; // Skip - previous command succeeded
    }

    // If this command receives piped input, handle it
    if (pipe && lastOutput) {
      // Check for __PIPE__ format (structured pipe data)
      const pipeLines = lastOutput.split('\n').filter(line => line.startsWith('__PIPE__'));

      if (pipeLines.length > 0) {
        // Structured pipe mode - execute command for each item
        console.log(`\n${c.dim('─')} ${c.cyan(command)} ${c.dim(`(piping ${pipeLines.length} items)`)}`);

        let allSuccess = true;
        for (const line of pipeLines) {
          try {
            const data = JSON.parse(line.replace('__PIPE__', ''));
            let itemCommand: string;

            if (data.type === 'file') {
              // File: use --file flag
              const caption = data.caption ? ` '${data.caption.replace(/'/g, "'\\''")}'` : '';
              itemCommand = `${command} --file '${data.path}'${caption}`;
            } else {
              // Text: append as argument
              const escapedContent = data.content.replace(/'/g, "'\\''");
              itemCommand = `${command} '${escapedContent}'`;
            }

            if (options.dryRun) {
              console.log(`${c.dim('  →')} ${data.type === 'file' ? `[file] ${data.path}` : `[text] ${data.content.slice(0, 50)}...`}`);
            } else {
              const result = await executeCommand(itemCommand, options.retry, shouldCaptureForPipe);
              results.push(result);
              if (!result.success) allSuccess = false;
            }
          } catch {
            // Failed to parse, skip
          }
        }

        lastSuccess = allSuccess;
        lastOutput = undefined;
        continue;
      } else {
        // Plain text pipe - append as argument (legacy mode)
        const escapedOutput = lastOutput.replace(/'/g, "'\\''");
        const finalCommand = `${command} '${escapedOutput}'`;

        if (options.dryRun) {
          console.log(`${c.dim('→')} ${command} '<piped output>'`);
          results.push({ command: finalCommand, success: true, duration: 0 });
          lastSuccess = true;
          lastOutput = '<dry-run output>';
        } else {
          console.log(`\n${c.dim('─')} ${c.cyan(command)}${c.dim(' (piped)')}`);
          const result = await executeCommand(finalCommand, options.retry, shouldCaptureForPipe);
          results.push(result);
          lastSuccess = result.success;
          lastOutput = result.output;
        }
        continue;
      }
    }

    // Regular command (no pipe input)
    if (options.dryRun) {
      console.log(`${c.dim('→')} ${command}`);
      results.push({ command, success: true, duration: 0 });
      lastSuccess = true;
      lastOutput = '<dry-run output>';
    } else {
      console.log(`\n${c.dim('─')} ${c.cyan(command)}`);
      const result = await executeCommand(command, options.retry, shouldCaptureForPipe);
      results.push(result);
      lastSuccess = result.success;
      lastOutput = result.output;

      // Stop on first failure only for 'always' condition (no chaining)
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
