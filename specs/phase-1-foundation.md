# Phase 1: Foundation

## Objective
Set up the monorepo structure and implement the core CLI framework that all services will use.

## Deliverables

### 1. Project Structure
- [x] Create directory structure
- [x] Root package.json with workspaces
- [x] tsconfig.json with path aliases
- [x] bunfig.toml

### 2. Shared Package (`@uni/shared`)
- [x] types.ts - Core interfaces (UniService, Command, etc.)
- [x] errors.ts - Custom error classes
- [x] helpers.ts - Utility functions

### 3. CLI Package (`@uni/cli`)
- [x] main.ts - Entry point
- [x] core/cli.ts - CLI bootstrap and routing
- [x] core/parser.ts - Argument parsing
- [x] core/registry.ts - Service discovery
- [x] core/output.ts - Adaptive output formatting
- [x] core/config.ts - Config file loading
- [x] utils/colors.ts - ANSI color helpers
- [x] utils/prompt.ts - Interactive prompts

### 4. Commands to Implement
- [x] `uni --help` - Show global help
- [x] `uni --version` - Show version
- [x] `uni list` - List available services
- [x] `uni <service> --help` - Service-specific help (ready for services)

## Technical Specs

### Argument Parsing
Use Bun's built-in `parseArgs` or minimal custom parser:
```
uni [global-options] <service> <command> [command-options] [args]

Global options:
  --help, -h      Show help
  --version, -v   Show version
  --json          Force JSON output
  --verbose       Verbose logging
  --config <path> Custom config path
```

### Service Discovery
1. Built-in services: `packages/service-*`
2. External: `~/.uni/plugins/*.ts`
3. npm: `@uni/service-*` packages

### Output Formatting
```typescript
// Detect if stdout is TTY
const isTTY = process.stdout.isTTY;
const forceJson = flags.json || !isTTY;
```

### Config Loading Priority
1. `--config` flag
2. `./.uni/config.toml` (project)
3. `~/.uni/config.toml` (global)
4. Environment variables

## Success Criteria
- [x] `bun run uni --help` shows help text
- [x] `bun run uni --version` shows 0.1.0
- [x] `bun run uni list` shows "No services installed" (for now)
- [x] Output is human-readable in terminal, JSON when piped

## Status: COMPLETE

## Files to Create

```
packages/
├── shared/
│   ├── package.json
│   └── src/
│       ├── index.ts
│       ├── types.ts
│       ├── errors.ts
│       └── helpers.ts
└── cli/
    ├── package.json
    └── src/
        ├── main.ts
        ├── core/
        │   ├── cli.ts
        │   ├── parser.ts
        │   ├── registry.ts
        │   ├── output.ts
        │   └── config.ts
        └── utils/
            └── colors.ts
```
