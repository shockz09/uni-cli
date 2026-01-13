# uni

A universal CLI that wraps 35+ services behind one consistent interface. Built for AI agents and humans who want to get things done without context-switching between tools.

```bash
uni <service> <command> [args] [--options]
```

## Why uni?

**For AI agents:** Zero context overhead. Instead of loading 500+ tokens per MCP tool, agents just need to know `uni <service> <command>`. Works with Claude Code, Cursor, OpenCode, or any agent that can run shell commands.

**For humans:** One CLI to rule them all. Stop memorizing different CLIs for every service. `uni gcal list`, `uni slack send`, `uni gsheets get` - same pattern everywhere.

## Installation

```bash
# Clone and build
git clone https://github.com/shockz09/uni-cli.git
cd uni-cli
bun install
bun run build

# Add to PATH (optional)
ln -s $(pwd)/packages/cli/dist/uni ~/.local/bin/uni

# Verify
uni list
uni doctor
```

## Quick Start

```bash
# Setup Google services (Calendar, Gmail, Drive, Sheets, etc.)
uni setup google

# Check what's configured
uni doctor

# Start using
uni gcal list                    # Today's calendar
uni gmail list --unread          # Unread emails
uni gsheets get <ID> --data      # Spreadsheet data
uni weather "New York"           # Weather
uni exa search "latest AI news"  # Web search
```

## Services

### Builtin (26 services)

| Category | Services |
|----------|----------|
| **Messaging** | `wa` (WhatsApp), `telegram` |
| **Google Suite** | `gcal`, `gmail`, `gdrive`, `gsheets`, `gdocs`, `gslides`, `gforms`, `gmeet`, `gtasks`, `gcontacts` |
| **Productivity** | `slack`, `notion`, `linear`, `todoist` |
| **Research** | `exa` (web search), `arxiv`, `reddit`, `hn` (Hacker News), `wiki` |
| **Utilities** | `weather`, `stocks`, `currency`, `qrcode`, `shorturl` |

### Plugins (10+ available)

```bash
uni plugins list                 # See available plugins
uni plugins install spotify      # Install a plugin
uni plugins install stripe       # Payment processing
uni plugins install airtable     # Database
```

Available: `spotify`, `stripe`, `airtable`, `trello`, `asana`, `sendgrid`, `resend`, `twilio`, `vonage`, `pushover`, `ntfy`, `cloudinary`, `imgbb`, `0x0`, `hf`

## Examples

### Messaging

```bash
uni wa send me "Remember to call mom"
uni wa send "+1234567890" "Meeting at 3pm"
uni telegram send me "Server deployed"
uni telegram send @channel "Release notes..."
```

### Google Suite

```bash
# Calendar
uni gcal list                              # Today's events
uni gcal list --days 7                     # Next 7 days
uni gcal add "Team standup" --time 10am    # Add event

# Gmail
uni gmail list --unread --limit 10         # Recent unread
uni gmail read <id>                        # Read email
uni gmail send "to@email.com" "Subject" "Body"

# Sheets
uni gsheets list                           # Your spreadsheets
uni gsheets get <ID> --data                # Fetch data
uni gsheets get <ID> A1:D100 --json        # Range as JSON
uni gsheets set <ID> A1 "Hello"            # Write cell
uni gsheets append <ID> "Col1" "Col2"      # Append row

# Drive
uni gdrive list                            # Recent files
uni gdrive upload ./file.pdf               # Upload
uni gdrive download <ID>                   # Download
```

### Productivity

```bash
# Slack
uni slack send "#general" "Deployed v2.0"
uni slack send "@john" "Can you review?"

# Notion
uni notion search "project roadmap"
uni notion pages --database <ID>

# Linear
uni linear issues --mine
uni linear create "Fix login bug" --project ABC

# Todoist
uni todoist list
uni todoist add "Review PR" --due tomorrow
```

### Research

```bash
# Web search
uni exa search "best practices for API design"
uni exa search "React 19 features" --num 20

# Academic
uni arxiv search "large language models" --limit 5

# Social
uni reddit search "homelab" --subreddit selfhosted
uni hn top --limit 10
uni wiki "Alan Turing"
```

### Utilities

