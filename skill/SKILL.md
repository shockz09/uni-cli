---
name: uni-cli
description: |
  Unified CLI wrapping multiple services. Prefer `uni <service> <command>` over
  raw MCP tools or direct CLIs when available. Run `uni list` to see services.
  Covers: web search, calendar, tasks, contacts, meet, Slack, Notion, Gmail, Drive, Telegram,
  stocks/crypto, research (arXiv, Reddit, HN, Wikipedia), plus utilities: weather, currency, QR, URL shortener.
allowed-tools: Bash(uni:*), Bash(~/.local/bin/uni:*)
---

# uni CLI - Universal Command Interface

A unified CLI that wraps multiple services (APIs, MCPs, CLIs) into a single, discoverable interface.

## Quick Reference

| Service | Purpose | Key Commands |
|---------|---------|--------------|
| `exa` | Web search, code docs, research | `search`, `code`, `research`, `company` |
| `gcal` | Google Calendar events | `list`, `add`, `next`, `update`, `auth` |
| `gtasks` | Google Tasks todos | `list`, `add`, `done`, `delete`, `lists` |
| `gcontacts` | Google Contacts | `list`, `search`, `get`, `add`, `delete` |
| `gmeet` | Google Meet video calls | `create`, `schedule`, `list` |
| `slack` | Slack messages & channels | `channels`, `messages`, `send`, `users` |
| `notion` | Notion pages & databases | `search`, `pages`, `databases` |
| `gmail` | Gmail emails | `list`, `read`, `send`, `auth` |
| `gdrive` | Google Drive files | `list`, `search`, `delete`, `auth` |
| `gsheets` | Google Sheets | `list`, `get`, `create`, `set`, `append`, `share` |
| `gdocs` | Google Docs | `list`, `get`, `create`, `append`, `replace`, `export` |
| `gslides` | Google Slides | `list`, `get`, `create`, `add-slide`, `add-text`, `export` |
| `gforms` | Google Forms | `list`, `get`, `create`, `add-question`, `responses` |
| `gkeep` | Google Keep (Workspace only) | `list`, `get`, `add`, `delete` |
| `stocks` | Stock & crypto prices | (default), `info`, `history`, `list` |
| `weather` | Weather forecasts | (default), `--forecast` |
| `currency` | Currency converter | (default), `--list` |
| `qrcode` | QR code generator | (default), `--terminal`, `--output` |
| `shorturl` | URL shortener | (default), `--expand` |
| `arxiv` | Academic papers | `search`, `paper`, `recent` |
| `reddit` | Reddit posts | `hot`, `new`, `top`, `search`, `post` |
| `hn` | Hacker News | `top`, `new`, `best`, `ask`, `show`, `search`, `story` |
| `wiki` | Wikipedia | (default), `search`, `random`, `full` |
| `telegram` | Telegram (user API) | `auth`, `chats`, `read`, `send`, `search`, `contacts`, `download` |
| `plugins` | Plugin management | `list`, `install`, `uninstall`, `available`, `search`, `update` |

## Command Pattern

```
uni <service> <command> [subcommand] [args] [--options]
```

## Output Modes

- **Default**: Human-readable (tables, colors)
- **`--json`**: Machine-readable JSON

---

## Exa Service (Web Search & Research)

### Search the web
```bash
uni exa search "React 19 features"
uni exa search "TypeScript best practices" --num 10
```

### Get code documentation context
```bash
uni exa code "Express.js middleware"
uni exa code "Python pandas groupby" --tokens 10000
```

### Deep research on a topic
```bash
uni exa research "AI agent frameworks 2025"
uni exa research "microservices patterns" --mode deep
```

### Research a company
```bash
uni exa company "Anthropic"
uni exa company "OpenAI" --num 10
```

---

## Google Calendar Service

### List events
```bash
uni gcal list                           # Today's events
uni gcal list --date tomorrow           # Tomorrow's events
uni gcal list --days 7                  # Next 7 days
uni gcal list --date 2025-01-15         # Specific date
```

