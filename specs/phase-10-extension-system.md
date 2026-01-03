# Phase 10: Extension System

> Status: ✅ COMPLETE

## Overview
Simple extension system. Auto-discover npm packages and local plugins. No complex management - just works.

---

## Extension Types

### 1. npm Packages
Published packages with `@uni/service-*` naming convention.

```bash
# Install with bun/npm
bun add @uni/service-linear

# Or use convenience command
uni install linear
```

Auto-discovered from node_modules.

### 2. Local Plugins
Drop files in `~/.uni/plugins/`.

```bash
# Single file
~/.uni/plugins/weather.ts

# Or directory
~/.uni/plugins/my-tool/
├── index.ts
└── api.ts
```

Auto-discovered on startup.

#### Auto-Init for Types
On first run, we auto-setup `~/.uni` as a package:

```
~/.uni/
├── package.json          # Auto-created
├── node_modules/
│   └── @uni/shared/      # Auto-installed
├── plugins/
│   └── weather.ts        # Full types available!
├── config.toml
└── history.json
```

This means local plugins get full TypeScript types automatically - no manual setup needed.

---

## Commands

### `uni install <name>` (optional convenience)
Shorthand for `bun add @uni/service-<name>`.

```bash
uni install linear
# → runs: bun add @uni/service-linear

uni install @other/some-plugin
# → runs: bun add @other/some-plugin
```

### `uni uninstall <name>` (optional convenience)
Shorthand for `bun remove`.

```bash
uni uninstall linear
# → runs: bun remove @uni/service-linear
```

### `uni list` (enhanced)
Shows all services with source.

```bash
uni list

# Output:
# exa      Exa search service           [builtin]
# gh       GitHub service               [builtin]
# gcal     Google Calendar              [builtin]
# linear   Linear issue tracking        [npm: @uni/service-linear]
# weather  Weather forecasts            [plugin]
```

---

## Auto-Discovery

### npm Packages
```typescript
// Registry scans node_modules for:
// 1. @uni/service-* (official)
// 2. Any package with "uni-service" keyword in package.json (community)

async discoverNpm(): Promise<void> {
  // Official packages
  await this.scanDir('./node_modules/@uni/service-*');

  // Community packages (keyword-based)
  const allPkgs = await this.readAllPackageJsons();
  const uniServices = allPkgs.filter(p =>
    p.keywords?.includes('uni-service')
  );
}
```

### Local Plugins
```typescript
// Registry scans ~/.uni/plugins/
async discoverPlugins(): Promise<void> {
  const pluginsDir = '~/.uni/plugins';
  // Find *.ts files and directories with index.ts
  // Load and validate each
}
```

### Auto-Init ~/.uni Environment
```typescript
async ensurePluginEnvironment(): Promise<void> {
  const uniDir = path.join(os.homedir(), '.uni');
  const pkgPath = path.join(uniDir, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    fs.writeFileSync(pkgPath, JSON.stringify({
      name: 'uni-plugins',
      private: true,
      dependencies: {
        '@uni/shared': '^0.1.0'
      }
    }, null, 2));

    execSync('bun install', { cwd: uniDir });
  }
}
```

### Priority
1. Built-in services (packages/service-*)
2. npm packages (@uni/service-* and keyword-based)
3. Local plugins (~/.uni/plugins/)

If name conflict: local > npm > builtin (user overrides)

---

## Writing a Plugin

### Minimal Example
```typescript
// ~/.uni/plugins/weather.ts
import type { UniService, Command } from '@uni/shared';

const getWeather: Command = {
  name: 'get',
  description: 'Get weather for a location',
  args: [{ name: 'location', required: true, description: 'City name' }],
  examples: ['uni weather get London'],

  async handler(ctx) {
    const location = ctx.args.location;
    // Fetch weather from API...
    ctx.output.success(`Weather in ${location}: 72°F, Sunny`);
  },
};

const service: UniService = {
  name: 'weather',
  description: 'Weather forecasts',
  version: '0.1.0',
  commands: [getWeather],
};

export default service;
```

### With Auth
```typescript
const service: UniService = {
  name: 'weather',
  description: 'Weather forecasts',
  version: '0.1.0',
  commands: [getWeather],

  auth: {
    type: 'apikey',
    envVar: 'WEATHER_API_KEY',
  },
};
```

---

## Publishing to npm

### Official Packages (by us)
```json
{
  "name": "@uni/service-example",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "keywords": ["uni-cli", "uni-service"],
  "peerDependencies": {
    "@uni/shared": "^0.1.0"
  }
}
```

### Community Packages (by anyone)
Third parties can't publish to `@uni/` scope. They use:

```json
{
  "name": "uni-service-linear",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "keywords": ["uni-cli", "uni-service"],
  "peerDependencies": {
    "@uni/shared": "^0.1.0"
  }
}
```

Or with their own scope:
```json
{
  "name": "@somedev/uni-service-weather",
  "keywords": ["uni-cli", "uni-service"]
}
```

**Key:** Include `"uni-service"` in keywords for auto-discovery.

### Package Structure
```
uni-service-example/
├── package.json
├── src/
│   ├── index.ts      # Exports UniService
│   └── commands/
│       └── example.ts
└── dist/             # Built output
```

### Install Command Resolution
```bash
uni install linear
# 1. Tries @uni/service-linear (official)
# 2. Tries uni-service-linear (community)
# 3. Shows error if not found

uni install @somedev/uni-service-weather
# Installs explicit package name
```

---

## Error Handling

Plugins that fail to load should NOT crash the CLI:

```typescript
async discoverPlugins(): Promise<void> {
  for (const plugin of plugins) {
    try {
      await this.loadPlugin(plugin);
    } catch (error) {
      console.warn(`Failed to load plugin: ${plugin.name}`);
      // Continue loading other plugins
    }
  }
}
```

---

## Implementation

### Files to Modify

```
packages/cli/src/
├── core/
│   └── registry.ts    # Add npm + plugin discovery
```

### Optional Files to Create

```
packages/cli/src/
├── commands/
│   ├── install.ts     # uni install (convenience)
│   └── uninstall.ts   # uni uninstall (convenience)
```

### Registry Updates

```typescript
class ServiceRegistry {
  async discover(): Promise<ServiceMetadata[]> {
    // 1. Built-in services (packages/service-*)
    await this.discoverBuiltin();

    // 2. npm packages (@uni/service-*)
    await this.discoverNpm();

    // 3. Local plugins (~/.uni/plugins/)
    await this.discoverPlugins();
  }
}
```

---

## What We're NOT Doing

- ❌ Git install (`github:user/repo`)
- ❌ `uni create-service` scaffolding
- ❌ Plugin marketplace/registry
- ❌ Complex plugin configuration
- ❌ Version management (npm handles this)
- ❌ Plugin sandboxing (future consideration)

For scaffolding: Just provide good docs + example code.

---

## Example: YouTube Service

First extension example (from extension-youtube.md):

```bash
# Install
bun add @uni/service-yt
# or
uni install yt

# Use
uni yt search "react tutorial"
uni yt download "https://youtube.com/..."
```

---

## Testing Checklist
- [x] npm packages auto-discovered from node_modules
- [x] Local .ts plugins auto-discovered
- [x] Local directory plugins auto-discovered
- [x] `uni install` runs bun add correctly
- [x] `uni uninstall` runs bun remove correctly
- [x] `uni list` shows source for each service
- [x] Broken plugins don't crash CLI
- [x] Name conflicts resolved correctly (local > npm > builtin)
