/**
 * Configuration management
 *
 * Priority:
 * 1. CLI flags
 * 2. Environment variables
 * 3. Project config (./.uni/config.toml)
 * 4. Global config (~/.uni/config.toml)
 * 5. Defaults
 */

import type { UniConfig, GlobalConfig, ServiceConfig, AskConfig } from '@uni/shared';
import { deepMerge } from '@uni/shared';
import * as path from 'node:path';
import * as fs from 'node:fs';

const GLOBAL_CONFIG_DIR = path.join(process.env.HOME || '~', '.uni');
const GLOBAL_CONFIG_PATH = path.join(GLOBAL_CONFIG_DIR, 'config.toml');
const PROJECT_CONFIG_PATH = '.uni/config.toml';

const DEFAULT_CONFIG: UniConfig = {
  version: '1.0',
  global: {
    defaultOutput: 'human',
    color: true,
  },
  services: {},
  aliases: {},
  ask: {
    confirm: true,
  },
  flows: {},
};

export class ConfigManager {
  private config: UniConfig | null = null;
  private configPath: string | null = null;

  /**
   * Load configuration
   */
  async load(customPath?: string): Promise<UniConfig> {
    if (this.config && !customPath) {
      return this.config;
    }

    let config = { ...DEFAULT_CONFIG };

    // Load global config
    const globalConfig = await this.loadFile(GLOBAL_CONFIG_PATH);
    if (globalConfig) {
      config = deepMerge(config, globalConfig);
      this.configPath = GLOBAL_CONFIG_PATH;
    }

    // Load project config (overrides global)
    const projectConfigPath = path.join(process.cwd(), PROJECT_CONFIG_PATH);
    const projectConfig = await this.loadFile(projectConfigPath);
    if (projectConfig) {
      config = deepMerge(config, projectConfig);
      this.configPath = projectConfigPath;
    }

    // Load custom config (overrides all)
    if (customPath) {
      const customConfig = await this.loadFile(customPath);
      if (customConfig) {
        config = deepMerge(config, customConfig);
        this.configPath = customPath;
      }
    }

    // Apply environment variable overrides
    config = this.applyEnvOverrides(config);

    this.config = config;
    return config;
  }

  /**
   * Get global configuration
   */
  getGlobal(): GlobalConfig {
    return this.config?.global ?? DEFAULT_CONFIG.global;
  }

  /**
   * Get service-specific configuration
   */
  getService(serviceName: string): ServiceConfig {
    return this.config?.services?.[serviceName] ?? {};
  }

  /**
   * Get configuration file path
   */
  getPath(): string | null {
    return this.configPath;
  }

  /**
   * Get global config directory path
   */
  getConfigDir(): string {
    return GLOBAL_CONFIG_DIR;
  }

  /**
   * Get global config file path (for display)
   */
  getGlobalConfigPath(): string {
    return GLOBAL_CONFIG_PATH;
  }

