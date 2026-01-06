# uni CLI Reference

> Auto-generated from command definitions

## Global Options

| Option | Short | Description |
|--------|-------|-------------|
| `--help` | `-h` | Show help |
| `--version` | `-v` | Show version |
| `--json` | | Output as JSON |
| `--verbose` | | Verbose output |
| `--quiet` | `-q` | Suppress output |
| `--config` | `-c` | Custom config path |

## Built-in Commands

| Command | Description |
|---------|-------------|
| `uni list` | List available services |
| `uni doctor` | Check service health & configuration |
| `uni setup` | Interactive setup wizard |
| `uni ask <query>` | Natural language commands |
| `uni run "cmd1" "cmd2"` | Run multiple commands |
| `uni flow` | Manage saved command macros |
| `uni install <name>` | Install a service package |
| `uni uninstall <name>` | Uninstall a service package |
| `uni auth` | Manage authentication |
| `uni config` | Manage configuration |
| `uni alias` | Manage command aliases |
| `uni history` | View command history |
| `uni completions <shell>` | Generate shell completions (zsh/bash/fish) |

---

## uni doctor

Health check - shows the status of all services, credentials, and LLM providers.

### Usage

```bash
uni doctor
uni doctor --json
```

### Output

Shows:
- Service status (ready, not authenticated, missing credentials)
- LLM provider availability (ollama, anthropic, openai, groq)
- Credential sources (config, env, default)

---

## uni setup

Interactive setup wizard for configuring services.

### Usage

```bash
uni setup                         # Interactive wizard
uni setup <service>               # Easy mode for specific service
uni setup <service> --self-host   # Self-host wizard
uni setup --from <source>         # Import shared credentials
```

### Options

| Option | Description |
|--------|-------------|
| `--self-host` | Run guided self-host wizard |
| `--from` | Import credentials from URL/file/gist |

### Services

| Service | What it configures |
|---------|-------------------|
| `google` | gcal, gmail, gdrive (shared OAuth) |
| `gcal` | Google Calendar (same as google) |
| `gmail` | Gmail (same as google) |
| `gdrive` | Google Drive (same as google) |
| `slack` | Slack bot token |
| `notion` | Notion integration token |

### Examples

```bash
# Interactive mode
uni setup

# Easy mode (use default credentials)
uni setup gcal

# Self-host (create your own credentials)
uni setup google --self-host
uni setup slack --self-host
uni setup notion --self-host

# Import shared credentials
uni setup --from https://example.com/creds.json
uni setup --from ./team-creds.json
uni setup --from gist:abc123
```

---

## uni ask

Natural language interface - translate plain English to uni commands.

### Usage

```bash
uni ask "show my calendar tomorrow"
# → uni gcal list --date tomorrow

uni ask "what tasks do I have"
# → uni gtasks list
```

### Options

| Option | Short | Description |
|--------|-------|-------------|
| `--dry-run` | `-n` | Show command without executing |
| `--no-confirm` | | Execute without asking |
| `--provider` | | Override LLM provider |
| `--interactive` | `-i` | Interactive mode (REPL) |

### Examples

```bash
uni ask "search for React tutorials"
uni ask "send hello to slack general"
uni ask "what's on my calendar this week"
uni ask -i                              # Interactive mode
uni ask "create a PR" --dry-run         # Preview only
```

---

## uni run

Run multiple commands sequentially or in parallel.

### Usage

```bash
uni run "cmd1" "cmd2" "cmd3"
```

### Options

| Option | Short | Description |
|--------|-------|-------------|
| `--parallel` | `-p` | Run commands in parallel |
| `--dry-run` | `-n` | Show commands without executing |
| `--json` | | Output results as JSON |

### Examples

```bash
uni run "gcal list" "gtasks list"
uni run -p "gmail list" "gcal list" "exa search 'news'"
uni run --dry-run "gcal add 'Meeting'" "slack send general 'Meeting scheduled'"
```

---

## uni flow

Manage saved command macros (flows).

### `uni flow list`

List all saved flows.

```bash
uni flow list
```

### `uni flow add <name> <commands...>`

Create a new flow.

```bash
uni flow add standup "gcal list" "gtasks list"
uni flow add morning "weather London" "gcal next"
```

### `uni flow remove <name>`

Remove a flow.

```bash
uni flow remove standup
```

### `uni flow run <name> [args...]`

Run a saved flow.

```bash
uni flow run standup
uni flow run prcheck 123    # $1 = 123
```

### Shorthand

Flows can be run directly if no service name conflict:

```bash
uni standup                 # Same as: uni flow run standup
uni prcheck 456             # Same as: uni flow run prcheck 456
```

---

## uni install

Install a service package. Convenience wrapper around `bun add`.

### Usage

```bash
uni install <name>
```

### Resolution Order

1. Tries `@uni/service-<name>` (official)
2. Tries `uni-service-<name>` (community)
3. Shows error if not found

### Examples

```bash
uni install linear              # → bun add @uni/service-linear
uni install @other/some-plugin  # → bun add @other/some-plugin
uni install uni-service-weather # → bun add uni-service-weather
```

---

## uni uninstall

Uninstall a service package. Convenience wrapper around `bun remove`.

### Usage

```bash
uni uninstall <name>
```

### Examples

```bash
uni uninstall linear            # → bun remove @uni/service-linear
uni uninstall @other/plugin     # → bun remove @other/plugin
```

---

## uni alias

Manage command aliases.

### `uni alias list`

List all aliases.

### `uni alias add <name> <command>`

Create an alias.

```bash
uni alias add inbox "gmail list --unread"
uni alias add today "gcal list --date today"
```

### `uni alias remove <name>`

Remove an alias.

```bash
uni alias remove inbox
```

### Usage

```bash
uni inbox                       # → uni gmail list --unread
```

---

## uni history

View and manage command history.

### `uni history`

Show recent commands.

### Options

| Option | Short | Description |
|--------|-------|-------------|
| `--limit` | `-l` | Number of entries to show |
| `--search` | `-s` | Search history |

### `uni history run <id>`

Re-run a command from history.

### `uni history clear`

Clear command history.

### Examples

```bash
uni history
uni history --limit 50
uni history --search "gcal"
uni history run 42
uni history clear
```

---

## uni config

Manage configuration.

### `uni config show`

Show all configuration.

### `uni config get <key>`

Get a specific config value.

```bash
uni config get global.color
```

### `uni config set <key> <value>`

Set a config value.

```bash
uni config set global.color false
uni config set ask.provider anthropic
```

### `uni config edit`

Open config file in editor.

### `uni config path`

Show config file path.

---

## uni gdrive

Google Drive - files and search

### `uni gdrive list`

List files in Drive

**Aliases:** `ls`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -l | number | `20` | Maximum files |
| `--folder` | -f | string |  | Folder ID to list |
| `--all` | -a | boolean | `false` | Include shared files (default: owned only) |

**Examples:**

```bash
uni gdrive list
uni gdrive list --limit 50
uni gdrive list --all
```

---

### `uni gdrive search`

Search files

**Aliases:** `s`, `find`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | Yes | Search query |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -l | number | `20` | Maximum results |

**Examples:**

```bash
uni gdrive search "meeting notes"
uni gdrive search "project" --limit 50
```

---

### `uni gdrive get`

Get file details

**Aliases:** `info`, `view`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `file` | Yes | File ID or search query |

**Examples:**

```bash
uni gdrive get 1abc123def
uni gdrive get "report.pdf"
```

