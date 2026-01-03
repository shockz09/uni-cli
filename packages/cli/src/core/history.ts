/**
 * Command history management
 */

import type { HistoryEntry, HistoryStore } from '@uni/shared';
import * as path from 'node:path';
import * as fs from 'node:fs';

const HISTORY_DIR = path.join(process.env.HOME || '~', '.uni');
const HISTORY_PATH = path.join(HISTORY_DIR, 'history.json');
const MAX_HISTORY = 1000;

export class HistoryManager {
  private store: HistoryStore | null = null;

  /**
   * Load history from file
   */
  async load(): Promise<HistoryStore> {
    if (this.store) {
      return this.store;
    }

    try {
      if (fs.existsSync(HISTORY_PATH)) {
        const content = fs.readFileSync(HISTORY_PATH, 'utf-8');
        this.store = JSON.parse(content);
      } else {
        this.store = { commands: [] };
      }
    } catch {
      this.store = { commands: [] };
    }

    return this.store;
  }

  /**
   * Add a command to history
   */
  async addCommand(cmd: string, exitCode: number): Promise<void> {
    await this.ensureDir();
    const store = await this.load();

    // Get next ID
    const maxId = store.commands.reduce((max, c) => Math.max(max, c.id), 0);

    const entry: HistoryEntry = {
      id: maxId + 1,
      cmd,
      time: new Date().toISOString(),
      exit: exitCode,
    };

    store.commands.push(entry);

    // Trim if exceeds max
    if (store.commands.length > MAX_HISTORY) {
      store.commands = store.commands.slice(-MAX_HISTORY);
    }

    await this.save();
  }

  /**
   * Get history entries
   */
  async getHistory(options: {
    limit?: number;
    search?: string;
    offset?: number;
  } = {}): Promise<HistoryEntry[]> {
    const store = await this.load();
    let entries = [...store.commands].reverse(); // Most recent first

    // Apply search filter
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      entries = entries.filter(e => e.cmd.toLowerCase().includes(searchLower));
    }

    // Apply offset
    if (options.offset && options.offset > 0) {
      entries = entries.slice(options.offset);
    }

    // Apply limit
    if (options.limit && options.limit > 0) {
      entries = entries.slice(0, options.limit);
    }

    return entries;
  }

  /**
   * Get a specific command by ID
   */
  async getCommand(id: number): Promise<HistoryEntry | null> {
    const store = await this.load();
    return store.commands.find(c => c.id === id) || null;
  }

  /**
   * Clear all history
   */
  async clearHistory(): Promise<void> {
    this.store = { commands: [] };
    await this.save();
  }

  /**
   * Get history file path
   */
  getPath(): string {
    return HISTORY_PATH;
  }

  /**
   * Ensure history directory exists
   */
  private async ensureDir(): Promise<void> {
    if (!fs.existsSync(HISTORY_DIR)) {
      fs.mkdirSync(HISTORY_DIR, { recursive: true });
    }
  }

  /**
   * Save history to file
   */
  private async save(): Promise<void> {
    if (!this.store) return;

    await this.ensureDir();
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(this.store, null, 2), 'utf-8');
  }
}

// Singleton instance
export const history = new HistoryManager();
