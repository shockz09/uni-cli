/**
 * Plugin Manager - handles plugin installation, updates, and registry
 *
 * Plugins are stored in ~/.uni/plugins/ with bundled dependencies.
 * No `bun install` needed - zero install time.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';

const UNI_DIR = path.join(os.homedir(), '.uni');
const PLUGINS_DIR = path.join(UNI_DIR, 'plugins');
const REGISTRY_FILE = path.join(PLUGINS_DIR, '.registry.json');
const OFFICIAL_REGISTRY_URL = 'https://raw.githubusercontent.com/shockz09/uni-cli/main/registry/plugins.json';

// Check for updates every 3 days
const UPDATE_CHECK_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;

// Types
export interface InstalledPlugin {
  version: string;
  source: string; // npm:@uni/plugin-foo, github:user/repo, local:./path
  installedAt: string;
}

export interface PluginRegistry {
  installed: Record<string, InstalledPlugin>;
  lastUpdateCheck: string;
  availableUpdates: Record<string, string>; // name -> new version
}

export interface OfficialPlugin {
  name: string;
  package: string;
  description: string;
  version: string;
  repository?: string;
  tags?: string[];
}

export interface OfficialRegistry {
  version: number;
  plugins: OfficialPlugin[];
}

/**
 * Ensure plugins directory exists
 */
export function ensurePluginsDir(): void {
  if (!fs.existsSync(PLUGINS_DIR)) {
    fs.mkdirSync(PLUGINS_DIR, { recursive: true });
  }
}

/**
 * Load local registry from .registry.json
 */
