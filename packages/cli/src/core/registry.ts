/**
 * Service registry - discovers and loads services
 */

import type { UniService, ServiceMetadata } from '@uni/shared';
import { ServiceNotFoundError } from '@uni/shared';
import * as path from 'node:path';
import * as fs from 'node:fs';

const BUILTIN_SERVICES_DIR = path.join(import.meta.dir, '../../service-*');
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

    // Discover built-in services
    await this.discoverBuiltin();

    // Discover plugin services
    await this.discoverPlugins();

    // Discover npm services (future)
    // await this.discoverNpm();

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
   * Discover built-in services from packages/service-*
   */
  private async discoverBuiltin(): Promise<void> {
    const packagesDir = path.join(import.meta.dir, '../../../');

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
                authRequired: false, // Will be determined when loaded
                commands: [], // Will be populated when loaded
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
   */
  private async discoverPlugins(): Promise<void> {
    try {
      if (!fs.existsSync(PLUGINS_DIR)) {
        return;
      }

      const entries = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.ts')) {
          const serviceName = entry.name.replace('.ts', '');
          const servicePath = path.join(PLUGINS_DIR, entry.name);

          this.services.set(serviceName, {
            name: serviceName,
            version: '0.0.0',
            description: `${serviceName} plugin`,
            source: 'plugin',
            path: servicePath,
            authRequired: false,
            commands: [],
          });
        }
      }
    } catch {
      // Plugin directory doesn't exist or not accessible
    }
  }
}

// Singleton instance
export const registry = new ServiceRegistry();
