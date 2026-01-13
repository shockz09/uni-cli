/**
 * Adaptive output formatting
 * - Human-readable by default
 * - JSON only when --json flag is passed
 * - Pipe-friendly: only outputs result value when stdout is piped
 */

import type { OutputFormatter, Spinner, GlobalFlags } from '@uni/shared';
import { isTTY, padRight, truncate } from '@uni/shared';
import * as c from '../utils/colors';

export function createOutputFormatter(flags: GlobalFlags): OutputFormatter {
  const forceJson = flags.json;
  const verbose = flags.verbose;
  const quiet = flags.quiet;
  const piped = !isTTY();

  // Track pipe result - commands call pipe() to set their pipeable output
  let pipeResult: string | null = null;

  return {
    isJsonMode(): boolean {
      return forceJson;
    },

    isPiped(): boolean {
      return piped && !forceJson; // Don't use pipe mode if --json is explicitly set
    },

    pipe(value: string): void {
      if (piped && !forceJson) {
        pipeResult = value;
        // Output immediately for piped mode
        console.log(value);
      }
    },

    getPipeResult(): string | null {
      return pipeResult;
    },

    json(data: unknown): void {
      console.log(JSON.stringify(data, null, 2));
    },

    table(data: Record<string, unknown>[], columns?: string[]): void {
      if (forceJson) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }

      if (data.length === 0) {
        console.log(c.muted('No results'));
        return;
      }

      // Determine columns
      const cols = columns || Object.keys(data[0]);

      // Calculate column widths
      const widths: Record<string, number> = {};
      for (const col of cols) {
        widths[col] = col.length;
        for (const row of data) {
          const value = String(row[col] ?? '');
          widths[col] = Math.max(widths[col], c.visibleLength(value));
        }
        // Cap at reasonable width
        widths[col] = Math.min(widths[col], 50);
      }

      // Print header
      const header = cols.map(col => c.bold(padRight(col.toUpperCase(), widths[col]))).join('  ');
      console.log(header);
      console.log(c.muted('─'.repeat(c.visibleLength(header))));

      // Print rows
      for (const row of data) {
        const line = cols.map(col => {
          const value = truncate(String(row[col] ?? ''), widths[col]);
          return padRight(value, widths[col]);
        }).join('  ');
        console.log(line);
      }
    },

    text(str: string): void {
      if (!quiet) {
        console.log(str);
      }
    },

    list(items: string[]): void {
      if (forceJson) {
        console.log(JSON.stringify(items, null, 2));
        return;
      }

      for (const item of items) {
        console.log(`  ${c.symbols.bullet} ${item}`);
      }
    },

    success(msg: string): void {
      if (piped && pipeResult) return; // Suppress if pipe output was set
      if (forceJson) {
        console.log(JSON.stringify({ status: 'success', message: msg }));
        return;
      }
      if (!quiet) {
        console.log(`${c.success(c.symbols.success)} ${msg}`);
      }
    },

    error(msg: string): void {
      // Always show errors, even when piped
      if (forceJson) {
        console.error(JSON.stringify({ status: 'error', message: msg }));
        return;
      }
      console.error(`${c.error(c.symbols.error)} ${c.error(msg)}`);
    },

    warn(msg: string): void {
      if (piped && pipeResult) return; // Suppress if pipe output was set
      if (forceJson) {
        console.log(JSON.stringify({ status: 'warning', message: msg }));
        return;
      }
      if (!quiet) {
        console.log(`${c.warning(c.symbols.warning)} ${c.warning(msg)}`);
      }
    },

    info(msg: string): void {
      if (piped && pipeResult) return; // Suppress if pipe output was set
      if (forceJson) {
        console.log(JSON.stringify({ status: 'info', message: msg }));
        return;
      }
      if (!quiet) {
        console.log(`${c.info(c.symbols.info)} ${msg}`);
      }
    },

    debug(msg: string): void {
      // Only suppress in pipe mode if verbose wasn't explicitly requested
      if (piped && !verbose) return;
      if (verbose && !quiet) {
        console.log(`${c.muted('[debug]')} ${c.muted(msg)}`);
      }
    },

    spinner(msg: string): Spinner {
      // Non-TTY: no animation, suppress if piped with result
      if (!isTTY() || forceJson || quiet) {
        return {
          update: () => {},
          success: (successMsg?: string) => {
            if (piped && pipeResult) return; // Suppress if pipe output was set
            if (!quiet) {
              if (forceJson) {
                console.log(JSON.stringify({ status: 'success', message: successMsg || msg }));
              } else {
                console.log(`${c.success(c.symbols.success)} ${successMsg || msg}`);
              }
            }
          },
          fail: (failMsg?: string) => {
            // Always show errors
            if (forceJson) {
              console.error(JSON.stringify({ status: 'error', message: failMsg || msg }));
            } else {
              console.error(`${c.error(c.symbols.error)} ${failMsg || msg}`);
            }
          },
          stop: () => {},
        };
      }

      const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
      let frameIndex = 0;
      let currentMsg = msg;

      const interval = setInterval(() => {
        process.stdout.write(`\r${c.cyan(frames[frameIndex])} ${currentMsg}`);
        frameIndex = (frameIndex + 1) % frames.length;
      }, 80);

      return {
        update(newMsg: string): void {
          currentMsg = newMsg;
        },

        success(successMsg?: string): void {
          clearInterval(interval);
          process.stdout.write(`\r${c.success(c.symbols.success)} ${successMsg || currentMsg}\n`);
        },

        fail(failMsg?: string): void {
          clearInterval(interval);
          process.stdout.write(`\r${c.error(c.symbols.error)} ${failMsg || currentMsg}\n`);
        },

        stop(): void {
          clearInterval(interval);
          process.stdout.write('\r' + ' '.repeat(currentMsg.length + 3) + '\r');
        },
      };
    },
  };
}