export function loadRegistry(): PluginRegistry {
  ensurePluginsDir();

  if (!fs.existsSync(REGISTRY_FILE)) {
    return {
      installed: {},
      lastUpdateCheck: '',
      availableUpdates: {},
    };
  }

  try {
    const data = fs.readFileSync(REGISTRY_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {
      installed: {},
      lastUpdateCheck: '',
      availableUpdates: {},
    };
  }
}

/**
 * Save local registry to .registry.json
 */
export function saveRegistry(registry: PluginRegistry): void {
  ensurePluginsDir();
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
}

/**
 * Fetch official plugin registry from GitHub
 */
export async function fetchOfficialRegistry(): Promise<OfficialRegistry | null> {
  try {
    const response = await fetch(OFFICIAL_REGISTRY_URL);
    if (!response.ok) {
      return null;
    }
    return await response.json() as OfficialRegistry;
  } catch {
    return null;
  }
}

/**
 * Get list of installed plugins
 */
export function getInstalledPlugins(): Array<{ name: string; info: InstalledPlugin }> {
  const registry = loadRegistry();
  return Object.entries(registry.installed).map(([name, info]) => ({
    name,
    info,
  }));
}

/**
 * Check if a plugin is installed
 */
export function isInstalled(name: string): boolean {
  const registry = loadRegistry();
  return name in registry.installed;
}

/**
 * Get plugin path
 */
export function getPluginPath(name: string): string {
  return path.join(PLUGINS_DIR, name);
}

/**
 * Get plugin entry point
 */
export function getPluginEntryPoint(name: string): string | null {
  const pluginDir = getPluginPath(name);

  // Check for dist/index.js (bundled)
  const distPath = path.join(pluginDir, 'dist', 'index.js');
  if (fs.existsSync(distPath)) {
    return distPath;
  }

  // Check for index.js at root (legacy/linked)
  const rootPath = path.join(pluginDir, 'index.js');
  if (fs.existsSync(rootPath)) {
    return rootPath;
  }

  return null;
}

/**
 * Download npm package tarball and extract to plugins directory
 */
export async function installFromNpm(packageName: string, pluginName: string): Promise<void> {
  ensurePluginsDir();

  const pluginDir = getPluginPath(pluginName);

  // Get package info from npm registry
  const npmUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
  const response = await fetch(npmUrl);

  if (!response.ok) {
    throw new Error(`Package '${packageName}' not found on npm`);
  }

  const pkgInfo = await response.json() as {
    'dist-tags': { latest: string };
    versions: Record<string, { dist: { tarball: string } }>;
  };

  const latestVersion = pkgInfo['dist-tags'].latest;
  const tarballUrl = pkgInfo.versions[latestVersion].dist.tarball;

  // Download tarball
  const tarballResponse = await fetch(tarballUrl);
  if (!tarballResponse.ok) {
    throw new Error(`Failed to download package tarball`);
  }

  const tarballBuffer = await tarballResponse.arrayBuffer();

  // Create temp directory for extraction
  const tempDir = path.join(os.tmpdir(), `uni-plugin-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const tarballPath = path.join(tempDir, 'package.tgz');
  fs.writeFileSync(tarballPath, Buffer.from(tarballBuffer));

  // Extract tarball
  try {
    execSync(`tar -xzf "${tarballPath}" -C "${tempDir}"`, { stdio: 'pipe' });
  } catch {
    throw new Error('Failed to extract package tarball');
  }

  // npm tarballs extract to a 'package' subdirectory
  const extractedDir = path.join(tempDir, 'package');

  if (!fs.existsSync(extractedDir)) {
    throw new Error('Invalid package structure');
  }

  // Verify dist/index.js exists (bundled requirement)
  const distIndex = path.join(extractedDir, 'dist', 'index.js');
  if (!fs.existsSync(distIndex)) {
    // Clean up temp files
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw new Error(`Plugin '${packageName}' is not bundled. dist/index.js not found.`);
  }

  // Remove existing plugin if present
  if (fs.existsSync(pluginDir)) {
    fs.rmSync(pluginDir, { recursive: true, force: true });
  }

  // Move extracted package to plugins directory
  fs.renameSync(extractedDir, pluginDir);

  // Clean up temp files
  fs.rmSync(tempDir, { recursive: true, force: true });

  // Update registry
  const registry = loadRegistry();
  registry.installed[pluginName] = {
    version: latestVersion,
    source: `npm:${packageName}`,
    installedAt: new Date().toISOString(),
  };
  saveRegistry(registry);
}

/**
 * Install from GitHub repository
 */
export async function installFromGitHub(repoPath: string, pluginName: string): Promise<void> {
  ensurePluginsDir();

  const pluginDir = getPluginPath(pluginName);

  // Parse github:user/repo format
  const match = repoPath.match(/^github:([^/]+)\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid GitHub path: ${repoPath}. Use github:user/repo format.`);
  }

  const [, owner, repo] = match;

  // Try to download latest release first, fall back to main branch zip
  let downloadUrl: string;
  let version = 'main';

  try {
    // Check for latest release
    const releaseUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
    const releaseResponse = await fetch(releaseUrl, {
      headers: { 'User-Agent': 'uni-cli' },
    });

    if (releaseResponse.ok) {
      const release = await releaseResponse.json() as {
        tag_name: string;
        zipball_url: string;
      };
      downloadUrl = release.zipball_url;
      version = release.tag_name;
    } else {
      // Fall back to main branch
      downloadUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/main.zip`;
    }
  } catch {
    // Fall back to main branch
    downloadUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/main.zip`;
  }

  // Download zip
  const response = await fetch(downloadUrl, {
    headers: { 'User-Agent': 'uni-cli' },
  });

  if (!response.ok) {
    throw new Error(`Failed to download from GitHub: ${response.status}`);
  }

  const zipBuffer = await response.arrayBuffer();

  // Create temp directory
  const tempDir = path.join(os.tmpdir(), `uni-plugin-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const zipPath = path.join(tempDir, 'repo.zip');
  fs.writeFileSync(zipPath, Buffer.from(zipBuffer));

  // Extract zip
  try {
    execSync(`unzip -q "${zipPath}" -d "${tempDir}"`, { stdio: 'pipe' });
  } catch {
    throw new Error('Failed to extract GitHub archive');
  }

  // Find extracted directory (GitHub zips have a top-level folder like repo-main)
  const entries = fs.readdirSync(tempDir).filter(e =>
    e !== 'repo.zip' && fs.statSync(path.join(tempDir, e)).isDirectory()
  );

  if (entries.length === 0) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw new Error('Invalid GitHub archive structure');
  }

  const extractedDir = path.join(tempDir, entries[0]);

  // Verify dist/index.js exists
  const distIndex = path.join(extractedDir, 'dist', 'index.js');
  if (!fs.existsSync(distIndex)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw new Error(`Plugin '${repoPath}' is not bundled. dist/index.js not found.`);
  }

  // Remove existing plugin if present
  if (fs.existsSync(pluginDir)) {
    fs.rmSync(pluginDir, { recursive: true, force: true });
  }

  // Move to plugins directory
  fs.renameSync(extractedDir, pluginDir);

  // Clean up
  fs.rmSync(tempDir, { recursive: true, force: true });

  // Update registry
  const registry = loadRegistry();
  registry.installed[pluginName] = {
    version,
    source: `github:${owner}/${repo}`,
    installedAt: new Date().toISOString(),
  };
  saveRegistry(registry);
}

/**
 * Link a local plugin (development)
 */
export function linkPlugin(sourcePath: string, pluginName: string): void {
  ensurePluginsDir();

  const absolutePath = path.resolve(sourcePath);
  const pluginDir = getPluginPath(pluginName);

  // Verify source exists
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Path does not exist: ${absolutePath}`);
  }

  // Verify dist/index.js exists
  const distIndex = path.join(absolutePath, 'dist', 'index.js');
  if (!fs.existsSync(distIndex)) {
    throw new Error(`Plugin must be built first. dist/index.js not found in ${absolutePath}`);
  }

  // Remove existing plugin/symlink if present
  if (fs.existsSync(pluginDir) || fs.lstatSync(pluginDir).isSymbolicLink()) {
    fs.rmSync(pluginDir, { recursive: true, force: true });
  }

  // Create symlink
  fs.symlinkSync(absolutePath, pluginDir);

  // Read version from package.json if available
  let version = '0.0.0';
  const pkgPath = path.join(absolutePath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      version = pkg.version || version;
    } catch {
      // Ignore
    }
  }

  // Update registry
  const registry = loadRegistry();
  registry.installed[pluginName] = {
    version,
    source: `local:${absolutePath}`,
    installedAt: new Date().toISOString(),
  };
  saveRegistry(registry);
}