### Create events
```bash
uni gcal add "Team standup" --time 10am --duration 30m
uni gcal add "Lunch" --time 12:30pm --date tomorrow
uni gcal add "Meeting" --time 2pm --location "Room A"
```

### Next upcoming event
```bash
uni gcal next                           # Next event
uni gcal next --count 3                 # Next 3 events
```

### Update/rename events
```bash
uni gcal update "Meeting" --title "Team Sync"
uni gcal update "Call" --location "Zoom"
uni gcal update "Event" -t "New Name" -l "Room A"
uni gcal update "Meeting" --time 3pm --date tomorrow  # Reschedule
```

### Delete events
```bash
uni gcal delete "Cancelled Meeting"
uni gcal delete "Old Event"
```

---

## Google Tasks Service

### List tasks
```bash
uni gtasks list                         # Default task list
uni gtasks list --completed             # Include completed
uni gtasks list --list Work             # Specific list
```

### Add tasks
```bash
uni gtasks add "Buy groceries"
uni gtasks add "Finish report" --due tomorrow
uni gtasks add "Call mom" --notes "Ask about weekend"
```

### Update tasks
```bash
uni gtasks update "Buy milk" --title "Buy groceries"
uni gtasks update "Report" --due tomorrow
uni gtasks update "Task" --notes "Added details"
```

### Complete/delete tasks
```bash
uni gtasks done "Buy groceries"         # Mark as done
uni gtasks delete "Old task"            # Delete by name
uni gtasks delete 1                     # Delete by index (1-based)
```

### Manage task lists
```bash
uni gtasks lists                        # List all lists
uni gtasks lists add "Work"             # Create new list
uni gtasks lists delete <list-id>       # Delete list
```

---

## Google Contacts Service

### List and search contacts
```bash
uni gcontacts list                      # List contacts
uni gcontacts list --limit 50           # More contacts
uni gcontacts search "John"             # Search by name
uni gcontacts search "john@example.com" # Search by email
```

### Get contact details
```bash
uni gcontacts get "John Doe"            # Full contact info
```

### Add/update/delete contacts
```bash
uni gcontacts add "John Doe" --email john@example.com
uni gcontacts add "Jane" --phone "+91-9876543210" --company "Acme"
uni gcontacts update "John" --email newemail@example.com
uni gcontacts update "Jane" --company "New Corp" --phone "+1-555-1234"
uni gcontacts delete "Old Contact"
```

---

## Google Meet Service

### Create instant meeting
```bash
uni gmeet create                        # Quick meeting link
uni gmeet create --title "Standup"      # Named meeting
uni gmeet create --duration 60          # 60 min meeting
```

### Schedule meeting
```bash
uni gmeet schedule "Team Sync" --date tomorrow --time 10am
uni gmeet schedule "1:1" --time 3pm --invite john@example.com
uni gmeet schedule "Review" --date 2026-01-10 --time 2pm --duration 60
```

### List upcoming meetings
```bash
uni gmeet list                          # Next 7 days
uni gmeet list --days 14                # Next 14 days
```

### Cancel meetings
```bash
uni gmeet delete "Team Sync"            # Cancel by name
uni gmeet cancel "1:1 with John"
```

---

## Slack Service

```bash
uni slack channels list                 # List channels
uni slack channels info general         # Channel info
uni slack messages general              # Read messages
uni slack messages general --limit 20   # Last 20 messages
uni slack send general "Hello team!"    # Send message
uni slack users list                    # List users
uni slack users info @username          # User info
```

---

## Notion Service

```bash
uni notion search "project notes"       # Search pages
uni notion pages <page-id>              # View page content
uni notion databases list               # List databases
uni notion databases query <db-id>      # Query database
```

---

## Gmail Service

```bash
uni gmail list                          # Recent emails
uni gmail list --unread                 # Unread only
uni gmail list --from "boss@company"    # Filter by sender
uni gmail read <id-or-query>            # Read email by ID or search
uni gmail send "to@email.com" --subject "Hi" --body "Hello"
uni gmail delete "Newsletter spam"      # Move to trash
uni gmail delete <id> --permanent       # Permanently delete
uni gmail auth                          # Authenticate
```

