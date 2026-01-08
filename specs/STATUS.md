# uni-cli Project Status

> Last updated: 2026-01-06

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

### Phase 7: Config, Aliases & History ✅
- `uni config show/get/set/edit/path` - Configuration management
- `uni alias add/list/remove` - User-defined command shortcuts
- `uni history` - View, search, and re-run past commands
- Shell completions include aliases
- Commands logged to history automatically

### Phase 8: uni ask (Natural Language) ✅
- `uni ask "query"` - Translate natural language to commands
- LLM providers: Anthropic, OpenAI, Ollama, Groq
- `--dry-run` - Show command without executing
- `--no-confirm` - Skip confirmation prompt
- `-i` - Interactive mode (REPL)
- Configurable via `[ask]` section in config.toml

### Phase 11: Authentication & Setup System ✅
- `uni doctor` - Health check for all services and LLM providers
- `uni setup` - Interactive setup wizard with 3 modes
- `uni setup <service>` - Easy mode (use default credentials)
- `uni setup <service> --self-host` - Guided self-host wizard
- `uni setup --from <url|file>` - Import shared credentials
- Default Google credentials embedded (zero-config for users)
- Credential resolution: config > env > defaults
- `--logout` option for all Google services
- Token storage in `~/.uni/tokens/`

---

## Current Services (26 total)

| Service | Status | Auth Method |
|---------|--------|-------------|
| exa | ✅ Working | MCP (free) or EXA_API_KEY |
| gcal | ✅ Working | Google OAuth |
| gtasks | ✅ Working | Google OAuth |
| gcontacts | ✅ Working | Google OAuth |
| gmeet | ✅ Working | Google OAuth |
| gmail | ✅ Working | Google OAuth |
| gdrive | ✅ Working | Google OAuth |
| gsheets | ✅ Working | Google OAuth |
| gdocs | ✅ Working | Google OAuth |
| gslides | ✅ Working | Google OAuth |
| gforms | ✅ Working | Google OAuth |
| slack | ✅ Working | SLACK_BOT_TOKEN |
| notion | ✅ Working | NOTION_TOKEN |
| linear | ✅ Working | LINEAR_API_KEY |
| todoist | ✅ Working | TODOIST_API_KEY |
| telegram | ✅ Working | Telegram Bot Token |
| wa | ✅ Working | WhatsApp pairing code |
| stocks | ✅ Working | None (Yahoo Finance) |
| weather | ✅ Working | None (free API) |
| currency | ✅ Working | None (free API) |
| qrcode | ✅ Working | None (local) |
| shorturl | ✅ Working | None (free API) |
| arxiv | ✅ Working | None (free API) |
| hn | ✅ Working | None (free API) |
| reddit | ✅ Working | None (free API) |
| wiki | ✅ Working | None (free API) |

---

### Phase 9: uni flow ✅
- `uni run "cmd1" "cmd2"` - Quick multi-command execution
- `uni run -p` - Parallel execution
- `uni flow add/list/remove/run` - Saved macros
- Arguments ($1, $2) support
- Shorthand execution (`uni standup`)

---

### Phase 10: Extension System ✅
- Auto-discover npm packages (`@uni/service-*` and keyword-based)
- Auto-discover local plugins (`~/.uni/plugins/`)
- Directory plugins (`~/.uni/plugins/name/index.ts`)
- Auto-init `~/.uni` as package with `@uni/shared` for types
- `uni install/uninstall` convenience commands
- `uni list` shows source for each service [builtin/npm/plugin]
- Priority: local > npm > builtin (user overrides)

---

## Pending / Future

### Phase 12: Comprehensive LLM Providers ✅
- [x] Tier 1: Anthropic, OpenAI, Google, DeepSeek, xAI
- [x] Tier 2: Chinese providers (Zhipu GLM, Moonshot Kimi, Minimax, Qwen, Yi)
- [x] Tier 3: Aggregators (OpenRouter, Together, Fireworks, Cerebras, Replicate)
- [x] Tier 4: Local (Ollama, LM Studio, vLLM, LocalAI)
- [x] Custom provider config support
- [x] `uni ask providers` - List all providers
- [x] `uni ask models` - List models for a provider
- [x] `uni ask test` - Test a provider
- [x] Auto-detection of available providers
- [x] OpenAI-compatible API wrapper for most providers

**New Commands:**
```bash
uni ask providers              # List all LLM providers
uni ask models --provider anthropic  # List Anthropic models
uni ask test --provider deepseek     # Test DeepSeek connection
```

**Configuration:**
```toml
[ask]
provider = "openrouter"
model = "anthropic/claude-3.5-sonnet"
fallback = ["groq", "ollama"]

[ask.providers.ollama]
base_url = "http://localhost:11434"
```

---

### Phase 13: GSuite Expansion ✅
**Spec file**: `specs/phase-13-gsuite-expansion.md`

- [x] **gtasks** - Google Tasks (list, add, done, delete, lists)
- [x] **gcontacts** - Google Contacts (list, search, get, add, delete)
- [x] **gmeet** - Google Meet (create instant link, schedule, list)

### Phase 14: Universal Utilities ✅
**Spec file**: `specs/phase-14-universal-utilities.md`

- [x] **weather** - Current weather and forecasts (Open-Meteo, no key)
- [x] **currency** - Currency conversion (frankfurter.app, no key)
- [x] **qrcode** - Generate QR codes from text/URLs
- [x] **shorturl** - Shorten long URLs (is.gd, no key)

