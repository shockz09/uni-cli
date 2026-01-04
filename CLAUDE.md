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

## Key Commands

```bash
uni list                    # List all services
uni <service> --help        # Service help
uni plugins install <name>  # Install plugin
uni doctor                  # Health check
```

## Adding a New Service

1. Create `packages/service-<name>/`
2. Copy structure from existing service
3. Implement commands in `src/commands/`
4. Export service in `src/index.ts`
5. `bun run build`
6. Service auto-discovered

## Environment Variables

```bash
# Google services (gcal, gmail, gdrive, etc.)
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

# Other services
SLACK_BOT_TOKEN
NOTION_TOKEN
EXA_API_KEY  # optional, MCP works without it
```