  /**
   * Get a value by dot notation (e.g., "global.color", "services.exa.default_num_results")
   */
  get(key: string): unknown {
    if (!this.config) return undefined;

    const parts = key.split('.');
    let obj: unknown = this.config;

    for (const part of parts) {
      if (obj && typeof obj === 'object' && part in obj) {
        obj = (obj as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return obj;
  }

  /**
   * Get all aliases
   */
  getAliases(): Record<string, string> {
    return this.config?.aliases ?? {};
  }

  /**
   * Get a specific alias
   */
  getAlias(name: string): string | undefined {
    return this.config?.aliases?.[name];
  }

  /**
   * Set an alias
   */
  async setAlias(name: string, command: string): Promise<void> {
    await this.ensureConfigDir();

    const configData = await this.loadFile(GLOBAL_CONFIG_PATH) || { ...DEFAULT_CONFIG };
    if (!configData.aliases) {
      configData.aliases = {};
    }
    configData.aliases[name] = command;

    await this.saveFile(GLOBAL_CONFIG_PATH, configData);
    this.config = null;
    await this.load();
  }

  /**
   * Remove an alias
   */
  async removeAlias(name: string): Promise<boolean> {
    await this.ensureConfigDir();

    const configData = await this.loadFile(GLOBAL_CONFIG_PATH) || { ...DEFAULT_CONFIG };
    if (!configData.aliases || !(name in configData.aliases)) {
      return false;
    }

    delete configData.aliases[name];
    await this.saveFile(GLOBAL_CONFIG_PATH, configData);
    this.config = null;
    await this.load();
    return true;
  }

  /**
   * Get all flows
   */
  getFlows(): Record<string, string[]> {
    return this.config?.flows ?? {};
  }

  /**
   * Get a specific flow
   */
  getFlow(name: string): string[] | undefined {
    return this.config?.flows?.[name];
  }

  /**
   * Set a flow
   */
  async setFlow(name: string, commands: string[]): Promise<void> {
    await this.ensureConfigDir();

    const configData = await this.loadFile(GLOBAL_CONFIG_PATH) || { ...DEFAULT_CONFIG };
    if (!configData.flows) {
      configData.flows = {};
    }
    configData.flows[name] = commands;

    await this.saveFile(GLOBAL_CONFIG_PATH, configData);
    this.config = null;
    await this.load();
  }

  /**
   * Remove a flow
   */
  async removeFlow(name: string): Promise<boolean> {
    await this.ensureConfigDir();

    const configData = await this.loadFile(GLOBAL_CONFIG_PATH) || { ...DEFAULT_CONFIG };
    if (!configData.flows || !(name in configData.flows)) {
      return false;
    }

    delete configData.flows[name];
    await this.saveFile(GLOBAL_CONFIG_PATH, configData);
    this.config = null;
    await this.load();
    return true;
  }

  /**
   * Get full config object
   */
  getFullConfig(): UniConfig | null {
    return this.config;
  }

  /**
   * Get ask configuration
   */
  getAsk(): AskConfig {
    return this.config?.ask ?? { confirm: true };
  }

  /**
   * Ensure config directory exists
   */
  async ensureConfigDir(): Promise<void> {
    if (!fs.existsSync(GLOBAL_CONFIG_DIR)) {
      fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
    }
  }

  /**
   * Save a value to global config
   */
  async set(key: string, value: unknown): Promise<void> {
    await this.ensureConfigDir();

    // Load existing config
    const config = await this.loadFile(GLOBAL_CONFIG_PATH) || { ...DEFAULT_CONFIG };

    // Set value (supports dot notation)
    const parts = key.split('.');
    let obj: Record<string, unknown> = config;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) {
        obj[parts[i]] = {};
      }
      obj = obj[parts[i]] as Record<string, unknown>;
    }

    obj[parts[parts.length - 1]] = value;

    // Save
    await this.saveFile(GLOBAL_CONFIG_PATH, config);

    // Reload
    this.config = null;
    await this.load();
  }

  /**
   * Load a TOML config file
   */
  private async loadFile(filePath: string): Promise<UniConfig | null> {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      return this.parseToml(content);
    } catch {
      return null;
    }
  }

  /**
   * Save config to TOML file
   */
  private async saveFile(filePath: string, config: Partial<UniConfig>): Promise<void> {
    const content = this.stringifyToml(config);
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * Simple TOML parser (basic support)
   */
  private parseToml(content: string): UniConfig {
    const config: UniConfig = { ...DEFAULT_CONFIG, aliases: {}, ask: { confirm: true }, flows: {} };
    let currentSection = '';

    for (const line of content.split('\n')) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Section header
      const sectionMatch = trimmed.match(/^\[(.+)\]$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1];
        continue;
      }

      // Key-value pair (support keys with hyphens and underscores)
      const kvMatch = trimmed.match(/^([\w-]+)\s*=\s*(.+)$/);
      if (kvMatch) {
        const [, key, rawValue] = kvMatch;
        const value = this.parseTomlValue(rawValue);

        if (currentSection === 'global') {
          (config.global as Record<string, unknown>)[key] = value;
        } else if (currentSection === 'aliases') {
          // Aliases section - value should always be string
          config.aliases![key] = String(value);
        } else if (currentSection === 'ask') {
          // Ask section
          (config.ask as Record<string, unknown>)[key] = value;
        } else if (currentSection === 'flows') {
          // Flows section - value should always be string array
          config.flows![key] = Array.isArray(value) ? value : [String(value)];
        } else if (currentSection.startsWith('services.')) {
          const serviceName = currentSection.replace('services.', '');
          if (!config.services[serviceName]) {
            config.services[serviceName] = {};
          }
          config.services[serviceName][key] = value;
        }
      }
    }