---

### `uni gdrive upload`

Upload a file to Google Drive

**Aliases:** `up`, `put`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `file` | Yes | Local file path to upload |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--name` | -n | string |  | Name in Drive (defaults to filename) |
| `--folder` | -f | string |  | Destination folder ID |

**Examples:**

```bash
uni gdrive upload ./report.pdf
uni gdrive upload ./photo.jpg --name "Vacation Photo"
uni gdrive upload ./data.csv --folder 1abc123
```

---

### `uni gdrive download`

Download a file from Google Drive

**Aliases:** `down`, `get`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `file` | Yes | File ID or search query |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--output` | -o | string |  | Output path (defaults to current dir) |

**Examples:**

```bash
uni gdrive download 1abc123def
uni gdrive download "report.pdf"
uni gdrive download 1abc123 --output ./downloads/
```

---

### `uni gdrive share`

Share a file with someone

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `file` | Yes | File ID or search query |
| `email` | Yes | Email address to share with |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--role` | -r | string | `reader` | Permission role: reader, writer, commenter |

**Examples:**

```bash
uni gdrive share 1abc123 user@example.com
uni gdrive share "report.pdf" team@company.com --role writer
```

---

### `uni gdrive delete`

Delete files from Drive

**Aliases:** `rm`, `remove`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | Yes | File name or search query |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--id` |  | string |  | Delete by file ID directly |

**Examples:**

```bash
uni gdrive delete "old document"
uni gdrive delete --id 1abc123xyz
```

---

### `uni gdrive auth`

Authenticate with Google Drive

**Aliases:** `login`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--status` | -s | boolean | `false` | Check authentication status |
| `--logout` |  | boolean | `false` | Remove authentication token |

**Examples:**

```bash
uni gdrive auth
uni gdrive auth --status
uni gdrive auth --logout
```

---

## uni stocks

Real-time stock & crypto prices (Yahoo Finance)

### `uni stocks `

Get stock/crypto price

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `symbol` | Yes | Stock/crypto symbol (e.g., AAPL, BTC-USD) |

**Examples:**

```bash
uni stocks aapl
uni stocks tsla
uni stocks btc-usd
uni stocks eth-usd
```

---

### `uni stocks info`

Get detailed stock/crypto info

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `symbol` | Yes | Stock/crypto symbol |

**Examples:**

```bash
uni stocks info aapl
uni stocks info msft
```

---

### `uni stocks history`

Get price history

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `symbol` | Yes | Stock/crypto symbol |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--period` | -p | string | `1mo` | Time period (1d, 5d, 1w, 1mo, 3mo, 6mo, 1y, 5y) |

**Examples:**

```bash
uni stocks history aapl
uni stocks history btc-usd --period 1w
uni stocks history tsla -p 1y
```

---

### `uni stocks list`

List popular symbols with prices

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `type` | No | Type: stocks, crypto, or indices (default: stocks) |

**Examples:**

```bash
uni stocks list
uni stocks list crypto
uni stocks list indices
```

---

## uni linear

Linear - issues, projects, and teams

### `uni linear auth`

Authenticate with Linear

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--status` | -s | boolean |  | Check auth status |
| `--logout` |  | boolean |  | Clear authentication |

**Examples:**

```bash
uni linear auth
uni linear auth --status
uni linear auth --logout
```

---

### `uni linear issues`

Manage Linear issues

**Aliases:** `issue`, `i`

**Subcommands:**

#### `uni linear issues list`

List issues

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--team` | -t | string | Filter by team key (e.g., ENG) |
| `--filter` | -f | string | Filter: open, closed, all (default: open) |
| `--limit` | -n | number | Max results (default: 20) |

```bash
uni linear issues list
uni linear issues list --team ENG
uni linear issues list --filter closed -n 10
```

#### `uni linear issues get`

Get issue details

| Argument | Required | Description |
|----------|----------|-------------|
| `identifier` | Yes | Issue identifier (e.g., ENG-123) |

```bash
uni linear issues get ENG-123
```

#### `uni linear issues create`

Create a new issue

| Argument | Required | Description |
|----------|----------|-------------|
| `title` | Yes | Issue title |

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--team` | -t | string | Team key (required) |
| `--description` | -d | string | Issue description |
| `--priority` | -p | number | Priority: 1=Urgent, 2=High, 3=Medium, 4=Low |

```bash
uni linear issues create "Fix login bug" --team ENG
uni linear issues create "Add dark mode" -t ENG -p 2 -d "Users want dark mode"
```

#### `uni linear issues update`

Update an issue

| Argument | Required | Description |
|----------|----------|-------------|
| `identifier` | Yes | Issue identifier |

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--title` | -t | string | New title |
| `--description` | -d | string | New description |
| `--priority` | -p | number | New priority |
| `--status` | -s | string | New status (state name) |

```bash
uni linear issues update ENG-123 --title "Updated title"
uni linear issues update ENG-123 --priority 1
```

#### `uni linear issues close`

Close an issue (mark as Done)

| Argument | Required | Description |
|----------|----------|-------------|
| `identifier` | Yes | Issue identifier |

```bash
uni linear issues close ENG-123
```

#### `uni linear issues search`

Search issues

| Argument | Required | Description |
|----------|----------|-------------|
| `query` | Yes | Search query |

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--limit` | -n | number | Max results |

```bash
uni linear issues search "login bug"
```

---

### `uni linear projects`

List projects

**Aliases:** `project`, `p`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | number | `20` | Max results (default: 20) |

**Examples:**

```bash
uni linear projects
uni linear projects -n 10
```

---

### `uni linear teams`

List teams

**Aliases:** `team`, `t`

**Examples:**

```bash
uni linear teams
```

---

### `uni linear comments`

Manage issue comments

**Aliases:** `comment`, `c`

**Subcommands:**

#### `uni linear comments list`

List comments on an issue

| Argument | Required | Description |
|----------|----------|-------------|
| `identifier` | Yes | Issue identifier (e.g., ENG-123) |

```bash
uni linear comments list ENG-123
```

#### `uni linear comments add`

Add a comment to an issue

| Argument | Required | Description |
|----------|----------|-------------|
| `identifier` | Yes | Issue identifier (e.g., ENG-123) |
| `body` | Yes | Comment text |

```bash
uni linear comments add ENG-123 "This is fixed now"
uni linear comments add ENG-123 "Needs more investigation"
```

---

## uni exa

Web search, code context, and research powered by Exa AI

### `uni exa search`

Search the web for information

**Aliases:** `s`, `find`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | Yes | Search query |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--num` | -n | number | `5` | Number of results |
| `--api` |  | boolean | `false` | Use direct API instead of MCP (requires EXA_API_KEY) |

**Examples:**

```bash
uni exa search "React 19 server components"
uni exa search "TypeScript 5.0 features" --num 10
uni exa search "AI news" --api
```

---

### `uni exa code`

Get code context and documentation

**Aliases:** `docs`, `context`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | Yes | Code/documentation query |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--tokens` | -t | number | `5000` | Max tokens to return |
| `--api` |  | boolean | `false` | Use direct API instead of MCP (requires EXA_API_KEY) |

**Examples:**

```bash
uni exa code "Express.js middleware authentication"
uni exa code "Python pandas groupby aggregate"
uni exa code "React useEffect cleanup" --tokens 10000
```

---

### `uni exa research`

Perform research on a topic

**Aliases:** `r`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | Yes | Research topic or question |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--mode` | -m | string | `quick` | Research mode: quick or deep |
| `--num` | -n | number | `8` | Number of sources for quick mode |
| `--api` |  | boolean | `false` | Use direct API instead of MCP (requires EXA_API_KEY) |

