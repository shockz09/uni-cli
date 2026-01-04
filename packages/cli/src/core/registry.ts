/**
 * Service registry - discovers and loads services
 *
 * Discovery order (last wins for conflicts):
 * 1. Built-in services (packages/service-*)
 * 2. Global plugins (~/.uni/plugins/)
 *
 * This means: plugins > builtin (user overrides)
 *
 * Note: npm node_modules scanning was removed in Phase 20.
 * Plugins are now installed globally via `uni plugins install`.
 */

import type { UniService, ServiceMetadata } from '@uni/shared';
import { ServiceNotFoundError } from '@uni/shared';
import * as path from 'node:path';
import * as fs from 'node:fs';

const PLUGINS_DIR = path.join(process.env.HOME || '~', '.uni/plugins');

export class ServiceRegistry {
  private services: Map<string, ServiceMetadata> = new Map();
  private loadedServices: Map<string, UniService> = new Map();
  private discovered = false;

  /**
   * Discover all available services
   */
  async discover(): Promise<ServiceMetadata[]> {
    if (this.discovered) {
      return Array.from(this.services.values());
    }

    // Clear previous discoveries
    this.services.clear();

    // Priority order: builtin (lowest) → plugins (highest)
    // Later discoveries override earlier ones with same name

    // 1. Discover built-in services
    await this.discoverBuiltin();

    // 2. Discover plugin services (highest priority)
    await this.discoverPlugins();

    this.discovered = true;
    return Array.from(this.services.values());
  }

  /**
   * Get metadata for a service
   */
  async getMetadata(name: string): Promise<ServiceMetadata | undefined> {
    if (!this.discovered) {
      await this.discover();
    }
    return this.services.get(name);
  }

  /**
   * Load a service by name
   */
  async load(name: string): Promise<UniService> {
    // Check cache
    const cached = this.loadedServices.get(name);
    if (cached) return cached;

    // Get metadata
    const metadata = await this.getMetadata(name);
    if (!metadata) {
      throw new ServiceNotFoundError(name);
    }

    // Dynamic import
    try {
      const module = await import(metadata.path);
      const service: UniService = module.default || module.service || module;

      // Validate service
      if (!service.name || !service.commands) {
        throw new Error(`Invalid service module: ${metadata.path}`);
      }

      // Run setup if exists
      if (service.setup) {
        await service.setup();
      }

      this.loadedServices.set(name, service);
      return service;
    } catch (error) {
      throw new Error(`Failed to load service '${name}': ${error}`);
    }
  }

  /**
   * List all available services
   */
  async list(): Promise<ServiceMetadata[]> {
    return this.discover();
  }

  /**
   * Check if a service exists
   */
  async has(name: string): Promise<boolean> {
    if (!this.discovered) {
      await this.discover();
    }
    return this.services.has(name);
  }

  /**
   * Force re-discovery (useful after install/uninstall)
   */
  invalidate(): void {
    this.discovered = false;
    this.services.clear();
    this.loadedServices.clear();
  }

  /**
   * Discover built-in services from packages/service-*
   */
  private async discoverBuiltin(): Promise<void> {
    // Handle both source (src/core) and bundled (dist) paths
    const currentDir = import.meta.dir;
    const isInDist = currentDir.includes('/dist');
    const packagesDir = isInDist
      ? path.join(currentDir, '../../')  // dist → packages
      : path.join(currentDir, '../../../');  // src/core → packages

    try {
      const entries = fs.readdirSync(packagesDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('service-')) {
          const serviceName = entry.name.replace('service-', '');
          const servicePath = path.join(packagesDir, entry.name, 'src/index.ts');

          if (fs.existsSync(servicePath)) {
            // Try to read metadata without full import
            try {
              const pkgPath = path.join(packagesDir, entry.name, 'package.json');
              const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

              this.services.set(serviceName, {
                name: serviceName,
                version: pkg.version || '0.0.0',
                description: pkg.description || `${serviceName} service`,
                source: 'builtin',
                path: servicePath,
                authRequired: false,
                commands: [],
              });
            } catch {
              // Fallback metadata
              this.services.set(serviceName, {
                name: serviceName,
                version: '0.0.0',
                description: `${serviceName} service`,
                source: 'builtin',
                path: servicePath,
                authRequired: false,
                commands: [],
              });
            }
          }
        }
      }
    } catch {
      // No built-in services found
    }
  }

  /**
   * Discover plugin services from ~/.uni/plugins
   *
   * Plugins must be bundled with dist/index.js.
   * Installed via `uni plugins install`.
   */
  private async discoverPlugins(): Promise<void> {
    try {
      if (!fs.existsSync(PLUGINS_DIR)) {
        return;
      }

      const entries = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true });

      for (const entry of entries) {
        // Skip hidden files like .registry.json
        if (entry.name.startsWith('.')) {
          continue;
        }

        try {
          if (entry.isDirectory() || entry.isSymbolicLink()) {
            // Plugin directory - look for dist/index.js (bundled)
            const pluginDir = path.join(PLUGINS_DIR, entry.name);
            const distPath = path.join(pluginDir, 'dist', 'index.js');

            // Also check for index.js at root (for linked plugins)
            const rootPath = path.join(pluginDir, 'index.js');

            const entryPath = fs.existsSync(distPath) ? distPath :
                              fs.existsSync(rootPath) ? rootPath : null;

            if (entryPath) {
              const serviceName = entry.name;

              // Try to read package.json if exists
              let description = `${serviceName} plugin`;
              let version = '0.0.0';

              const pkgPath = path.join(pluginDir, 'package.json');
              if (fs.existsSync(pkgPath)) {
                try {
                  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
                  description = pkg.description || description;
                  version = pkg.version || version;
                } catch {
                  // Ignore package.json parse errors
                }
              }

              this.services.set(serviceName, {
                name: serviceName,
                version,
                description,
                source: 'plugin',
                path: entryPath,
                authRequired: false,
                commands: [],
              });
            }
          }
        } catch {
          // Skip plugins that fail to load - don't crash the CLI
          console.warn(`Warning: Failed to load plugin '${entry.name}'`);
        }
      }
    } catch {
      // Plugin directory doesn't exist or not accessible
    }
  }

}

// Singleton instance
export const registry = new ServiceRegistry();
