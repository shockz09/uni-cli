# uni-cli

A unified CLI that wraps multiple services (MCPs, APIs, CLIs) into one interface.

## Quick Start

```bash
cd ~/projects/uni-cli
bun run build
bun run packages/cli/src/main.ts list
```

## Project Status

See `specs/STATUS.md` for full status. Summary:

- **Phase 1-5**: ✅ Complete (Foundation, Exa, GitHub, Calendar, Polish)
- **Phase 6**: ✅ Complete (Slack, Notion, Gmail, Drive)
- **Total Services**: 7

## Structure

```
packages/
├── cli/           # Main CLI
├── shared/        # Shared types
├── service-exa/   # Web search (MCP)
├── service-gh/    # GitHub (wraps gh CLI)
├── service-gcal/  # Google Calendar (OAuth)
├── service-slack/ # Slack (bot token)
├── service-notion/# Notion (integration token)
├── service-gmail/ # Gmail (OAuth)
└── service-gdrive/# Google Drive (OAuth)
```

## Key Files

- `specs/STATUS.md` - Project status and next steps
- `specs/phase-*.md` - Phase-specific specs
- `skill/SKILL.md` - Claude skill file
- `scripts/generate-docs.ts` - Regenerate REFERENCE.md

## Commands

```bash
# Build
bun run build

# Test a service
bun run packages/cli/src/main.ts exa search "test"
bun run packages/cli/src/main.ts gh pr list
bun run packages/cli/src/main.ts gcal list

# Regenerate docs
bun run scripts/generate-docs.ts

# Use globally (if ~/.local/bin in PATH)
uni list
```

## Adding a New Service

1. Create `packages/service-<name>/`
2. Copy structure from existing service (e.g., service-slack)
3. Implement commands in `src/commands/`
4. Export service in `src/index.ts`
5. Run `bun run build`
6. Service auto-discovered by registry

## Environment Variables

```bash
# Google (gcal, gmail, gdrive)
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

# Slack
SLACK_BOT_TOKEN

# Notion
NOTION_TOKEN

# Exa (optional)
EXA_API_KEY
```