**Examples:**

```bash
uni exa research "AI agent frameworks comparison 2025"
uni exa research "best practices microservices" --mode deep
uni exa research "React vs Vue 2025" --num 15
```

---

### `uni exa company`

Research a company

**Aliases:** `co`, `org`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `name` | Yes | Company name |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--num` | -n | number | `5` | Number of results |
| `--api` |  | boolean | `false` | Use direct API instead of MCP (requires EXA_API_KEY) |

**Examples:**

```bash
uni exa company "Anthropic"
uni exa company "OpenAI" --num 10
uni exa company "Stripe"
```

---

## uni gslides

Google Slides - presentations

### `uni gslides list`

List recent presentations

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | string |  | Number of presentations to show (default: 10) |

**Examples:**

```bash
uni gslides list
uni gslides list -n 20
```

---

### `uni gslides get`

Get presentation details

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Presentation ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--text` | -t | boolean |  | Extract text from slides |

**Examples:**

```bash
uni gslides get <presentation-id>
uni gslides get <presentation-id> --text
uni gslides get https://docs.google.com/presentation/d/xxx/edit
```

---

### `uni gslides create`

Create a new presentation

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `title` | Yes | Presentation title |

**Examples:**

```bash
uni gslides create "Q1 Review"
uni gslides create "Product Launch"
```

---

### `uni gslides add-slide`

Add a new slide to presentation

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Presentation ID or URL |

**Examples:**

```bash
uni gslides add-slide <presentation-id>
```

---

### `uni gslides add-text`

Add text to a slide

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Presentation ID or URL |
| `text` | Yes | Text to add |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--slide` | -s | string |  | Slide number (default: last slide) |

**Examples:**

```bash
uni gslides add-text <id> "Hello World"
uni gslides add-text <id> "Title" --slide 1
```

---

### `uni gslides share`

Share a presentation with someone

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Presentation ID or URL |
| `email` | Yes | Email address to share with |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--role` | -r | string |  | Permission role: reader or writer (default: writer) |

**Examples:**

```bash
uni gslides share <id> colleague@example.com
uni gslides share <id> viewer@example.com --role reader
```

---

### `uni gslides export`

Export presentation to PDF, PPTX, or other formats

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Presentation ID or URL |
| `format` | Yes | Export format: pdf, pptx, odp, txt |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--output` | -o | string |  | Output file path |

**Examples:**

```bash
uni gslides export <id> pdf
uni gslides export <id> pptx -o presentation.pptx
```

---

### `uni gslides auth`

Authenticate with Google Slides

**Aliases:** `login`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--status` | -s | boolean | `false` | Check authentication status |
| `--logout` |  | boolean | `false` | Remove authentication token |

**Examples:**

```bash
uni gslides auth
uni gslides auth --status
uni gslides auth --logout
```

---

## uni gcontacts

Google Contacts - manage contacts

### `uni gcontacts list`

List contacts

**Aliases:** `ls`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -l | number | `20` | Max contacts |

**Examples:**

```bash
uni gcontacts list
uni gcontacts list --limit 50
```

---

### `uni gcontacts search`

Search contacts

**Aliases:** `s`, `find`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | Yes | Search query (name, email, phone) |

**Examples:**

```bash
uni gcontacts search "John"
uni gcontacts search "john@example.com"
uni gcontacts search "+91"
```

---

### `uni gcontacts get`

Get contact details

**Aliases:** `view`, `show`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | Yes | Contact name or email |

**Examples:**

```bash
uni gcontacts get "John Doe"
uni gcontacts get "john@example.com"
```

---

### `uni gcontacts add`

Add a new contact

**Aliases:** `new`, `create`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `name` | Yes | Contact name |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--email` | -e | string |  | Email address |
| `--phone` | -p | string |  | Phone number |
| `--company` | -c | string |  | Company name |

**Examples:**

```bash
uni gcontacts add "John Doe" --email john@example.com
uni gcontacts add "Jane" --phone "+91-9876543210" --company "Acme Inc"
```

---

### `uni gcontacts update`

Update a contact

**Aliases:** `edit`, `modify`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `search` | Yes | Contact name to search for |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--name` | -n | string |  | New name |
| `--email` | -e | string |  | New email |
| `--phone` | -p | string |  | New phone |
| `--company` | -c | string |  | New company |

**Examples:**

```bash
uni gcontacts update "John Doe" --email john.new@example.com
uni gcontacts update "Jane" --phone "+1-555-1234"
uni gcontacts update "Bob" --company "New Corp" --name "Robert Smith"
```

---

### `uni gcontacts delete`

Delete a contact

**Aliases:** `rm`, `remove`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | Yes | Contact name or email |

**Examples:**

```bash
uni gcontacts delete "John Doe"
uni gcontacts delete "old@email.com"
```

---

### `uni gcontacts auth`

Authenticate with Google Contacts

**Aliases:** `login`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--status` | -s | boolean | `false` | Check authentication status |
| `--logout` |  | boolean | `false` | Remove authentication token |

**Examples:**

```bash
uni gcontacts auth
uni gcontacts auth --status
uni gcontacts auth --logout
```

---

## uni gmail

Gmail - read, send, and search emails

### `uni gmail list`

List emails

**Aliases:** `ls`, `inbox`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -l | number | `10` | Number of emails |
| `--query` | -q | string |  | Search query (Gmail search syntax) |
| `--unread` | -u | boolean | `false` | Only unread emails |
| `--all` | -a | boolean | `false` | Show all emails (including promotions, social) |

**Examples:**

```bash
uni gmail list
uni gmail list --limit 20
uni gmail list --query "from:github.com"
uni gmail list --unread
uni gmail list --all
```

---

### `uni gmail read`

Read an email by ID or search query

**Aliases:** `view`, `show`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | Yes | Email ID or search query (subject, sender, etc.) |

**Examples:**

```bash
uni gmail read 19b637d54e3f3c51
uni gmail read "Your Booking is Ticketed"
uni gmail read "from:amazon order"
```

---

### `uni gmail search`

Search emails (full-text search in subject, body, sender)

**Aliases:** `find`, `query`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | Yes | Search term (searches everywhere: subject, body, sender) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | number | `10` | Max results (default: 10) |
| `--all` | -a | boolean | `false` | Include promotions, social, updates |

**Examples:**

```bash
uni gmail search "flight booking"
uni gmail search "indigo PNR"
uni gmail search "invoice" -n 20
uni gmail search "amazon order" --all
```

---

### `uni gmail send`

Send an email

**Aliases:** `compose`, `new`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--to` | -t | string |  | Recipient email |
| `--subject` | -s | string |  | Email subject |
| `--body` | -b | string |  | Email body |
| `--attach` | -a | string |  | File path to attach (can use multiple times) |

**Examples:**

```bash
uni gmail send --to user@example.com --subject "Hello" --body "Message"
uni gmail send -t me@example.com -s "Report" -b "See attached" --attach report.pdf
uni gmail send -t user@example.com -s "Photos" -b "Here are the photos" -a photo1.jpg -a photo2.jpg
```

---

### `uni gmail delete`

Delete an email (moves to trash)

