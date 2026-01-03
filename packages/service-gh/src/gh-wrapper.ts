/**
 * GitHub CLI wrapper
 *
 * Executes gh commands and parses output
 */

import { exec } from '@uni/shared';

export interface GhResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export class GhWrapper {
  /**
   * Check if gh CLI is installed and authenticated
   */
  async isAvailable(): Promise<boolean> {
    try {
      const result = await exec('gh', ['auth', 'status']);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  /**
   * Run a gh command and return JSON output
   */
  async run<T = unknown>(args: string[]): Promise<GhResult<T>> {
    try {
      const result = await exec('gh', args);

      if (result.exitCode !== 0) {
        return {
          success: false,
          error: result.stderr || `gh command failed with exit code ${result.exitCode}`,
        };
      }

      // Try to parse as JSON
      if (result.stdout.trim()) {
        try {
          const data = JSON.parse(result.stdout) as T;
          return { success: true, data };
        } catch {
          // Not JSON, return as string in data
          return { success: true, data: result.stdout as unknown as T };
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Run a gh command and return raw text output
   */
  async runText(args: string[]): Promise<GhResult<string>> {
    try {
      const result = await exec('gh', args);

      if (result.exitCode !== 0) {
        return {
          success: false,
          error: result.stderr || `gh command failed with exit code ${result.exitCode}`,
        };
      }

      return { success: true, data: result.stdout };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// Singleton instance
export const gh = new GhWrapper();
