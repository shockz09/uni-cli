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
}

export interface RunOptions {
  parallel?: boolean;
  dryRun?: boolean;
  json?: boolean;
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
async function executeCommand(command: string): Promise<FlowResult> {
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
 * Run multiple commands sequentially
 */
export async function runSequential(commands: string[], options: RunOptions = {}): Promise<FlowResult[]> {
  const results: FlowResult[] = [];

  for (const command of commands) {
    if (options.dryRun) {
      console.log(`${c.dim('→')} ${command}`);
      results.push({ command, success: true, duration: 0 });
    } else {
      console.log(`\n${c.dim('─')} ${c.cyan(command)}`);
      const result = await executeCommand(command);
      results.push(result);

      // Stop on first failure for sequential execution
      if (!result.success) {
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
    return executeCommand(command);
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