/**
 * Uninstall a plugin
 */
export function uninstallPlugin(name: string): void {
  const pluginDir = getPluginPath(name);

  if (!fs.existsSync(pluginDir)) {
    throw new Error(`Plugin '${name}' is not installed`);
  }

  // Remove plugin directory/symlink
  fs.rmSync(pluginDir, { recursive: true, force: true });

  // Update registry
  const registry = loadRegistry();
  delete registry.installed[name];
  delete registry.availableUpdates[name];
  saveRegistry(registry);
}

/**
 * Check for plugin updates
 */
export async function checkForUpdates(): Promise<Record<string, string>> {
  const registry = loadRegistry();
  const official = await fetchOfficialRegistry();

  if (!official) {
    return {};
  }

  const updates: Record<string, string> = {};

  for (const [name, info] of Object.entries(registry.installed)) {
    // Check official registry for updates
    const officialPlugin = official.plugins.find(p => p.name === name);
    if (officialPlugin && officialPlugin.version !== info.version) {
      updates[name] = officialPlugin.version;
    }

    // For npm plugins, check npm registry
    if (info.source.startsWith('npm:')) {
      const packageName = info.source.replace('npm:', '');
      try {
        const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`);
        if (response.ok) {
          const pkg = await response.json() as { version: string };
          if (pkg.version !== info.version) {
            updates[name] = pkg.version;
          }
        }
      } catch {
        // Ignore fetch errors
      }
    }
  }

  // Save updates to registry
  registry.availableUpdates = updates;
  registry.lastUpdateCheck = new Date().toISOString();
  saveRegistry(registry);

  return updates;
}

/**
 * Check if update check is needed (3 day interval)
 */
export function shouldCheckForUpdates(): boolean {
  const registry = loadRegistry();

  if (!registry.lastUpdateCheck) {
    return true;
  }

  const lastCheck = new Date(registry.lastUpdateCheck).getTime();
  const now = Date.now();

  return now - lastCheck > UPDATE_CHECK_INTERVAL_MS;
}

/**
 * Get available updates (from cached registry)
 */
export function getAvailableUpdates(): Record<string, string> {
  const registry = loadRegistry();
  return registry.availableUpdates || {};
}

/**
 * Format update reminder message
 */
export function formatUpdateReminder(): string | null {
  const updates = getAvailableUpdates();
  const names = Object.keys(updates);

  if (names.length === 0) {
    return null;
  }

  const formatted = names.map(name => `${name} ${updates[name]}`).join(', ');
  return `\uD83D\uDCE6 Updates: ${formatted}`;
}

/**
 * Search npm for uni plugins
 */
export async function searchNpm(query: string): Promise<Array<{ name: string; description: string; version: string }>> {
  const searchUrl = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}+keywords:uni-plugin&size=20`;

  try {
    const response = await fetch(searchUrl);
    if (!response.ok) {
      return [];
    }

    const data = await response.json() as {
      objects: Array<{
        package: {
          name: string;
          description: string;
          version: string;
        };
      }>;
    };

    return data.objects.map(obj => ({
      name: obj.package.name,
      description: obj.package.description || '',
      version: obj.package.version,
    }));
  } catch {
    return [];
  }
}

/**
 * Resolve plugin name to package name
 * Checks official registry first, then npm patterns
 */
export async function resolvePackageName(name: string): Promise<{ packageName: string; pluginName: string } | null> {
  // Check official registry first
  const official = await fetchOfficialRegistry();
  if (official) {
    const plugin = official.plugins.find(p => p.name === name);
    if (plugin) {
      return {
        packageName: plugin.package,
        pluginName: plugin.name,
      };
    }
  }

  // Try @uni/plugin-<name>
  try {
    const response = await fetch(`https://registry.npmjs.org/@uni/plugin-${name}`);
    if (response.ok) {
      return {
        packageName: `@uni/plugin-${name}`,
        pluginName: name,
      };
    }
  } catch {
    // Ignore
  }

  // Try uni-plugin-<name>
  try {
    const response = await fetch(`https://registry.npmjs.org/uni-plugin-${name}`);
    if (response.ok) {
      return {
        packageName: `uni-plugin-${name}`,
        pluginName: name,
      };
    }
  } catch {
    // Ignore
  }

  // Try exact package name (for community plugins)
  if (name.includes('/') || name.startsWith('uni-plugin-')) {
    try {
      const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`);
      if (response.ok) {
        // Extract plugin name from package name
        let pluginName = name;
        if (name.includes('/')) {
          pluginName = name.split('/').pop()!;
        }
        pluginName = pluginName.replace(/^uni-plugin-/, '').replace(/^@uni\/plugin-/, '');

        return {
          packageName: name,
          pluginName,
        };
      }
    } catch {
      // Ignore
    }
  }

  return null;
}
