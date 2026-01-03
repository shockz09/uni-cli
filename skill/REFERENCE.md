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

uni ask "list my open PRs"
# → uni gh pr list --state open
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
uni run "gh pr list" "gcal list"
uni run -p "gh pr list" "gcal list" "exa search 'news'"
uni run --dry-run "gh pr create" "slack send general 'PR ready'"
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
uni flow add standup "gcal list" "gh pr list --mine"
uni flow add prcheck "gh pr view $1" "gh pr checks $1"
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
uni alias add prs "gh pr list --state open"
uni alias add inbox "gmail list --unread"
```

### `uni alias remove <name>`

Remove an alias.

```bash
uni alias remove prs
```

### Usage

```bash
uni prs                         # → uni gh pr list --state open
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
uni history --search "gh pr"
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

**Examples:**

```bash
uni gdrive list
uni gdrive list --limit 50
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

## uni gh

GitHub management - PRs, issues, and repositories

### `uni gh pr`

Manage pull requests

**Aliases:** `pull-request`

**Examples:**

```bash
uni gh pr list
uni gh pr view 123
uni gh pr create --title "Feature"
```

**Subcommands:**

#### `uni gh pr list`

List pull requests

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--state` | -s | string | Filter by state: open, closed, merged, all |
| `--limit` | -l | number | Maximum number of PRs to list |
| `--author` | -a | string | Filter by author |

```bash
uni gh pr list
uni gh pr list --state all --limit 20
uni gh pr list --author @me
```

#### `uni gh pr view`

View a pull request

| Argument | Required | Description |
|----------|----------|-------------|
| `number` | Yes | PR number |

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--web` | -w | boolean | Open in browser |

```bash
uni gh pr view 123
uni gh pr view 123 --web
```

#### `uni gh pr create`

Create a pull request

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--title` | -t | string | PR title |
| `--body` | -b | string | PR description |
| `--base` |  | string | Base branch |
| `--draft` | -d | boolean | Create as draft |
| `--web` | -w | boolean | Open in browser to create |

```bash
uni gh pr create --title "Add feature" --body "Description"
uni gh pr create --draft
uni gh pr create --web
```

#### `uni gh pr merge`

Merge a pull request

| Argument | Required | Description |
|----------|----------|-------------|
| `number` | No | PR number (defaults to current branch PR) |

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--method` | -m | string | Merge method: merge, squash, rebase |
| `--delete-branch` | -d | boolean | Delete branch after merge |

```bash
uni gh pr merge 123
uni gh pr merge --method squash
uni gh pr merge 123 --delete-branch
```

---

### `uni gh issue`

Manage issues

**Aliases:** `issues`, `i`

**Examples:**

```bash
uni gh issue list
uni gh issue view 123
uni gh issue create --title "Bug"
```

**Subcommands:**

#### `uni gh issue list`

List issues

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--state` | -s | string | Filter by state: open, closed, all |
| `--limit` | -l | number | Maximum number of issues to list |
| `--label` |  | string | Filter by label |
| `--assignee` | -a | string | Filter by assignee |

```bash
uni gh issue list
uni gh issue list --state all --limit 20
uni gh issue list --label bug
```

#### `uni gh issue view`

View an issue

| Argument | Required | Description |
|----------|----------|-------------|
| `number` | Yes | Issue number |

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--web` | -w | boolean | Open in browser |

```bash
uni gh issue view 123
uni gh issue view 123 --web
```

#### `uni gh issue create`

Create an issue

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--title` | -t | string | Issue title |
| `--body` | -b | string | Issue description |
| `--label` | -l | string | Add labels (comma-separated) |
| `--assignee` | -a | string | Assign to user |
| `--web` | -w | boolean | Open in browser to create |

```bash
uni gh issue create --title "Bug report" --body "Description"
uni gh issue create --title "Feature" --label enhancement
uni gh issue create --web
```

#### `uni gh issue close`

Close an issue