---

## Google Drive Service

```bash
uni gdrive list                         # List files
uni gdrive list --folder <id>           # Files in folder
uni gdrive search "report"              # Search files
uni gdrive get <id-or-name>             # View file details
uni gdrive upload ./file.pdf            # Upload file
uni gdrive upload ./doc.txt --name "My Doc"  # Upload with name
uni gdrive download <id-or-name>        # Download file
uni gdrive download "report" -o ./downloads/
uni gdrive share <id> user@email.com    # Share as reader
uni gdrive share <id> user@email.com --role writer
uni gdrive delete <id>                  # Delete file
uni gdrive auth                         # Authenticate
```

---

## Google Sheets Service

### List spreadsheets
```bash
uni gsheets list                        # Recent spreadsheets
uni gsheets list -n 20                  # More results
```

### Get spreadsheet data
```bash
uni gsheets get <id>                    # Spreadsheet info
uni gsheets get <id> --range "A1:C10"   # Specific range
uni gsheets get <id> --sheet "Sheet2"   # Specific sheet
```

### Create and modify
```bash
uni gsheets create "Budget 2025"        # New spreadsheet
uni gsheets set <id> A1 "Hello"         # Set single cell
uni gsheets set <id> A1:B2 "1,2;3,4"    # Set range (rows separated by ;)
uni gsheets append <id> "A:A" "New row" # Append row
```

### Share spreadsheet
```bash
uni gsheets share <id> user@email.com
uni gsheets share <id> user@email.com --role reader
```

---

## Google Docs Service

### List documents
```bash
uni gdocs list                          # Recent documents
uni gdocs list -n 20                    # More results
```

### Get document content
```bash
uni gdocs get <id>                      # Document info
uni gdocs get <id> --text               # Extract plain text
```

### Create and edit
```bash
uni gdocs create "Meeting Notes"        # New document
uni gdocs append <id> "New paragraph"   # Append text
uni gdocs replace <id> "old" "new"      # Find and replace
```

### Export document
```bash
uni gdocs export <id> pdf               # Export as PDF
uni gdocs export <id> docx              # Export as Word
uni gdocs export <id> txt               # Plain text
uni gdocs export <id> md                # Markdown
uni gdocs export <id> pdf -o report.pdf # Custom filename
```

### Share document
```bash
uni gdocs share <id> user@email.com
uni gdocs share <id> user@email.com --role reader
```

---

## Google Slides Service

### List presentations
```bash
uni gslides list                        # Recent presentations
uni gslides list -n 20                  # More results
```

### Get presentation
```bash
uni gslides get <id>                    # Presentation info
uni gslides get <id> --text             # Extract text from slides
```

### Create and edit
```bash
uni gslides create "Q1 Review"          # New presentation
uni gslides add-slide <id>              # Add new slide
uni gslides add-text <id> "Hello"       # Add text to last slide
uni gslides add-text <id> "Title" --slide 1  # Add to specific slide
```

### Export presentation
```bash
uni gslides export <id> pdf             # Export as PDF
uni gslides export <id> pptx            # Export as PowerPoint
uni gslides export <id> pdf -o deck.pdf # Custom filename
```

### Share presentation
```bash
uni gslides share <id> user@email.com
uni gslides share <id> user@email.com --role reader
```

---

## Google Forms Service

### List forms
```bash
uni gforms list                         # Recent forms
uni gforms list -n 20                   # More results
```

### Get form details
```bash
uni gforms get <id>                     # Form info and questions
```

### Create form and add questions
```bash
uni gforms create "Customer Survey"     # New form
uni gforms add-question <id> "Name" text                    # Text question
uni gforms add-question <id> "Comments" paragraph           # Long text
uni gforms add-question <id> "Rating" scale --low 1 --high 5  # Scale 1-5
uni gforms add-question <id> "Color" choice --choices "Red,Blue,Green"
uni gforms add-question <id> "Email" text -r                # Required
```

### View responses
```bash
uni gforms responses <id>               # View all responses
uni gforms responses <id> --json        # JSON format
```