    return config;
  }

  /**
   * Parse a TOML value
   */
  private parseTomlValue(raw: string): unknown {
    const trimmed = raw.trim();

    // Array (e.g., ["cmd1", "cmd2"])
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const inner = trimmed.slice(1, -1);
      if (!inner.trim()) return [];

      // Parse array elements (handle quoted strings)
      const elements: string[] = [];
      let current = '';
      let inQuotes = false;
      let quoteChar = '';

      for (const char of inner) {
        if ((char === '"' || char === "'") && !inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar && inQuotes) {
          inQuotes = false;
          quoteChar = '';
        } else if (char === ',' && !inQuotes) {
          if (current.trim()) {
            elements.push(current.trim());
          }
          current = '';
        } else {
          current += char;
        }
      }
      if (current.trim()) {
        elements.push(current.trim());
      }

      return elements;
    }

    // String
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return trimmed.slice(1, -1);
    }

    // Boolean
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;

    // Number
    const num = Number(trimmed);
    if (!isNaN(num)) return num;

    // Default to string
    return trimmed;
  }

  /**
   * Stringify config to TOML
   */
  private stringifyToml(config: Partial<UniConfig>): string {
    const lines: string[] = [];

    if (config.version) {
      lines.push(`version = "${config.version}"`);
      lines.push('');
    }

    if (config.global) {
      lines.push('[global]');
      for (const [key, value] of Object.entries(config.global)) {
        lines.push(`${key} = ${this.tomlValue(value)}`);
      }
      lines.push('');
    }

    if (config.services) {
      for (const [serviceName, serviceConfig] of Object.entries(config.services)) {
        if (Object.keys(serviceConfig).length > 0) {
          lines.push(`[services.${serviceName}]`);
          for (const [key, value] of Object.entries(serviceConfig)) {
            lines.push(`${key} = ${this.tomlValue(value)}`);
          }
          lines.push('');
        }
      }
    }

    if (config.aliases && Object.keys(config.aliases).length > 0) {
      lines.push('[aliases]');
      for (const [name, command] of Object.entries(config.aliases)) {
        lines.push(`${name} = ${this.tomlValue(command)}`);
      }
      lines.push('');
    }

    if (config.ask && Object.keys(config.ask).length > 0) {
      lines.push('[ask]');
      for (const [key, value] of Object.entries(config.ask)) {
        lines.push(`${key} = ${this.tomlValue(value)}`);
      }
      lines.push('');
    }

    if (config.flows && Object.keys(config.flows).length > 0) {
      lines.push('[flows]');
      for (const [name, commands] of Object.entries(config.flows)) {
        lines.push(`${name} = ${this.tomlValue(commands)}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Convert value to TOML format
   */
  private tomlValue(value: unknown): string {
    if (Array.isArray(value)) {
      const items = value.map(v => `"${v}"`).join(', ');
      return `[${items}]`;
    }
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'number') return value.toString();
    return String(value);
  }

  /**
   * Apply environment variable overrides
   */
  private applyEnvOverrides(config: UniConfig): UniConfig {
    // UNI_OUTPUT=json
    if (process.env.UNI_OUTPUT) {
      config.global.defaultOutput = process.env.UNI_OUTPUT as 'human' | 'json';
    }

    // UNI_COLOR=false
    if (process.env.UNI_COLOR !== undefined) {
      config.global.color = process.env.UNI_COLOR !== 'false' && process.env.UNI_COLOR !== '0';
    }

    return config;
  }
}

// Singleton instance
export const config = new ConfigManager();