**Aliases:** `trash`, `rm`, `remove`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | Yes | Email ID or search query |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--permanent` | -p | boolean | `false` | Permanently delete (skip trash) |

**Examples:**

```bash
uni gmail delete 19b637d54e3f3c51
uni gmail delete "Newsletter from spam"
uni gmail delete "old email" --permanent
```

---

### `uni gmail auth`

Authenticate with Google Gmail

**Aliases:** `login`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--status` | -s | boolean | `false` | Check authentication status |
| `--logout` |  | boolean | `false` | Remove authentication token |

**Examples:**

```bash
uni gmail auth
uni gmail auth --status
uni gmail auth --logout
```

---

## uni reddit

Reddit posts and search (free)

### `uni reddit hot`

Get hot posts from a subreddit

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `subreddit` | Yes | Subreddit name (without r/) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | number | `10` | Max results (default: 10) |

**Examples:**

```bash
uni reddit hot programming
uni reddit hot rust -n 5
```

---

### `uni reddit new`

Get new posts from a subreddit

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `subreddit` | Yes | Subreddit name (without r/) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | number | `10` | Max results (default: 10) |

**Examples:**

```bash
uni reddit new programming
uni reddit new askscience -n 5
```

---

### `uni reddit top`

Get top posts from a subreddit

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `subreddit` | Yes | Subreddit name (without r/) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--time` | -t | string | `day` | Time period: hour, day, week, month, year, all |
| `--limit` | -n | number | `10` | Max results (default: 10) |

**Examples:**

```bash
uni reddit top programming
uni reddit top rust --time week
uni reddit top typescript -t month -n 5
```

---

### `uni reddit search`

Search Reddit posts

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | Yes | Search query |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--subreddit` | -r | string |  | Limit to subreddit |
| `--sort` | -s | string | `relevance` | Sort: relevance, hot, top, new |
| `--limit` | -n | number | `10` | Max results (default: 10) |

**Examples:**

```bash
uni reddit search "ai agents"
uni reddit search "typescript tips" -r programming
uni reddit search "rust vs go" --sort top -n 5
```

---

### `uni reddit post`

Get a post with comments

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Post ID (from URL) |

**Examples:**

```bash
uni reddit post 1abc2de
```

---

## uni gmeet

Google Meet - video meetings

### `uni gmeet create`

Create an instant meeting link

**Aliases:** `new`, `now`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--title` | -t | string | `Quick Meeting` | Meeting title |
| `--duration` | -d | number | `30` | Duration in minutes |

**Examples:**

```bash
uni gmeet create
uni gmeet create --title "Standup"
uni gmeet create --title "Interview" --duration 60
```

---

### `uni gmeet schedule`

Schedule a meeting for later

**Aliases:** `plan`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `title` | Yes | Meeting title |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--date` | -d | string | `today` | Date (today, tomorrow, YYYY-MM-DD) |
| `--time` | -t | string |  | Time (e.g., 2pm, 14:00) |
| `--duration` |  | number | `30` | Duration in minutes |
| `--invite` | -i | string |  | Comma-separated emails to invite |

**Examples:**

```bash
uni gmeet schedule "Team Sync" --date tomorrow --time 10am
uni gmeet schedule "1:1" --time 3pm --invite john@example.com
uni gmeet schedule "Review" --date 2026-01-10 --time 2pm --duration 60
```

---

### `uni gmeet list`

List upcoming meetings with Meet links

**Aliases:** `ls`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--days` | -d | number | `7` | Days to look ahead |

**Examples:**

```bash
uni gmeet list
uni gmeet list --days 14
```

---

### `uni gmeet delete`

Cancel/delete a scheduled meeting

**Aliases:** `cancel`, `remove`, `rm`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `search` | Yes | Meeting name to search for |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--days` | -d | number | `14` | Days to search ahead |

**Examples:**

```bash
uni gmeet delete "Team Sync"
uni gmeet cancel "1:1 with John"
```

---

### `uni gmeet auth`

Authenticate with Google Meet

**Aliases:** `login`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--status` | -s | boolean | `false` | Check authentication status |
| `--logout` |  | boolean | `false` | Remove authentication token |

**Examples:**

```bash
uni gmeet auth
uni gmeet auth --status
uni gmeet auth --logout
```

---

## uni gtasks

Google Tasks - manage todos

### `uni gtasks list`

List tasks

**Aliases:** `ls`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--list` | -l | string | `@default` | Task list ID (default: @default) |
| `--completed` | -c | boolean | `false` | Include completed tasks |
| `--limit` |  | number | `20` | Max tasks |

**Examples:**

```bash
uni gtasks list
uni gtasks list --completed
uni gtasks list --list Work
```

---

### `uni gtasks add`

Add a new task

**Aliases:** `new`, `create`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `title` | Yes | Task title |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--list` | -l | string | `@default` | Task list ID |
| `--notes` | -n | string |  | Task notes/description |
| `--due` | -d | string |  | Due date (today, tomorrow, YYYY-MM-DD) |

**Examples:**

```bash
uni gtasks add "Buy groceries"
uni gtasks add "Finish report" --due tomorrow
uni gtasks add "Call mom" --notes "Ask about weekend"
```

---

### `uni gtasks update`

Update a task

**Aliases:** `edit`, `modify`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `search` | Yes | Task title to search for |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--title` | -t | string |  | New title |
| `--notes` | -n | string |  | New notes |
| `--due` | -d | string |  | New due date (today, tomorrow, YYYY-MM-DD) |
| `--list` | -l | string |  | Task list name |

**Examples:**

```bash
uni gtasks update "Buy milk" --title "Buy groceries"
uni gtasks update "Review PR" --due tomorrow
uni gtasks update "Call client" --notes "Ask about budget"
```

---

### `uni gtasks done`

Mark task as completed

**Aliases:** `complete`, `check`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `title` | Yes | Task title or ID |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--list` | -l | string | `@default` | Task list ID |

**Examples:**

```bash
uni gtasks done "Buy groceries"
uni gtasks done abc123
```

---

### `uni gtasks undone`

Mark task as not completed

**Aliases:** `uncomplete`, `uncheck`, `reopen`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `title` | Yes | Task title or ID |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--list` | -l | string | `@default` | Task list ID |

**Examples:**

```bash
uni gtasks undone "Buy groceries"
uni gtasks undone abc123
```

---

### `uni gtasks delete`

Delete a task

**Aliases:** `rm`, `remove`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | Yes | Task title, ID, or index (1-based) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--list` | -l | string | `@default` | Task list ID |

**Examples:**

```bash
uni gtasks delete "Old task"
uni gtasks delete 1
```

---

### `uni gtasks lists`

Manage task lists

**Examples:**

```bash
uni gtasks lists
uni gtasks lists add "Work"
uni gtasks lists delete <list-id>
```

**Subcommands:**

#### `uni gtasks lists list`

List all task lists

#### `uni gtasks lists add`

Create a new task list

| Argument | Required | Description |
|----------|----------|-------------|
| `name` | Yes | List name |

#### `uni gtasks lists delete`

Delete a task list

| Argument | Required | Description |
|----------|----------|-------------|
| `id` | Yes | List ID |

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--force` | -f | boolean | Skip confirmation |

---

### `uni gtasks auth`

Authenticate with Google Tasks