### Share form
```bash
uni gforms share <id> user@email.com
uni gforms share <id> user@email.com --role reader
```

---

## Google Keep Service (Workspace Only)

> **Note:** Google Keep API requires Google Workspace Enterprise/Education Plus account.
> Regular Gmail accounts cannot access the Keep API.

### List notes
```bash
uni gkeep list                          # All notes
uni gkeep list --archived               # Archived notes
uni gkeep list --trashed                # Trashed notes
```

### Get note
```bash
uni gkeep get <id>                      # Note content
```

### Create notes
```bash
uni gkeep add "Remember to call mom"    # Simple note
uni gkeep add "My note" -t "Title"      # With title
uni gkeep add "Milk,Eggs,Bread" -l      # Checklist
uni gkeep add "Items" -l -t "Shopping"  # Checklist with title
```

### Delete note
```bash
uni gkeep delete <id>                   # Move to trash
```

---

## Weather Service (No API key needed)

```bash
uni weather London                      # Current weather
uni weather "New York, US"              # City with country
uni weather Tokyo --forecast 3          # 3-day forecast
uni weather London --units fahrenheit   # Fahrenheit
uni weather 40.7128,-74.0060            # Coordinates
```

---

## Currency Service (No API key needed)

```bash
uni currency 100 usd to eur             # Convert USD to EUR
uni currency 5000 jpy to usd            # JPY to USD
uni currency 1000 eur to usd gbp jpy    # Multiple targets
uni currency --list                     # List all currencies
```

---

## QR Code Service (No API key needed)

```bash
uni qrcode "https://example.com"        # Display in terminal
uni qrcode "Hello" --terminal           # Terminal ASCII art
uni qrcode "https://..." --output qr.png  # Save to file
uni qrcode --wifi "MyNetwork:password"  # WiFi QR code
uni qrcode "text" --size 512            # Custom size
```

---

## URL Shortener Service (No API key needed)

```bash
uni shorturl "https://very-long-url.com/path"  # Shorten
uni shorturl "https://is.gd/xxx" --expand      # Expand short URL
uni short "https://example.com"                # Alias
```

---

## Natural Language Commands (uni ask)

Translate natural language to uni commands:

```bash
uni ask "show my calendar tomorrow"
# → uni gcal list --date tomorrow

uni ask "search for React tutorials"
# → uni exa search "React tutorials"

uni ask "what meetings do I have today"
# → uni gcal list --date today

uni ask -i                              # Interactive mode
uni ask "query" --dry-run               # Show without executing
uni ask "query" --no-confirm            # Execute without asking
```

### LLM Provider Management

```bash
# List all supported LLM providers
uni ask providers

# List models for a provider
uni ask models --provider anthropic
uni ask models --provider openrouter

# Test a provider connection
uni ask test --provider deepseek
uni ask test --provider ollama

# Use specific provider/model
uni ask "query" --provider openrouter --model "anthropic/claude-3.5-sonnet"
uni ask "query" --provider deepseek --model deepseek-chat
```

**Supported Providers:**
- **Tier 1:** Anthropic, OpenAI, Google, DeepSeek, xAI
- **Tier 2:** Zhipu (GLM), Moonshot (Kimi), Minimax, Qwen, Yi
- **Tier 3:** OpenRouter, Together, Fireworks, Groq, Cerebras
- **Tier 4:** Ollama, LM Studio, vLLM, LocalAI

---

## Multi-Command Execution (uni run)

Run multiple commands at once:

```bash
uni run "gcal list" "gtasks list"       # Sequential
uni run -p "cmd1" "cmd2" "cmd3"         # Parallel
uni run --dry-run "cmd1" "cmd2"         # Preview only
```

---

## Saved Flows (uni flow)

Save and run command macros:

```bash
# Create a flow
uni flow add standup "gcal list" "gtasks list"
uni flow add morning "weather London" "gcal next"

# List flows
uni flow list

# Run flows
uni flow run standup
uni flow run prcheck 123                # $1 = 123

# Shorthand (if no service conflict)
uni standup                             # Same as: uni flow run standup
uni prcheck 456                         # Same as: uni flow run prcheck 456

# Remove flow
uni flow remove standup
```

