#!/usr/bin/env bun
/**
 * Move services between core and plugin
 *
 * Usage:
 *   bun scripts/plugin-move.ts extract <name>  # Core → Plugin
 *   bun scripts/plugin-move.ts absorb <name>   # Plugin → Core
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(import.meta.dir, '..');
const PACKAGES = path.join(ROOT, 'packages');
const REGISTRY = path.join(ROOT, 'registry/plugins.json');

const [,, action, name] = process.argv;

if (!action || !name) {
  console.log('Usage: bun scripts/plugin-move.ts <extract|absorb> <name>');
  process.exit(1);
}

const serviceDir = path.join(PACKAGES, `service-${name}`);
const pluginDir = path.join(ROOT, '..', `uni-plugin-${name}`);

if (action === 'extract') {
  // Core → Plugin
  if (!fs.existsSync(serviceDir)) {
    console.error(`Service "${name}" not found in packages/`);
    process.exit(1);
  }

  // Copy to plugin dir
  fs.cpSync(serviceDir, pluginDir, { recursive: true });

  // Update package.json name
  const pkgPath = path.join(pluginDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  pkg.name = `@uni/plugin-${name}`;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

  // Add to registry
  const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf-8'));
  if (!registry.plugins.find((p: any) => p.name === name)) {
    registry.plugins.push({
      name,
      package: `@uni/plugin-${name}`,
      description: pkg.description,
      version: pkg.version,
      repository: `github:shockz09/uni-plugin-${name}`,
      tags: []
    });
    fs.writeFileSync(REGISTRY, JSON.stringify(registry, null, 2) + '\n');
  }

  // Remove from packages
  fs.rmSync(serviceDir, { recursive: true });

  console.log(`✓ Extracted ${name} to ${pluginDir}`);
  console.log(`  → Added to registry/plugins.json`);
  console.log(`  → Removed from packages/`);
  console.log(`\nNext: cd ${pluginDir} && git init && gh repo create`);

} else if (action === 'absorb') {
  // Plugin → Core
  const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf-8'));
  const plugin = registry.plugins.find((p: any) => p.name === name);

  if (!plugin) {
    console.error(`Plugin "${name}" not found in registry`);
    process.exit(1);
  }

  if (fs.existsSync(serviceDir)) {
    console.error(`Service "${name}" already exists in packages/`);
    process.exit(1);
  }

  // Clone from repo or copy from ~/.uni/plugins
  const installedDir = path.join(process.env.HOME || '~', '.uni/plugins', name);
  if (fs.existsSync(installedDir)) {
    fs.cpSync(installedDir, serviceDir, { recursive: true });
  } else if (fs.existsSync(pluginDir)) {
    fs.cpSync(pluginDir, serviceDir, { recursive: true });
  } else {
    console.error(`Plugin not found. Install it first: uni plugins install ${name}`);
    process.exit(1);
  }

  // Update package.json name
  const pkgPath = path.join(serviceDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  pkg.name = `@uni/service-${name}`;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

  // Remove from registry
  registry.plugins = registry.plugins.filter((p: any) => p.name !== name);
  fs.writeFileSync(REGISTRY, JSON.stringify(registry, null, 2) + '\n');

  console.log(`✓ Absorbed ${name} into packages/service-${name}`);
  console.log(`  → Removed from registry/plugins.json`);
  console.log(`\nNext: bun run build`);

} else {
  console.error(`Unknown action: ${action}`);
  process.exit(1);
}