| Argument | Required | Description |
|----------|----------|-------------|
| `number` | Yes | Issue number |

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--reason` | -r | string | Reason: completed, not_planned |

```bash
uni gh issue close 123
uni gh issue close 123 --reason not_planned
```

---

### `uni gh repo`

Manage repositories

**Aliases:** `repository`, `r`

**Examples:**

```bash
uni gh repo view
uni gh repo clone owner/repo
uni gh repo list
```

**Subcommands:**

#### `uni gh repo view`

View repository details

| Argument | Required | Description |
|----------|----------|-------------|
| `repo` | No | Repository name (owner/repo) |

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--web` | -w | boolean | Open in browser |

```bash
uni gh repo view
uni gh repo view owner/repo
uni gh repo view --web
```

#### `uni gh repo clone`

Clone a repository

| Argument | Required | Description |
|----------|----------|-------------|
| `repo` | Yes | Repository to clone (owner/repo or URL) |
| `directory` | No | Target directory |

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--depth` |  | number | Shallow clone depth |

```bash
uni gh repo clone owner/repo
uni gh repo clone owner/repo ./my-dir
uni gh repo clone owner/repo --depth 1
```

#### `uni gh repo list`

List repositories

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--limit` | -l | number | Maximum number of repos to list |
| `--visibility` |  | string | Filter by visibility: public, private, all |
| `--source` |  | boolean | Show only non-forks |

```bash
uni gh repo list
uni gh repo list --limit 20
uni gh repo list --visibility private
```

#### `uni gh repo create`

Create a new repository

| Argument | Required | Description |
|----------|----------|-------------|
| `name` | No | Repository name |

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--public` |  | boolean | Make repository public |
| `--private` |  | boolean | Make repository private |
| `--description` | -d | string | Repository description |
| `--clone` | -c | boolean | Clone after creating |

```bash
uni gh repo create my-project
uni gh repo create my-project --public
uni gh repo create my-project --description "My project" --clone
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
uni gmail read "from:amazon order confirmation"
```

**Notes:**

- If query looks like a hex ID (16+ chars), it's treated as an email ID
- Otherwise, it searches for emails matching the query and reads the first result
- Use Gmail search syntax for advanced queries (from:, subject:, has:attachment, etc.)

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

**Examples:**

```bash
uni gmail send --to user@example.com --subject "Hello" --body "Message"
```

---

### `uni gmail auth`

Authenticate with Gmail

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

Update/rename a calendar event

**Aliases:** `edit`, `rename`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `search` | Yes | Event name or ID to search for |

**Options:**

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--title` | -t | string | New event title |
| `--location` | -l | string | New location |
| `--description` | -d | string | New description |

**Examples:**

```bash
uni gcal update "Flight Check-in" --title "Web Check-in: 6E 906"
uni gcal update "Meeting" --location "Room B"
uni gcal update "Standup" -t "Daily Standup"
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

## uni gsheets

Google Sheets - spreadsheets

### `uni gsheets list`

List recent spreadsheets

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | string | `10` | Number of spreadsheets to show |

**Examples:**

```bash
uni gsheets list
uni gsheets list -n 20
```

---

### `uni gsheets get`

Get spreadsheet data

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |

**Options:**

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--range` | -r | string | Cell range (e.g., A1:C10) |
| `--sheet` | -s | string | Sheet name |

**Examples:**

```bash
uni gsheets get <spreadsheet-id>
uni gsheets get <id> --range "A1:C10"
uni gsheets get <id> --sheet "Sheet2"
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
uni gsheets create "Inventory"
```

---

### `uni gsheets set`

Set cell values

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `range` | Yes | Cell range (e.g., A1, A1:B2) |
| `value` | Yes | Value(s) to set |

**Examples:**

```bash
uni gsheets set <id> A1 "Hello"
uni gsheets set <id> A1:B2 "1,2;3,4"
```

---

### `uni gsheets append`

Append rows to a sheet

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `range` | Yes | Range to append to (e.g., A:A) |
| `values` | Yes | Values to append |

**Examples:**

```bash
uni gsheets append <id> "A:A" "New,Row,Data"
```

---

### `uni gsheets share`

Share a spreadsheet

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `email` | Yes | Email address to share with |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--role` | -r | string | `writer` | Permission: reader or writer |

**Examples:**

```bash
uni gsheets share <id> user@email.com
uni gsheets share <id> user@email.com --role reader
```

---

## uni gdocs

Google Docs - documents

### `uni gdocs list`

List recent documents

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | string | `10` | Number of documents to show |

**Examples:**

```bash
uni gdocs list
uni gdocs list -n 20
```

---

### `uni gdocs get`

Get document content

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Document ID or URL |

**Options:**

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--text` | -t | boolean | Extract plain text |