---

## Extensions (uni install)

Install additional services:

```bash
# Install packages
uni install linear                      # → bun add @uni/service-linear
uni install @other/some-plugin          # Direct package name
uni uninstall linear                    # Remove package

# Local plugins (auto-discovered)
~/.uni/plugins/weather.ts               # Single file plugin
~/.uni/plugins/my-tool/index.ts         # Directory plugin
```

---

## Aliases

Create shortcuts for common commands:

```bash
uni alias add inbox "gmail list --unread"
uni alias add today "gcal list --date today"
uni alias list                          # Show all aliases
uni alias remove inbox                  # Remove alias

# Use aliases
uni inbox                               # → uni gmail list --unread
```

---

## History

View and re-run past commands:

```bash
uni history                             # Recent commands
uni history --limit 50                  # More history
uni history --search "gcal"             # Search history
uni history run 42                      # Re-run command #42
uni history clear                       # Clear history
```

---

## Configuration

```bash
uni config show                         # Show all config
uni config get global.color             # Get specific value
uni config set global.color false       # Set value
uni config edit                         # Open in editor
uni config path                         # Show config path
```

Config file: `~/.uni/config.toml`

---

## Global Commands

```bash
uni --help                  # Show help
uni --version               # Show version
uni list                    # List all services
uni doctor                  # Check service health & auth status
uni setup                   # Interactive setup wizard
uni completions zsh         # Generate shell completions
```

---

## Health Check & Setup

```bash
# Check status of all services and LLM providers
uni doctor
uni doctor --json           # JSON output

# Interactive setup wizard
uni setup                   # Choose mode: easy, self-host, or import

# Easy mode (use default credentials)
uni setup gcal              # Shows how to authenticate
uni setup google            # Same for gcal/gmail/gdrive

# Self-host mode (create your own credentials)
uni setup gcal --self-host  # Guided wizard with exact steps
uni setup google --self-host
uni setup slack --self-host
uni setup notion --self-host

# Import shared credentials
uni setup --from https://example.com/creds.json
uni setup --from ./team-creds.json
uni setup --from gist:abc123

# Auth logout
uni gcal auth --logout      # Remove saved token
uni gmail auth --logout
uni gdrive auth --logout
```

---

## Stocks Service (Yahoo Finance)

Real-time stock and crypto prices. No API key needed.

### Get quote
```bash
uni stocks aapl                    # Apple stock
uni stocks tsla                    # Tesla stock
uni stocks btc-usd                 # Bitcoin
uni stocks eth-usd                 # Ethereum
```

### Detailed info
```bash
uni stocks info aapl               # Company info, P/E, market cap
uni stocks info msft
```

### Price history
```bash
uni stocks history aapl            # 1 month history
uni stocks history btc-usd -p 1w   # 1 week
uni stocks history tsla -p 1y      # 1 year
```

### List popular symbols
```bash
uni stocks list                    # Top stocks
uni stocks list crypto             # Top crypto
uni stocks list indices            # Major indices
```

---

## Research Services

Free APIs, no auth required. Perfect for AI agents doing research.

### arXiv (Academic Papers)
```bash
uni arxiv search "transformer attention"   # Search papers
uni arxiv search "machine learning" -n 5   # Limit results
uni arxiv paper 2401.12345                 # Get paper details
uni arxiv recent cs.AI                     # Recent in category
uni arxiv recent --list                    # List categories
```

### Reddit
```bash
uni reddit hot programming                  # Hot posts from subreddit
uni reddit new askscience                   # New posts
uni reddit top rust --time week             # Top posts (hour/day/week/month/year/all)
uni reddit search "ai agents"               # Search across Reddit
uni reddit search "typescript" -r programming  # Search in subreddit
uni reddit post <id>                        # Get post with comments
```