**Aliases:** `login`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--status` | -s | boolean | `false` | Check authentication status |
| `--logout` |  | boolean | `false` | Remove authentication token |

**Examples:**

```bash
uni gtasks auth
uni gtasks auth --status
uni gtasks auth --logout
```

---

## uni qrcode

QR code generator

### `uni qrcode `

Generate QR codes

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `content` | No | Text, URL, or data to encode |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--output` | -o | string |  | Output file path (PNG) |
| `--size` | -s | number | `256` | QR code size in pixels (default: 256) |
| `--foreground` |  | string | `#000000` | Foreground color (hex, default: #000000) |
| `--background` |  | string | `#ffffff` | Background color (hex, default: #ffffff) |
| `--terminal` | -t | boolean |  | Display in terminal (ASCII art) |
| `--wifi` | -w | string |  | Generate WiFi QR: "SSID:password" |

**Examples:**

```bash
uni qrcode "https://example.com"
uni qrcode "Hello World" --terminal
uni qrcode "https://example.com" --output qr.png
uni qrcode "https://example.com" --size 512
uni qrcode --wifi "MyNetwork:password123"
```

---

## uni notion

Notion - pages, databases, and search

### `uni notion search`

Search pages and databases

**Aliases:** `s`, `find`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | Yes | Search query |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--type` | -t | string |  | Filter by type: page, database |
| `--limit` | -l | number | `10` | Maximum results |

**Examples:**

```bash
uni notion search "meeting notes"
uni notion search "projects" --type database
```

---

### `uni notion pages`

Manage pages

**Aliases:** `page`, `p`

**Examples:**

```bash
uni notion pages view abc123
```

**Subcommands:**

#### `uni notion pages view`

View a page

| Argument | Required | Description |
|----------|----------|-------------|
| `page` | Yes | Page ID or URL |

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--content` | -c | boolean | Include page content |

```bash
uni notion pages view abc123
uni notion pages view abc123 --content
```

---

### `uni notion databases`

Manage databases

**Aliases:** `db`, `dbs`

**Examples:**

```bash
uni notion databases list
uni notion databases query abc123
```

**Subcommands:**

#### `uni notion databases list`

List databases

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--limit` | -l | number | Maximum databases |

```bash
uni notion databases list
```

#### `uni notion databases query`

Query a database

| Argument | Required | Description |
|----------|----------|-------------|
| `database` | Yes | Database ID |

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--limit` | -l | number | Maximum results |

```bash
uni notion databases query abc123
uni notion databases query abc123 --limit 50
```

---

## uni arxiv

arXiv paper search (free)

### `uni arxiv search`

Search arXiv papers

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | Yes | Search query |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | number | `10` | Max results (default: 10) |

**Examples:**

```bash
uni arxiv search "transformer attention"
uni arxiv search "reinforcement learning" -n 5
```

---

### `uni arxiv paper`

Get paper details by arXiv ID

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | arXiv paper ID (e.g., 2401.12345) |

**Examples:**

```bash
uni arxiv paper 2401.12345
uni arxiv paper 1706.03762
```

---

### `uni arxiv recent`

Get recent papers in a category

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `category` | No | arXiv category (e.g., cs.AI, cs.LG) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | number | `10` | Max results (default: 10) |
| `--list` | -l | boolean |  | List common categories |

**Examples:**

```bash
uni arxiv recent cs.AI
uni arxiv recent cs.LG -n 5
uni arxiv recent --list
```

---

## uni weather

Weather forecasts (Open-Meteo)

### `uni weather `

Get weather for a location

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `location` | No | City name or lat,long coordinates |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--forecast` | -f | number |  | Number of days to forecast (1-7) |
| `--units` | -u | string | `celsius` | Temperature units: celsius or fahrenheit |

**Examples:**

```bash
uni weather London
uni weather "New York, US"
uni weather Tokyo --forecast 3
uni weather London --units fahrenheit
uni weather 40.7128,-74.0060
```

---

## uni slack

Slack messaging - channels, messages, users

### `uni slack channels`

Manage channels

**Aliases:** `ch`, `channel`

**Examples:**

```bash
uni slack channels list
uni slack channels info general
```

**Subcommands:**

#### `uni slack channels list`

List channels

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--limit` | -l | number | Maximum number of channels |
| `--private` | -p | boolean | Include private channels |

```bash
uni slack channels list
uni slack channels list --limit 50
```

#### `uni slack channels info`

Get channel info

| Argument | Required | Description |
|----------|----------|-------------|
| `channel` | Yes | Channel name or ID |

```bash
uni slack channels info general
uni slack channels info C01234567
```

---

### `uni slack messages`

Read messages from a channel

**Aliases:** `msgs`, `read`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `channel` | Yes | Channel name or ID |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -l | number | `10` | Number of messages |

**Examples:**

```bash
uni slack messages general
uni slack messages general --limit 20
```

---

### `uni slack send`

Send a message to a channel

**Aliases:** `msg`, `message`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `channel` | Yes | Channel name or ID |
| `message` | Yes | Message text |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--thread` | -t | string |  | Thread timestamp to reply to |

**Examples:**

```bash
uni slack send general "Hello team!"
uni slack send C01234567 "Update: deployment complete"
uni slack send general "Reply" --thread 1234567890.123456
```

---

### `uni slack users`

Manage users

**Aliases:** `user`, `u`

**Examples:**

```bash
uni slack users list
uni slack users info U01234567
```

**Subcommands:**

#### `uni slack users list`

List users

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--limit` | -l | number | Maximum number of users |

```bash
uni slack users list
uni slack users list --limit 100
```

#### `uni slack users info`

Get user info

| Argument | Required | Description |
|----------|----------|-------------|
| `user` | Yes | User ID |

```bash
uni slack users info U01234567
```

---

## uni gforms

Google Forms - surveys and forms

### `uni gforms list`

List recent forms

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | string |  | Number of forms to show (default: 10) |

**Examples:**

```bash
uni gforms list
uni gforms list -n 20
```

---

### `uni gforms get`

Get form details

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Form ID or URL |

**Examples:**

```bash
uni gforms get <form-id>
uni gforms get https://docs.google.com/forms/d/xxx/edit
```

---

### `uni gforms create`

Create a new form

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `title` | Yes | Form title |

**Examples:**

```bash
uni gforms create "Customer Feedback"
uni gforms create "Event Registration"
```

---

### `uni gforms add-question`

Add a question to a form

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Form ID or URL |
| `title` | Yes | Question title |
| `type` | No | Question type: text, paragraph, scale, choice (default: text) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--required` | -r | boolean |  | Make question required |
| `--choices` |  | string |  | Comma-separated choices (for choice type) |
| `--low` |  | string |  | Low value for scale (default: 1) |
| `--high` |  | string |  | High value for scale (default: 5) |

**Examples:**

```bash
uni gforms add-question <id> "Your name" text
uni gforms add-question <id> "Comments" paragraph
uni gforms add-question <id> "Rating" scale --low 1 --high 10
uni gforms add-question <id> "Color" choice --choices "Red,Blue,Green"
uni gforms add-question <id> "Email" text -r
```

---

### `uni gforms responses`

View form responses

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Form ID or URL |

**Examples:**

```bash
uni gforms responses <form-id>
uni gforms responses <form-id> --json
```

---

### `uni gforms share`

Share a form with someone

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Form ID or URL |
| `email` | Yes | Email address to share with |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--role` | -r | string |  | Permission role: reader or writer (default: writer) |

**Examples:**

```bash
uni gforms share <id> colleague@example.com
uni gforms share <id> viewer@example.com --role reader
```

---

### `uni gforms delete`

Delete a form

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Form ID or URL |

**Examples:**

```bash
uni gforms delete <form-id>
```

---

### `uni gforms auth`

Authenticate with Google Forms

**Aliases:** `login`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--status` | -s | boolean | `false` | Check authentication status |
| `--logout` |  | boolean | `false` | Remove authentication token |

**Examples:**

```bash
uni gforms auth
uni gforms auth --status
uni gforms auth --logout
```

---

## uni wiki

Wikipedia articles and search (free)

### `uni wiki `

Get Wikipedia article summary

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `title` | Yes | Article title |

**Examples:**

```bash
uni wiki "Alan Turing"
uni wiki "Quantum computing"
uni wiki "Rust (programming language)"
```

---

### `uni wiki search`

Search Wikipedia articles

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | Yes | Search query |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | number | `10` | Max results (default: 10) |

**Examples:**

```bash
uni wiki search "quantum computing"
uni wiki search "machine learning" -n 5
```

---

### `uni wiki random`

Get a random Wikipedia article

**Examples:**

```bash
uni wiki random
```

---

### `uni wiki full`

Get full Wikipedia article

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `title` | Yes | Article title |

**Examples:**

```bash
uni wiki full "Alan Turing"
uni wiki full "Rust (programming language)"
```

---

## uni gcal

Google Calendar - events and scheduling

### `uni gcal list`

List calendar events

**Aliases:** `ls`, `events`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--date` | -d | string | `today` | Date to show events for (today, tomorrow, YYYY-MM-DD) |
| `--days` | -n | number | `1` | Number of days to show |
| `--limit` | -l | number | `20` | Maximum number of events |

**Examples:**

```bash
uni gcal list
uni gcal list --date tomorrow
uni gcal list --days 7
uni gcal list --date 2025-01-15
```

---

### `uni gcal add`

Create a calendar event

**Aliases:** `create`, `new`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `title` | Yes | Event title |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--time` | -t | string |  | Start time (e.g., 10am, 14:30) |
| `--duration` | -d | string | `1h` | Duration (e.g., 30m, 1h, 1h30m) |
| `--date` |  | string | `today` | Date (today, tomorrow, YYYY-MM-DD) |
| `--location` | -l | string |  | Event location |
| `--description` |  | string |  | Event description |

**Examples:**

```bash
uni gcal add "Team standup" --time 10am --duration 30m
uni gcal add "Lunch with Bob" --time 12:30pm --date tomorrow
uni gcal add "Meeting" --time 2pm --location "Conference Room A"
```

---

### `uni gcal next`

Show next upcoming event

**Aliases:** `upcoming`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--count` | -n | number | `1` | Number of upcoming events to show |

**Examples:**

```bash
uni gcal next
uni gcal next --count 3
```

---

### `uni gcal update`

Update a calendar event

**Aliases:** `edit`, `rename`, `reschedule`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `search` | Yes | Event name/ID to search for |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--title` | -t | string |  | New event title |
| `--location` | -l | string |  | New location |
| `--description` |  | string |  | New description |
| `--time` |  | string |  | New start time (e.g., 10am, 14:30) |
| `--date` |  | string |  | New date (today, tomorrow, YYYY-MM-DD) |
| `--duration` | -d | string |  | New duration (e.g., 30m, 1h) |

**Examples:**

```bash
uni gcal update "Flight Check-in" --title "Web Check-in: 6E 906"
uni gcal update "Meeting" --location "Room B"
uni gcal update "Standup" -t "Daily Standup"
uni gcal update "Check-in" --date 2026-01-05 --time 10:45am
uni gcal update "Meeting" --time 3pm --duration 1h
```

---

### `uni gcal delete`

Delete a calendar event

**Aliases:** `remove`, `rm`, `cancel`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `search` | Yes | Event name/ID to search for |

**Examples:**

```bash
uni gcal delete "Team Meeting"
uni gcal delete "Check-in"
```

---

### `uni gcal auth`

Authenticate with Google Calendar

**Aliases:** `login`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--status` | -s | boolean | `false` | Check authentication status |
| `--logout` |  | boolean | `false` | Remove authentication token |

**Examples:**

```bash
uni gcal auth
uni gcal auth --status
uni gcal auth --logout
```

---

## uni telegram

Telegram user API (MTProto)

### `uni telegram auth`

Authenticate with Telegram (phone + OTP)

**Examples:**

```bash
uni telegram auth
```

---

### `uni telegram logout`

Clear Telegram session

**Examples:**

```bash
uni telegram logout
```

---

### `uni telegram chats`

List all chats (dialogs)

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | number | `20` | Max results (default: 20) |
| `--archived` | -a | boolean |  | Show archived chats only |

**Examples:**

```bash
uni telegram chats
uni telegram chats -n 50
uni telegram chats --archived
```

---

### `uni telegram read`

Read messages from a chat

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `chat` | Yes | Chat identifier (@username, phone, ID, or title) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | number | `20` | Number of messages (default: 20) |

**Examples:**

```bash
uni telegram read @username
uni telegram read +1234567890
uni telegram read "Family Group" -n 50
```

---

### `uni telegram send`

Send a message to a chat

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `chat` | Yes | Chat identifier (@username, phone, ID, or title) |
| `message` | No | Message text (or caption when sending file) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--file` | -f | string |  | File path to send (image, video, document) |
| `--reply` | -r | string |  | Message ID to reply to |

**Examples:**

```bash
uni telegram send @username "Hello!"
uni telegram send +1234567890 "Hi there"
uni telegram send "Family Group" "Dinner at 7?"
uni telegram send me --file photo.jpg
uni telegram send me "Check this out" -f ./screenshot.png
uni telegram send me "Reply text" --reply 12345
```

---

### `uni telegram edit`

Edit a sent message

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `chat` | Yes | Chat identifier (@username, phone, ID, or title) |
| `messageId` | Yes | Message ID to edit |
| `text` | Yes | New message text |

**Examples:**

```bash
uni telegram edit me 12345 "Fixed typo"
uni telegram edit @username 67890 "Updated message"
```

---

### `uni telegram delete`

Delete a message

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `chat` | Yes | Chat identifier (@username, phone, ID, or title) |
| `messageId` | Yes | Message ID to delete |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--revoke` | -r | boolean | `true` | Delete for everyone (default: true) |

**Examples:**

```bash
uni telegram delete me 12345
uni telegram delete @username 67890
uni telegram delete me 12345 --no-revoke
```

---

### `uni telegram forward`

Forward a message to another chat

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `from` | Yes | Source chat identifier |
| `messageId` | Yes | Message ID to forward |
| `to` | Yes | Destination chat identifier |

**Examples:**

```bash
uni telegram forward @source 12345 @dest
uni telegram forward "Work Group" 67890 me
```

---

### `uni telegram react`

React to a message with an emoji

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `chat` | Yes | Chat identifier (@username, phone, ID, or title) |
| `messageId` | Yes | Message ID to react to |
| `emoji` | Yes | Emoji reaction (e.g., 👍, ❤️, 🔥) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--big` | -b | boolean | `false` | Show bigger reaction animation |

**Examples:**

```bash
uni telegram react me 12345 "👍"
uni telegram react @username 67890 "❤️"
uni telegram react me 12345 "🔥" --big
```

---

### `uni telegram search`

Search messages across chats

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | Yes | Search query |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--chat` | -c | string |  | Search in specific chat only |
| `--limit` | -n | number | `20` | Max results (default: 20) |

**Examples:**

```bash
uni telegram search "meeting"
uni telegram search "project" -c @username
uni telegram search "dinner" -n 50
```

---

### `uni telegram contacts`

List Telegram contacts

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `search` | No | Search query (optional) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | number | `50` | Max results (default: 50) |

**Examples:**

```bash
uni telegram contacts
uni telegram contacts "john"
uni telegram contacts -n 100
```

---

### `uni telegram download`

Download media from a message

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `chat` | Yes | Chat identifier |
| `message_id` | Yes | Message ID containing media |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--output` | -o | string | `.` | Output directory (default: current dir) |

**Examples:**

```bash
uni telegram download @username 12345
uni telegram download "Family Group" 67890 -o ./downloads
```

---

## uni gdocs

Google Docs - documents

### `uni gdocs list`

List recent documents

**Aliases:** `ls`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -l | number | `10` | Max documents to show |

**Examples:**

```bash
uni gdocs list
uni gdocs list --limit 20
```

---

### `uni gdocs get`

Get document content

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Document ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--markdown` | -m | boolean |  | Output as markdown |

**Examples:**

```bash
uni gdocs get 1abc123XYZ
uni gdocs get 1abc123XYZ --markdown
uni gdocs get "https://docs.google.com/document/d/1abc123XYZ/edit"
```

---

### `uni gdocs create`

Create a new document

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `title` | Yes | Document title |

**Examples:**

```bash
uni gdocs create "Meeting Notes"
uni gdocs create "Project Plan"
```

---

### `uni gdocs append`

Append text to document

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Document ID or URL |
| `text` | Yes | Text to append |

**Examples:**

```bash
uni gdocs append 1abc123XYZ "New paragraph"
uni gdocs append 1abc123XYZ "\n\nAction Items:\n- Task 1\n- Task 2"
```

---

### `uni gdocs replace`

Replace text in document

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Document ID or URL |
| `old` | Yes | Text to find |
| `new` | Yes | Replacement text |

**Examples:**

```bash
uni gdocs replace 1abc123XYZ "old text" "new text"
uni gdocs replace 1abc123XYZ "TODO" "DONE"
```

---

### `uni gdocs share`

Share document with email

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Document ID or URL |
| `email` | Yes | Email address to share with |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--role` | -r | string | `writer` | Permission role: reader or writer (default: writer) |

**Examples:**

```bash
uni gdocs share 1abc123XYZ colleague@company.com
uni gdocs share 1abc123XYZ viewer@example.com --role reader
```

---

### `uni gdocs export`

Export document to file

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Document ID or URL |
| `format` | Yes | Export format: pdf, docx, txt, html, md |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--output` | -o | string |  | Output file path |

**Examples:**

```bash
uni gdocs export 1abc123XYZ pdf
uni gdocs export 1abc123XYZ pdf --output report.pdf
uni gdocs export 1abc123XYZ txt --output notes.txt
```

---

### `uni gdocs auth`

Authenticate with Google Docs

**Aliases:** `login`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--status` | -s | boolean | `false` | Check authentication status |
| `--logout` |  | boolean | `false` | Remove authentication token |

**Examples:**

```bash
uni gdocs auth
uni gdocs auth --status
uni gdocs auth --logout
```

---

## uni shorturl

URL shortener (is.gd)

### `uni shorturl `

Shorten or expand URLs

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `url` | No | URL to shorten or expand |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--expand` | -e | boolean |  | Expand a short URL to original |

**Examples:**

```bash
uni shorturl "https://example.com/very/long/path"
uni shorturl "https://is.gd/abc123" --expand
uni short "https://example.com"
```

---

## uni gsheets

Google Sheets - spreadsheets

### `uni gsheets list`

List recent spreadsheets

**Aliases:** `ls`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -l | number | `10` | Max spreadsheets to show |

**Examples:**

```bash
uni gsheets list
uni gsheets list --limit 20
```

---

### `uni gsheets get`

Get spreadsheet data

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `range` | No | Cell range (e.g., A1:B10, Sheet1!A1:Z100) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |
| `--data` | -d | boolean |  | Include all data |

**Examples:**

```bash
uni gsheets get 1abc123XYZ
uni gsheets get 1abc123XYZ A1:B10
uni gsheets get 1abc123XYZ --data
uni gsheets get "https://docs.google.com/spreadsheets/d/1abc123XYZ/edit"
```

---

### `uni gsheets create`

Create a new spreadsheet

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `title` | Yes | Spreadsheet title |

**Examples:**

```bash
uni gsheets create "Budget 2025"
uni gsheets create "Project Tracker"
```

---

### `uni gsheets set`

Set cell value

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `range` | Yes | Cell or range (e.g., A1, B2:C5) |
| `value` | Yes | Value to set (or comma-separated values for range) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets set 1abc123XYZ A1 "Hello"
uni gsheets set 1abc123XYZ B2 "=SUM(A1:A10)"
uni gsheets set 1abc123XYZ A1 100
uni gsheets set 1abc123XYZ --sheet "Data" A1 "Value"
```

---

### `uni gsheets append`

Append row to spreadsheet

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `values` | Yes | Comma-separated values or multiple arguments |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets append 1abc123XYZ "John,Doe,john@example.com"
uni gsheets append 1abc123XYZ "Item,100,In Stock"
uni gsheets append 1abc123XYZ --sheet "Data" "Row,Data,Here"
```

---

### `uni gsheets share`

Share spreadsheet with email

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `email` | Yes | Email address to share with |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--role` | -r | string | `writer` | Permission role: reader or writer (default: writer) |

**Examples:**

```bash
uni gsheets share 1abc123XYZ colleague@company.com
uni gsheets share 1abc123XYZ viewer@example.com --role reader
```

---

### `uni gsheets auth`

Authenticate with Google Sheets

**Aliases:** `login`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--status` | -s | boolean | `false` | Check authentication status |
| `--logout` |  | boolean | `false` | Remove authentication token |

**Examples:**

```bash
uni gsheets auth
uni gsheets auth --status
uni gsheets auth --logout
```

---

## uni todoist

Todoist - tasks, projects, labels, and comments

### `uni todoist auth`

Authenticate with Todoist

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--status` | -s | boolean |  | Check auth status |
| `--logout` |  | boolean |  | Clear authentication |

**Examples:**

```bash
uni todoist auth
uni todoist auth --status
uni todoist auth --logout
```

---

### `uni todoist tasks`

Manage tasks

**Aliases:** `task`, `t`

**Subcommands:**

#### `uni todoist tasks list`

List tasks

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--project` | -p | string | Filter by project name |
| `--filter` | -f | string | Todoist filter (e.g., "today", "overdue") |

```bash
uni todoist tasks list
uni todoist tasks list --project Work
uni todoist tasks list --filter today
uni todoist tasks list --filter "p1 | p2"
```

#### `uni todoist tasks add`

Add a new task

| Argument | Required | Description |
|----------|----------|-------------|
| `content` | Yes | Task content |

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--project` | -p | string | Project name |
| `--due` | -d | string | Due date (e.g., "today", "tomorrow", "next week") |
| `--priority` |  | number | Priority: 1-4 (4=Urgent) |
| `--labels` | -l | string | Comma-separated labels |
| `--description` |  | string | Task description |

```bash
uni todoist tasks add "Buy groceries"
uni todoist tasks add "Finish report" --due tomorrow --priority 4
uni todoist tasks add "Call mom" -p Personal -d "next weekend"
```

#### `uni todoist tasks done`

Mark a task as complete

| Argument | Required | Description |
|----------|----------|-------------|
| `query` | Yes | Task ID or search text |

```bash
uni todoist tasks done "Buy groceries"
uni todoist tasks done 123456789
```

#### `uni todoist tasks delete`

Delete a task

| Argument | Required | Description |
|----------|----------|-------------|
| `query` | Yes | Task ID or search text |

```bash
uni todoist tasks delete "Old task"
```

#### `uni todoist tasks update`

Update a task

| Argument | Required | Description |
|----------|----------|-------------|
| `query` | Yes | Task ID or search text |

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--content` | -c | string | New content |
| `--due` | -d | string | New due date |
| `--priority` | -p | number | New priority |
| `--labels` | -l | string | New labels (comma-separated) |

```bash
uni todoist tasks update "Buy groceries" --due tomorrow
uni todoist tasks update "Report" --priority 4
```

---

### `uni todoist projects`

Manage projects

**Aliases:** `project`, `p`

**Subcommands:**

#### `uni todoist projects list`

List projects

```bash
uni todoist projects list
```

#### `uni todoist projects create`

Create a project

| Argument | Required | Description |
|----------|----------|-------------|
| `name` | Yes | Project name |

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--favorite` | -f | boolean | Mark as favorite |
| `--view` | -v | string | View style: list or board |

```bash
uni todoist projects create "Work"
uni todoist projects create "Side Project" --favorite
```

#### `uni todoist projects delete`

Delete a project

| Argument | Required | Description |
|----------|----------|-------------|
| `name` | Yes | Project name or ID |

```bash
uni todoist projects delete "Old Project"
```

---

### `uni todoist labels`

Manage labels

**Aliases:** `label`, `l`

**Subcommands:**

#### `uni todoist labels list`

List labels

```bash
uni todoist labels list
```

#### `uni todoist labels create`

Create a label

| Argument | Required | Description |
|----------|----------|-------------|
| `name` | Yes | Label name |

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--favorite` | -f | boolean | Mark as favorite |

```bash
uni todoist labels create "urgent"
uni todoist labels create "work" --favorite
```

#### `uni todoist labels delete`

Delete a label

| Argument | Required | Description |
|----------|----------|-------------|
| `name` | Yes | Label name or ID |

```bash
uni todoist labels delete "old-label"
```

---

### `uni todoist comments`

Manage comments

**Aliases:** `comment`, `c`

**Subcommands:**

#### `uni todoist comments list`

List comments on a task

| Argument | Required | Description |
|----------|----------|-------------|
| `task` | Yes | Task ID or search text |

```bash
uni todoist comments list "Buy groceries"
```

#### `uni todoist comments add`

Add a comment to a task

| Argument | Required | Description |
|----------|----------|-------------|
| `task` | Yes | Task ID or search text |
| `content` | Yes | Comment text |

```bash
uni todoist comments add "Buy groceries" "Remember to get organic"
```

---

## uni currency

Currency converter (ECB rates)

### `uni currency `

Convert currencies

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `amount` | No | Amount to convert |
| `from` | No | Source currency code (USD, EUR, etc.) |
| `to` | No | "to" keyword (optional) |
| `target` | No | Target currency code(s) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--list` | -l | boolean |  | List all supported currencies |

**Examples:**

```bash
uni currency 100 usd to eur
uni currency 100 usd eur
uni currency 5000 jpy to usd
uni currency 1000 eur to usd gbp jpy
uni currency --list
```

---

## uni hn

Hacker News stories and search (free)

### `uni hn top`

Get top Hacker News stories

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | number | `10` | Max results (default: 10) |

**Examples:**

```bash
uni hn top
uni hn top -n 20
```

---

### `uni hn new`

Get newest Hacker News stories

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | number | `10` | Max results (default: 10) |

**Examples:**

```bash
uni hn new
uni hn new -n 20
```

---

### `uni hn best`

Get best Hacker News stories

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | number | `10` | Max results (default: 10) |

**Examples:**

```bash
uni hn best
uni hn best -n 20
```

---

### `uni hn ask`

Get Ask HN posts

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | number | `10` | Max results (default: 10) |

**Examples:**

```bash
uni hn ask
uni hn ask -n 5
```

---

### `uni hn show`

Get Show HN posts

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | number | `10` | Max results (default: 10) |

**Examples:**

```bash
uni hn show
uni hn show -n 5
```

---

### `uni hn search`

Search Hacker News (via Algolia)

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | Yes | Search query |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--sort` | -s | string | `relevance` | Sort by: relevance or date |
| `--limit` | -n | number | `10` | Max results (default: 10) |

**Examples:**

```bash
uni hn search "rust programming"
uni hn search "ai agents" --sort date
uni hn search "typescript" -n 5
```

---

### `uni hn story`

Get a story with comments

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Story ID |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--comments` | -c | number | `10` | Number of comments (default: 10) |

**Examples:**

```bash
uni hn story 12345678
uni hn story 12345678 -c 20
```

---

## uni hf

HuggingFace - models, datasets, spaces, and inference

### `uni hf models`

Search and get HuggingFace models

**Aliases:** `model`, `m`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | No | Search query or model ID |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--author` | -a | string |  | Filter by author/organization |
| `--task` | -t | string |  | Filter by task (e.g., text-generation, image-classification) |
| `--limit` | -n | number | `10` | Max results (default: 10) |
| `--info` | -i | boolean |  | Get detailed info for a specific model |

**Examples:**

```bash
uni hf models
uni hf models "llama"
uni hf models -a meta-llama
uni hf models -t text-generation -n 5
uni hf models meta-llama/Llama-2-7b --info
```

---

### `uni hf datasets`

Search and get HuggingFace datasets

**Aliases:** `dataset`, `ds`, `d`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | No | Search query or dataset ID |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--author` | -a | string |  | Filter by author/organization |
| `--limit` | -n | number | `10` | Max results (default: 10) |
| `--info` | -i | boolean |  | Get detailed info for a specific dataset |

**Examples:**

```bash
uni hf datasets
uni hf datasets "wikipedia"
uni hf datasets -a openai
uni hf datasets squad --info
```

---

### `uni hf spaces`

Search and get HuggingFace Spaces

**Aliases:** `space`, `s`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | No | Search query or Space ID |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--author` | -a | string |  | Filter by author/organization |
| `--sdk` |  | string |  | Filter by SDK (gradio, streamlit, docker, static) |
| `--limit` | -n | number | `10` | Max results (default: 10) |
| `--info` | -i | boolean |  | Get detailed info for a specific Space |

**Examples:**

```bash
uni hf spaces
uni hf spaces "chat"
uni hf spaces -a stabilityai
uni hf spaces --sdk gradio -n 5
uni hf spaces stabilityai/stable-diffusion --info
```

---

### `uni hf infer`

Run inference on a HuggingFace model (requires HF_TOKEN)

**Aliases:** `inference`, `run`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `model` | Yes | Model ID (e.g., gpt2, meta-llama/Llama-2-7b) |
| `input` | Yes | Input text or prompt |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--max-tokens` |  | number |  | Max tokens to generate (for text generation) |
| `--temperature` |  | number |  | Temperature for sampling (0.0-2.0) |

**Examples:**

```bash
uni hf infer gpt2 "Hello, my name is"
uni hf infer bigscience/bloom-560m "The meaning of life is"
uni hf infer gpt2 "Once upon a time" --max-tokens 50
```

---

