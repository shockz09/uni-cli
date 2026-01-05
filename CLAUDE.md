# uni-cli

**A CLI for AI agents** to access services without MCP context overhead.

## Why CLI over MCP

- **Zero context cost** - MCP tools add ~500+ tokens each to context window
- **Just needs skill.md** - Works with Claude Code, OpenCode, Cursor, etc.
- **Human-readable output** - AI can parse and act on it
- **No confirmation prompts** - Designed for autonomous agents
- **Consistent interface** - `uni <service> <command>` pattern across 19+ services

## Quick Start

```bash
cd ~/projects/uni-cli
bun run build
./packages/cli/dist/uni list
```

## Project Status

See `specs/STATUS.md` for current status.

## Structure

```
packages/
├── cli/              # Main CLI
├── shared/           # Shared types & utils
├── service-*/        # Service packages (19 total)
skill/
├── SKILL.md          # AI agent skill file
├── REFERENCE.md      # Auto-generated command reference
├── PATTERNS.md       # Workflow patterns
specs/
├── STATUS.md         # Project status
├── phase-*.md        # Phase specs
registry/
└── plugins.json      # Official plugin registry
```

## Commands

```bash
# Build
bun run build

# Test a service
bun run packages/cli/src/main.ts exa search "test"
bun run packages/cli/src/main.ts gcal list

# Regenerate docs
bun run scripts/generate-docs.ts

# Use globally (if ~/.local/bin in PATH)
uni list
uni <service> --help
uni plugins install <name>
uni doctor
```

## Adding a New Service

1. Create `packages/service-<name>/`
2. Copy structure from existing service
3. Implement commands in `src/commands/`
4. Export service in `src/index.ts`
5. `bun run build`
6. Service auto-discovered

## Moving Services Between Core and Plugins

```bash
# Extract a core service to the plugins monorepo
bun scripts/plugin-move.ts extract <name>
# Then: cd ../uni-plugins && git add . && git commit && git push

# Absorb a plugin back into core
bun scripts/plugin-move.ts absorb <name>
# Then: bun run build
```

Plugins live in `../uni-plugins/packages/` (monorepo).
Registry at `registry/plugins.json` tracks official plugins.

## Environment Variables

```bash
# Google services (gcal, gmail, gdrive, etc.)
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

# Other services
SLACK_BOT_TOKEN
NOTION_TOKEN
EXA_API_KEY  # optional, MCP works without it
```