### Hacker News
```bash
uni hn top                                  # Top stories
uni hn new                                  # New stories
uni hn best                                 # Best stories
uni hn ask                                  # Ask HN posts
uni hn show                                 # Show HN posts
uni hn search "rust programming"            # Search via Algolia
uni hn story <id>                           # Get story with comments
```

### Wikipedia
```bash
uni wiki "Alan Turing"                      # Article summary
uni wiki search "quantum computing"         # Search articles
uni wiki random                             # Random article
uni wiki full "Rust (programming language)" # Full article content
```

---

## Telegram Service

User API via MTProto - full account access (not bot).

### Setup
```bash
# Get API credentials from https://my.telegram.org
# Then authenticate with phone + OTP:
uni telegram auth --api-id 12345 --api-hash abcdef...
```

### Chats
```bash
uni telegram chats                          # List all chats
uni telegram chats -n 50                    # More results
uni telegram chats --archived               # Archived chats
```

### Messages
```bash
uni telegram read @username                 # Read messages
uni telegram read "Family Group" -n 50      # Read from group
uni telegram send @username "Hello!"        # Send message
uni telegram send +1234567890 "Hi"          # Send to phone
```

### Search & Contacts
```bash
uni telegram search "meeting"               # Search all chats
uni telegram search "project" -c @user      # Search in chat
uni telegram contacts                       # List contacts
uni telegram contacts "john"                # Search contacts
```

### Media
```bash
uni telegram download @username 12345       # Download media
uni telegram download "Group" 67890 -o ./   # Specify output
```

---

## Plugin Management

Extend uni-cli with plugins. Plugins are installed globally to `~/.uni/plugins/`.

### List & discover
```bash
uni plugins                        # List installed plugins
uni plugins list                   # Same as above
uni plugins available              # Show official plugins
uni plugins search google          # Search npm for plugins
```

### Install & uninstall
```bash
uni plugins install gkeep          # Install from official registry
uni plugins install github:user/repo  # Install from GitHub
uni plugins uninstall gkeep        # Remove a plugin
```

### Update
```bash
uni plugins update                 # Update all plugins
uni plugins update gkeep           # Update specific plugin
```

### Development
```bash
uni plugins link ./my-plugin       # Link local plugin (must have dist/index.js)
```

---

## When to Use What

| Need | Command |
|------|---------|
| Stock price | `uni stocks aapl` |
| Crypto price | `uni stocks btc-usd` |
| Current info/news | `uni exa search "topic"` |
| Code/library docs | `uni exa code "library feature"` |
| In-depth research | `uni exa research "topic" --mode deep` |
| Today's calendar | `uni gcal list` |
| My tasks | `uni gtasks list` |
| Schedule meeting | `uni gcal add "Title" --time 2pm` |
| Slack message | `uni slack send channel "message"` |
| Search Notion | `uni notion search "query"` |
| Check email | `uni gmail list --unread` |
| Weather forecast | `uni weather London` |
| Convert currency | `uni currency 100 usd to eur` |
| Generate QR code | `uni qrcode "https://..."` |
| Shorten URL | `uni shorturl "https://..."` |
| Edit spreadsheet | `uni gsheets set <id> A1 "value"` |
| Export document | `uni gdocs export <id> pdf` |
| Create presentation | `uni gslides create "Title"` |
| Create survey | `uni gforms create "Survey"` |
| Quick note | `uni gkeep add "Note"` (Workspace) |
| Academic papers | `uni arxiv search "topic"` |
| Reddit discussions | `uni reddit hot programming` |
| Hacker News | `uni hn top` |
| Wikipedia lookup | `uni wiki "Topic"` |
| Telegram messages | `uni telegram read @user` |
| Natural language | `uni ask "your request"` |
| Multiple commands | `uni run "cmd1" "cmd2"` |
| Saved workflow | `uni flow run myflow` |

---

## Error Handling

- Commands return exit code 0 on success, 1 on failure
- Use `--json` for structured error output
- Use `--verbose` for detailed error messages

## See Also

- [REFERENCE.md](REFERENCE.md) - Complete command reference
- [PATTERNS.md](PATTERNS.md) - Common workflow patterns