**Examples:**

```bash
uni gdocs get <document-id>
uni gdocs get <id> --text
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
uni gdocs append <id> "New paragraph"
```

---

### `uni gdocs replace`

Find and replace text

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Document ID or URL |
| `old` | Yes | Text to find |
| `new` | Yes | Replacement text |

**Examples:**

```bash
uni gdocs replace <id> "old text" "new text"
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

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--output` | -o | string | Output file path |

**Examples:**

```bash
uni gdocs export <id> pdf
uni gdocs export <id> docx -o report.docx
uni gdocs export <id> txt
```

---

### `uni gdocs share`

Share a document

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Document ID or URL |
| `email` | Yes | Email address to share with |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--role` | -r | string | `writer` | Permission: reader or writer |

**Examples:**

```bash
uni gdocs share <id> user@email.com
uni gdocs share <id> user@email.com --role reader
```

---

## uni gslides

Google Slides - presentations

### `uni gslides list`

List recent presentations

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | string | `10` | Number of presentations to show |

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

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--text` | -t | boolean | Extract text from slides |

**Examples:**

```bash
uni gslides get <presentation-id>
uni gslides get <id> --text
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

Add a new slide

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Presentation ID or URL |

**Examples:**

```bash
uni gslides add-slide <id>
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

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--slide` | -s | string | Slide number (default: last) |

**Examples:**

```bash
uni gslides add-text <id> "Hello World"
uni gslides add-text <id> "Title" --slide 1
```

---

### `uni gslides export`

Export presentation to file

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Presentation ID or URL |
| `format` | Yes | Export format: pdf, pptx, odp, txt |

**Options:**

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--output` | -o | string | Output file path |

**Examples:**

```bash
uni gslides export <id> pdf
uni gslides export <id> pptx -o presentation.pptx
```

---

### `uni gslides share`

Share a presentation

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Presentation ID or URL |
| `email` | Yes | Email address to share with |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--role` | -r | string | `writer` | Permission: reader or writer |

**Examples:**

```bash
uni gslides share <id> user@email.com
uni gslides share <id> user@email.com --role reader
```

---

## uni gforms

Google Forms - surveys and forms

### `uni gforms list`

List recent forms

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | string | `10` | Number of forms to show |

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

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--required` | -r | boolean | Make question required |
| `--choices` |  | string | Comma-separated choices (for choice type) |
| `--low` |  | string | Low value for scale (default: 1) |
| `--high` |  | string | High value for scale (default: 5) |

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
uni gforms responses <id> --json
```

---

### `uni gforms share`

Share a form

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Form ID or URL |
| `email` | Yes | Email address to share with |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--role` | -r | string | `writer` | Permission: reader or writer |

**Examples:**

```bash
uni gforms share <id> user@email.com
uni gforms share <id> user@email.com --role reader
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

## uni gkeep

Google Keep - notes (Workspace Only)

> **Note:** Google Keep API requires Google Workspace Enterprise/Education Plus account.

### `uni gkeep list`

List notes

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--archived` | -a | boolean | `false` | Show archived notes |
| `--trashed` | -t | boolean | `false` | Show trashed notes |

**Examples:**

```bash
uni gkeep list
uni gkeep list --archived
uni gkeep list --trashed
```

---

### `uni gkeep get`

Get note details

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Note ID |

**Examples:**

```bash
uni gkeep get <note-id>
```

---

### `uni gkeep add`

Create a new note

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `content` | Yes | Note content |

**Options:**

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--title` | -t | string | Note title |
| `--list` | -l | boolean | Create as checklist |

**Examples:**

```bash
uni gkeep add "Remember to call mom"
uni gkeep add "Shopping list" --title "Groceries" --list
uni gkeep add "Milk,Eggs,Bread" -l -t "Shopping"
```

---

### `uni gkeep delete`

Delete a note (moves to trash)

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Note ID |

**Examples:**

```bash
uni gkeep delete <note-id>
```

---

