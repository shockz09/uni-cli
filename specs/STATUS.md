# uni-cli Project Status

> Last updated: 2025-01-03

## Completed Phases

### Phase 1: Foundation ✅
- Monorepo structure with Bun + TypeScript
- Core CLI framework (parser, registry, output, config)
- Commands: `uni --help`, `uni --version`, `uni list`
- All tests passing

### Phase 2: Exa Service ✅
- `uni exa search` - Web search via MCP (no API key needed)
- `uni exa code` - Code context/documentation
- `uni exa research` - Quick and deep research modes
- `uni exa company` - Company research
- MCP client implemented for free tier access
- Optional `--api` flag for direct API with EXA_API_KEY

### Phase 3: GitHub Service ✅
- `uni gh pr` - list, view, create, merge
- `uni gh issue` - list, view, create, close
- `uni gh repo` - view, clone, list, create
- Wraps `gh` CLI (requires `gh auth login`)

### Phase 4: Google Calendar ✅
- `uni gcal list` - List events (today, tomorrow, date range)
- `uni gcal add` - Create events with natural time parsing
- `uni gcal next` - Show upcoming events
- `uni gcal auth` - OAuth authentication
- Requires: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

### Phase 5: Polish ✅
- Shell completions: `uni completions zsh/bash/fish`
- Auto-generated REFERENCE.md from command definitions
- SKILL.md updated with all services
- PATTERNS.md with common workflows
- Global `uni` command via `~/.local/bin/uni`

### Additional Services (Post-MVP) ✅

#### Slack Service
- `uni slack channels` - list, info
- `uni slack messages` - read channel messages
- `uni slack send` - send messages
- `uni slack users` - list, info
- Requires: SLACK_BOT_TOKEN

#### Notion Service
- `uni notion search` - search pages and databases
- `uni notion pages` - view pages with content
- `uni notion databases` - list, query databases
- Requires: NOTION_TOKEN

#### Gmail Service
- `uni gmail list` - list emails with search
- `uni gmail read` - read email content
- `uni gmail send` - send emails
- `uni gmail auth` - OAuth (uses same Google creds as gcal)

#### Google Drive Service
- `uni gdrive list` - list files
- `uni gdrive search` - search files
- `uni gdrive auth` - OAuth (uses same Google creds as gcal)

---

## Current Services (7 total)

| Service | Status | Auth Method |
|---------|--------|-------------|
| exa | ✅ Working | MCP (free) or EXA_API_KEY |
| gh | ✅ Working | `gh auth login` |
| gcal | ✅ Working | Google OAuth |
| slack | ✅ Built | SLACK_BOT_TOKEN |
| notion | ✅ Built | NOTION_TOKEN |
| gmail | ✅ Built | Google OAuth |
| gdrive | ✅ Built | Google OAuth |

---

## Pending / Future

### Phase 6: Extension System
- [ ] Plugin loader for `~/.uni/plugins/`
- [ ] npm package discovery (`@uni/service-*`)
- [ ] Plugin scaffolding command: `uni create-service`
- [ ] Contributing guide

### Future Services (Ideas)
- YouTube (search, info)
- Trello (boards, cards)
- Linear (issues, projects)
- Spotify (playback, search)
- Weather
- Translator

---

## File Structure

```
~/projects/uni-cli/
├── packages/
│   ├── cli/                 # Main CLI
│   ├── shared/              # Shared types & utils
│   ├── service-exa/         # Exa (search)
│   ├── service-gh/          # GitHub
│   ├── service-gcal/        # Google Calendar
│   ├── service-slack/       # Slack
│   ├── service-notion/      # Notion
│   ├── service-gmail/       # Gmail
│   └── service-gdrive/      # Google Drive
├── skill/
│   ├── SKILL.md             # Main skill file
│   ├── REFERENCE.md         # Auto-generated command reference
│   └── PATTERNS.md          # Workflow patterns
├── scripts/
│   └── generate-docs.ts     # Generates REFERENCE.md
└── specs/
    ├── STATUS.md            # This file
    ├── phase-1-foundation.md
    ├── phase-2-exa.md
    └── ...
```

---

## Quick Start for Next Session

```bash
cd ~/projects/uni-cli

# Build
bun run build

# Test
bun run packages/cli/src/main.ts list
bun run packages/cli/src/main.ts exa search "test"
bun run packages/cli/src/main.ts gh --help

# Global command (if PATH includes ~/.local/bin)
uni list
```

## Environment Variables Needed

```bash
# Google services (gcal, gmail, gdrive)
export GOOGLE_CLIENT_ID="..."
export GOOGLE_CLIENT_SECRET="..."

# Slack
export SLACK_BOT_TOKEN="xoxb-..."

# Notion
export NOTION_TOKEN="secret_..."

# Exa (optional - MCP works without it)
export EXA_API_KEY="..."
```