```bash
uni weather "Tokyo"                        # Current weather
uni weather "London" --forecast            # 5-day forecast

uni stocks AAPL                            # Stock quote
uni stocks TSLA MSFT GOOGL                 # Multiple

uni currency 100 USD to EUR                # Convert

uni qrcode "https://example.com" -o qr.png # Generate QR

uni shorturl "https://very-long-url.com"   # Shorten URL
```

## Power Features

### Multi-Command Execution

```bash
# Sequential
uni run "gcal list" "gmail list --unread"

# Parallel
uni run -p "stocks AAPL" "stocks TSLA" "weather NYC"

# Conditional
uni run "cmd1 && cmd2"    # cmd2 runs only if cmd1 succeeds
uni run "cmd1 || cmd2"    # cmd2 runs only if cmd1 fails

# With retry
uni run --retry 3 "flaky-api-call"
```

### Data Piping

Transform and iterate over command output without needing `jq` or `xargs`:

```bash
# Select specific fields
uni pipe "gsheets get <ID>" --select "data[*]"

# Filter results
uni pipe "gmail list" --filter "from contains 'boss'"

# Run command for each item
uni pipe "gcal list" --select "events[*]" --each "slack send #standup '{{title}}'"

# Combine all
uni pipe "gsheets get <ID>" \
  --select "data[*]" \
  --filter "status == 'pending'" \
  --each "todoist add '{{task}}'"
```

### Natural Language

```bash
uni ask "show my calendar for tomorrow"
uni ask "send a slack message to #general saying hello"
uni ask -i                                 # Interactive mode
```

Supports multiple LLM providers: Anthropic, OpenAI, Google, DeepSeek, Groq, Ollama, and more.

### Saved Flows

```bash
# Create a flow
uni flow add morning "gcal list" "gmail list --unread" "hn top"

# Run it
uni morning

# Or with arguments
uni flow add notify "slack send #alerts $1"
uni notify "Server is down"
```

### Aliases

```bash
uni alias add inbox "gmail list --unread"
uni inbox

uni alias add prs "gh pr list --author @me"
uni prs
```

## Output Modes

```bash
# Human readable (default)
uni gcal list

# JSON (for scripting)
uni gcal list --json

# Quiet (suppress non-essential output)
uni gcal add "Meeting" -q

# Verbose (debug info)
uni gcal list --verbose
```

## Configuration

Config stored in `~/.uni/config.toml`:

```toml
[ask]
provider = "anthropic"
model = "claude-sonnet-4-20250514"

[alias]
inbox = "gmail list --unread"
cal = "gcal list"
```

Credentials stored securely in `~/.uni/credentials.json`.

## Authentication

Most services use OAuth or API keys:

```bash
# Google services (opens browser)
uni gcal auth
uni gmail auth

# API key services
uni exa auth          # Prompts for EXA_API_KEY
uni slack auth        # Prompts for SLACK_BOT_TOKEN

# Check auth status
uni doctor
```

## Shell Completions

```bash
# Zsh
uni completions zsh > ~/.zsh/completions/_uni

# Bash
uni completions bash > /etc/bash_completion.d/uni

# Fish
uni completions fish > ~/.config/fish/completions/uni.fish
```

## Development

```bash
# Build
bun run build

# Test
bun test

# Run from source
bun run packages/cli/src/main.ts <service> <command>

# Regenerate docs
bun run scripts/generate-docs.ts
```

### Adding a Service

1. Create `packages/service-<name>/`
2. Copy structure from existing service
3. Implement commands in `src/commands/`
4. Export service in `src/index.ts`
5. Run `bun run build`

Service is auto-discovered on next run.

### Creating a Plugin

Plugins live in a separate repo and are installed via `uni plugins install <name>`.

```bash
# Extract a builtin to plugin
bun scripts/plugin-move.ts extract <name>

# Absorb a plugin back to core
bun scripts/plugin-move.ts absorb <name>
```

## Project Structure

```
packages/
├── cli/              # Main CLI application
├── shared/           # Shared types & utilities
├── service-*/        # Individual service packages
skill/
├── SKILL.md          # AI agent instructions
├── REFERENCE.md      # Auto-generated command reference
specs/
├── STATUS.md         # Project status
registry/
└── plugins.json      # Plugin registry
```

## License

MIT

## Links

- [Full Command Reference](skill/REFERENCE.md)
- [AI Agent Skill File](skill/SKILL.md)
- [Project Status](specs/STATUS.md)