**Design Principles:**
- Zero configuration required
- No API keys or auth needed
- Fast responses (< 500ms)

### Phase 15: GSuite Expansion II ✅
**Spec file**: `specs/phase-15-gsuite-expansion.md`

- [x] **gsheets** - Google Sheets (list, get, create, set, append, share)
- [x] **gdocs** - Google Docs (list, get, create, append, replace, export, share)
- [x] **gslides** - Google Slides (list, get, create, add-slide, add-text, export, share)
- [x] **gforms** - Google Forms (list, get, create, add-question, responses, share, delete)
- [x] **gkeep** - Google Keep (list, get, add, delete) - **Workspace accounts only**

**Note:** Google Keep API requires Google Workspace Enterprise/Education Plus account.

---

### Phase 16: Google Auth Refactor ✅
**Spec file**: `specs/phase-16-google-auth-refactor.md`

Unified duplicated OAuth code across 11 Google services into `@uni/shared`.

- [x] Created `GoogleAuthClient` base class in shared
- [x] Refactored all 11 Google services to extend base class
- [x] Single OAuth port (8085) for all services
- [x] Tested all services

**Result:** 4125 → 2330 lines (-44%), bug fixes in 1 place.

---

### Phase 17: Shared Command Patterns ✅
**Spec file**: `specs/phase-17-shared-commands.md`

Unified duplicated command patterns into shared factories and helpers.

- [x] Added color helpers to shared (`c.cyan()`, `c.dim()`, `c.strikethrough()`, etc.)
- [x] Added auth command factory (`createGoogleAuthCommand()`)
- [x] Added setup factory (`createGoogleServiceSetup()`)
- [x] Refactored all 11 Google auth commands
- [x] Refactored all 11 Google service setup functions
- [x] Replaced 197 raw ANSI codes with `c.color()` helpers across 55 files
- [x] Build and tested

**Result:** Auth: 960 → 208 lines (-78%), Setup: 78 → 61 lines, ANSI codes centralized.

---

### Phase 25: WhatsApp History & Daemon Improvements (Pending)
**Spec file**: `specs/phase-25-wa-history.md`

- [ ] `uni wa history <chat>` - Fetch message history from WhatsApp
- [ ] `messaging-history.set` event listener in daemon
- [ ] Deduplication and 500 message limit in store
- [ ] Better error handling for history fetch

**Purpose:** Access old messages for deletion, improve daemon reliability.

---

### Phase 26: Modular Skill Files ✅
**Spec file**: `specs/phase-26-modular-skills.md`

- [x] Separate skills per service category (uni-wa, uni-telegram, uni-google, etc.)
- [x] Each skill has own YAML frontmatter with trigger descriptions
- [x] Symlinked to `~/.claude/skills/`
- [x] Main SKILL.md reduced from 1100 lines to 100 lines

**Result:** Claude now activates the right skill based on request context.

---

### Future: Phase 18 (TBD)
- Plugin development documentation
- More services (YouTube, Linear, etc.)
- TUI/terminal UI enhancements
- Command output formatting (JSON/human auto-detect)

---

## Plugins (External)

| Service | Status | Description |
|---------|--------|-------------|
| **spotify** | ✅ Working | Search, playlists, playback control (Premium) |
| **stripe** | ✅ Working | Payments, subscriptions, invoices, payment links |
| **hf** | ✅ Working | HuggingFace models, datasets, inference |

Location: `~/.uni/plugins/`

---

## Future Services

| Priority | Service | Description |
|----------|---------|-------------|
| 1 | **Trello** | Boards, cards |
| 2 | **YouTube** | Search, download, transcripts (via yt-dlp) |
| 3 | **Airtable** | Database/spreadsheet hybrid |

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
│   ├── service-gtasks/      # Google Tasks
│   ├── service-gcontacts/   # Google Contacts
│   ├── service-gmeet/       # Google Meet
│   ├── service-slack/       # Slack
│   ├── service-notion/      # Notion
│   ├── service-gmail/       # Gmail
│   ├── service-gdrive/      # Google Drive
│   ├── service-weather/     # Weather (Open-Meteo)
│   ├── service-currency/    # Currency (Frankfurter)
│   ├── service-qrcode/      # QR code generator
│   ├── service-shorturl/    # URL shortener (is.gd)
│   ├── service-gsheets/     # Google Sheets (Phase 15)
│   ├── service-gdocs/       # Google Docs (Phase 15)
│   ├── service-gslides/     # Google Slides (Phase 15)
│   ├── service-gforms/      # Google Forms (Phase 15)
│   └── service-gkeep/       # Google Keep (Phase 15)
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
    ├── ...
    ├── phase-9-uni-flow.md
    ├── phase-10-extension-system.md
    ├── phase-11-auth-setup.md
    ├── phase-12-llm-providers.md
    ├── phase-13-gsuite-expansion.md
    ├── phase-14-universal-utilities.md
    ├── phase-15-gsuite-expansion.md
    └── phase-16-google-auth-refactor.md
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

# uni ask - LLM provider (pick one)
export ANTHROPIC_API_KEY="..."   # Claude
export OPENAI_API_KEY="..."      # GPT
export GROQ_API_KEY="..."        # Groq (free tier)
# Or run Ollama locally (no key needed)
```
