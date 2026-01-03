/**
 * Service registry - discovers and loads services
 *
 * Discovery order (last wins for conflicts):
 * 1. Built-in services (packages/service-*)
 * 2. npm packages (@uni/service-* and keyword-based)
 * 3. Local plugins (~/.uni/plugins/)
 *
 * This means: local > npm > builtin (user overrides)
 */

import type { UniService, ServiceMetadata } from '@uni/shared';
import { ServiceNotFoundError } from '@uni/shared';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';

const PLUGINS_DIR = path.join(process.env.HOME || '~', '.uni/plugins');
const UNI_DIR = path.join(process.env.HOME || '~', '.uni');

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

    // Priority order: builtin (lowest) → npm → plugins (highest)
    // Later discoveries override earlier ones with same name

    // 1. Discover built-in services
    await this.discoverBuiltin();

    // 2. Discover npm services
    await this.discoverNpm();

    // 3. Discover plugin services (highest priority)
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
   * Discover npm services from node_modules
   *
   * Looks for:
   * 1. @uni/service-* (official packages)
   * 2. Any package with "uni-service" keyword (community packages)
   */
  private async discoverNpm(): Promise<void> {
    const nodeModulesDir = path.join(process.cwd(), 'node_modules');

    if (!fs.existsSync(nodeModulesDir)) {
      return;
    }

    try {
      // 1. Scan @uni/service-* (official)
      const uniScopeDir = path.join(nodeModulesDir, '@uni');
      if (fs.existsSync(uniScopeDir)) {
        const entries = fs.readdirSync(uniScopeDir, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory() && entry.name.startsWith('service-')) {
            await this.addNpmService(
              path.join(uniScopeDir, entry.name),
              `@uni/${entry.name}`
            );
          }
        }
      }

      // 2. Scan for keyword-based packages (community)
      // Look for uni-service-* packages at top level
      const topLevelEntries = fs.readdirSync(nodeModulesDir, { withFileTypes: true });

      for (const entry of topLevelEntries) {
        if (entry.isDirectory() && entry.name.startsWith('uni-service-')) {
          await this.addNpmService(
            path.join(nodeModulesDir, entry.name),
            entry.name
          );
        }
      }

      // Also scan scoped packages for uni-service keyword
      for (const entry of topLevelEntries) {
        if (entry.isDirectory() && entry.name.startsWith('@') && entry.name !== '@uni') {
          const scopeDir = path.join(nodeModulesDir, entry.name);
          try {
            const scopeEntries = fs.readdirSync(scopeDir, { withFileTypes: true });

            for (const scopeEntry of scopeEntries) {
              if (scopeEntry.isDirectory()) {
                const pkgPath = path.join(scopeDir, scopeEntry.name, 'package.json');
                if (fs.existsSync(pkgPath)) {
                  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
                  if (pkg.keywords?.includes('uni-service')) {
                    await this.addNpmService(
                      path.join(scopeDir, scopeEntry.name),
                      `${entry.name}/${scopeEntry.name}`
                    );
                  }
                }
              }
            }
          } catch {
            // Skip inaccessible scope directories
          }
        }
      }
    } catch {
      // node_modules not accessible
    }
  }

  /**
   * Add an npm service to the registry
   */
  private async addNpmService(pkgDir: string, pkgName: string): Promise<void> {
    try {
      const pkgPath = path.join(pkgDir, 'package.json');
      if (!fs.existsSync(pkgPath)) return;

      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

      // Determine service name from package name
      let serviceName = pkgName;
      if (serviceName.startsWith('@uni/service-')) {
        serviceName = serviceName.replace('@uni/service-', '');
      } else if (serviceName.startsWith('uni-service-')) {
        serviceName = serviceName.replace('uni-service-', '');
      } else if (serviceName.includes('/')) {
        // Scoped package: @scope/uni-service-name → name
        const parts = serviceName.split('/');
        serviceName = parts[1].replace('uni-service-', '').replace('uni-', '');
      }

      // Find entry point
      const mainFile = pkg.main || 'dist/index.js';
      const entryPath = path.join(pkgDir, mainFile);

      if (!fs.existsSync(entryPath)) {
        return;
      }

      this.services.set(serviceName, {
        name: serviceName,
        version: pkg.version || '0.0.0',
        description: pkg.description || `${serviceName} service`,
        source: 'npm',
        path: entryPath,
        authRequired: false,
        commands: [],
      });
    } catch {
      // Skip invalid packages
    }
  }

  /**
   * Discover plugin services from ~/.uni/plugins
   *
   * Supports:
   * - Single files: ~/.uni/plugins/weather.ts
   * - Directories: ~/.uni/plugins/my-tool/index.ts
   */
  private async discoverPlugins(): Promise<void> {
    try {
      if (!fs.existsSync(PLUGINS_DIR)) {
        return;
      }

      const entries = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true });

      for (const entry of entries) {
        try {
          if (entry.isFile() && entry.name.endsWith('.ts')) {
            // Single file plugin
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
          } else if (entry.isDirectory()) {
            // Directory plugin - look for index.ts
            const indexPath = path.join(PLUGINS_DIR, entry.name, 'index.ts');

            if (fs.existsSync(indexPath)) {
              const serviceName = entry.name;

              // Try to read package.json if exists
              let description = `${serviceName} plugin`;
              let version = '0.0.0';

              const pkgPath = path.join(PLUGINS_DIR, entry.name, 'package.json');
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
                path: indexPath,
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

  /**
   * Ensure plugin environment is set up (~/.uni with package.json)
   *
   * This auto-creates:
   * - ~/.uni/package.json with @uni/shared dependency
   * - ~/.uni/plugins/ directory
   * - Runs bun install to get types
   */
  async ensurePluginEnvironment(): Promise<void> {
    const pkgPath = path.join(UNI_DIR, 'package.json');

    // Create ~/.uni directory if needed
    if (!fs.existsSync(UNI_DIR)) {
      fs.mkdirSync(UNI_DIR, { recursive: true });
    }

    // Create plugins directory if needed
    if (!fs.existsSync(PLUGINS_DIR)) {
      fs.mkdirSync(PLUGINS_DIR, { recursive: true });
    }

    // Create package.json if needed
    if (!fs.existsSync(pkgPath)) {
      const pkg = {
        name: 'uni-plugins',
        private: true,
        type: 'module',
        dependencies: {
          '@uni/shared': '^0.1.0',
        },
      };

      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

      // Run bun install to get types
      try {
        execSync('bun install', {
          cwd: UNI_DIR,
          stdio: 'pipe',
        });
      } catch {
        // If bun fails, try npm
        try {
          execSync('npm install', {
            cwd: UNI_DIR,
            stdio: 'pipe',
          });
        } catch {
          // Installation failed - types won't be available
          console.warn('Warning: Could not install @uni/shared for plugin types');
        }
      }
    }
  }
}

// Singleton instance
export const registry = new ServiceRegistry();
