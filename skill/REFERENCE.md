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

### `uni gdrive mkdir`

Create a new folder

**Aliases:** `newfolder`, `create-folder`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `name` | Yes | Folder name |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--parent` | -p | string |  | Parent folder ID |

**Examples:**

```bash
uni gdrive mkdir "My Folder"
uni gdrive mkdir "Subfolder" --parent FOLDER_ID
```

---

### `uni gdrive move`

Move a file to a different folder

**Aliases:** `mv`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `fileId` | Yes | File ID to move |
| `folderId` | Yes | Destination folder ID |

**Examples:**

```bash
uni gdrive move FILE_ID FOLDER_ID
```

---

### `uni gdrive copy`

Copy a file

**Aliases:** `cp`, `duplicate`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `fileId` | Yes | File ID to copy |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--name` | -n | string |  | New name for the copy |
| `--parent` | -p | string |  | Destination folder ID |

**Examples:**

```bash
uni gdrive copy FILE_ID
uni gdrive copy FILE_ID --name "Copy of Document"
uni gdrive copy FILE_ID --parent FOLDER_ID
```

---

### `uni gdrive rename`

Rename a file

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `fileId` | Yes | File ID to rename |
| `newName` | Yes | New name |

**Examples:**

```bash
uni gdrive rename FILE_ID "New Name.pdf"
```

---

### `uni gdrive trash`

Move file to trash, restore from trash, or list trash

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `fileId` | No | File ID to trash/restore (optional) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--restore` | -r | boolean |  | Restore file from trash |
| `--empty` | -e | boolean |  | Empty entire trash (permanent!) |
| `--list` | -l | boolean |  | List files in trash |
| `--limit` | -n | string |  | Number of items to list (default: 20) |

**Examples:**

```bash
uni gdrive trash FILE_ID
uni gdrive trash FILE_ID --restore
uni gdrive trash --list
uni gdrive trash --empty
```

---

### `uni gdrive permissions`

View or manage file permissions

**Aliases:** `perms`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `fileId` | Yes | File ID |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--remove` | -r | string |  | Remove permission by ID |

**Examples:**

```bash
uni gdrive permissions FILE_ID
uni gdrive permissions FILE_ID --remove PERMISSION_ID
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

### `uni linear cycles`

List and view cycles/sprints

**Aliases:** `cycle`, `sprint`, `sprints`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--team` | -t | string |  | Filter by team ID |
| `--current` | -c | boolean |  | Show current active cycle only |
| `--limit` | -n | string |  | Number of cycles (default: 10) |

**Examples:**

```bash
uni linear cycles
uni linear cycles --team TEAM_ID
uni linear cycles --current --team TEAM_ID
uni linear cycles --limit 5
```

---

### `uni linear labels`

List, create, and manage labels

**Aliases:** `label`, `tag`, `tags`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--team` | -t | string |  | Filter by team ID |
| `--create` | -c | string |  | Create a new label (name) |
| `--color` |  | string |  | Label color for creation (hex without #) |
| `--description` | -d | string |  | Label description |
| `--add-to` | -a | string |  | Add label to issue (issue ID) |
| `--label` | -l | string |  | Label ID for add-to operation |

**Examples:**

```bash
uni linear labels
uni linear labels --team TEAM_ID
uni linear labels --create "Bug" --team TEAM_ID --color "ff0000"
uni linear labels --add-to ISSUE_ID --label LABEL_ID
```

---

### `uni linear attachments`

List, add, and remove attachments from issues

**Aliases:** `attachment`, `attach`, `files`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `issueId` | Yes | Issue ID or identifier |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--add` | -a | string |  | Add attachment (URL) |
| `--title` | -t | string |  | Attachment title |
| `--delete` | -d | string |  | Delete attachment by ID |

**Examples:**

```bash
uni linear attachments ENG-123
uni linear attachments ENG-123 --add "https://example.com/doc.pdf"
uni linear attachments ENG-123 --add "https://figma.com/..." --title "Design mockup"
uni linear attachments ENG-123 --delete ATTACHMENT_ID
```

---

## uni 0x0

0x0.st - The null pointer

### `uni 0x0 upload`

Upload a file to 0x0.st

**Aliases:** `up`, `share`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `file` | Yes | File path to upload |

**Examples:**

```bash
uni 0x0 upload ./image.png
uni 0x0 share ./document.pdf
```

---

### `uni 0x0 paste`

Paste text content to 0x0.st

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `text` | Yes | Text to paste |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--name` | -n | string |  | Filename (default: paste.txt) |

**Examples:**

```bash
uni 0x0 paste "Hello world"
uni 0x0 paste "console.log(1)" -n code.js
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

### `uni exa similar`

Find content similar to a given URL

**Aliases:** `like`, `related`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `url` | Yes | URL to find similar content for |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--num` | -n | string |  | Number of results (default: 5) |
| `--include` | -i | string |  | Include domains (comma-separated) |
| `--exclude` | -e | string |  | Exclude domains (comma-separated) |

**Examples:**

```bash
uni exa similar "https://example.com/article"
uni exa similar "https://blog.com/post" --num 10
uni exa similar "https://news.com/story" --exclude "reddit.com,twitter.com"
```

---

### `uni exa crawl`

Extract and read content from a URL

**Aliases:** `extract`, `fetch`, `contents`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `url` | Yes | URL to extract content from |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--chars` | -c | string |  | Max characters to extract (default: 10000) |

**Examples:**

```bash
uni exa crawl "https://example.com/article"
uni exa crawl "https://blog.com/post" --chars 5000
uni exa crawl "https://docs.example.com/guide"
```

---

### `uni exa news`

Search for recent news articles

**Aliases:** `headlines`, `recent`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | Yes | News topic to search |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--num` | -n | string |  | Number of results (default: 10) |
| `--days` | -d | string |  | Days back to search (default: 7) |

**Examples:**

```bash
uni exa news "AI developments"
uni exa news "tech layoffs" --num 20
uni exa news "cryptocurrency" --days 3
uni exa news "climate change" --days 30 --num 15
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
| `--x` |  | string |  | X position in points (default: 50) |
| `--y` |  | string |  | Y position in points (default: 100) |
| `--width` | -w | string |  | Width in points (default: 500) |
| `--height` | -h | string |  | Height in points (default: 300) |

**Examples:**

```bash
uni gslides add-text <id> "Hello World"
uni gslides add-text <id> "Title" --slide 1
uni gslides add-text <id> "Content" --x 100 --y 200 --width 400 --height 50
```

---

### `uni gslides add-image`

Add an image to a slide

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Presentation ID or URL |
| `url` | Yes | Image URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--slide` | -s | number |  | Slide number (default: last slide) |
| `--width` | -w | number |  | Image width in points (default: 300) |
| `--height` | -h | number |  | Image height in points (default: auto) |
| `--x` |  | number |  | X position in points (default: 100) |
| `--y` |  | number |  | Y position in points (default: 100) |

**Examples:**

```bash
uni gslides add-image ID "https://example.com/image.png"
uni gslides add-image ID "https://example.com/logo.png" --slide 1
uni gslides add-image ID "https://example.com/chart.png" --width 400 --x 50 --y 200
```

---

### `uni gslides duplicate-slide`

Duplicate an existing slide

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Presentation ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--slide` | -s | number |  | Slide number to duplicate (default: last slide) |

**Examples:**

```bash
uni gslides duplicate-slide ID
uni gslides duplicate-slide ID --slide 1
uni gslides duplicate-slide ID -s 3
```

---

### `uni gslides delete-slide`

Delete a slide from presentation

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Presentation ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--slide` | -s | number |  | Slide number to delete (default: last slide) |
| `--force` | -f | boolean |  | Skip confirmation |

**Examples:**

```bash
uni gslides delete-slide ID
uni gslides delete-slide ID --slide 2
uni gslides delete-slide ID -s 1 --force
```

---

### `uni gslides clear-slide`

Clear all content from a slide

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Presentation ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--slide` | -s | number |  | Slide number to clear (default: last slide) |
| `--force` | -f | boolean |  | Skip confirmation |

**Examples:**

```bash
uni gslides clear-slide ID
uni gslides clear-slide ID --slide 2
uni gslides clear-slide ID -s 1 --force
```

---

### `uni gslides replace-text`

Replace text throughout the presentation

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Presentation ID or URL |
| `old` | Yes | Text to find |
| `new` | Yes | Replacement text |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--case` | -c | boolean |  | Case-sensitive replacement |

**Examples:**

```bash
uni gslides replace-text ID "old text" "new text"
uni gslides replace-text ID "TODO" "DONE"
uni gslides replace-text ID "2024" "2025" --case
```

---

### `uni gslides copy`

Create a copy of a presentation

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Presentation ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--name` | -n | string |  | Name for the copy (default: "Copy of <original>" |

**Examples:**

```bash
uni gslides copy ID
uni gslides copy ID --name "Q2 Review"
uni gslides copy ID -n "Template Copy"
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

### `uni gslides delete`

Delete a presentation (moves to trash)

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Presentation ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--force` | -f | boolean |  | Skip confirmation |

**Examples:**

```bash
uni gslides delete 1abc123XYZ
uni gslides delete 1abc123XYZ --force
```

---

### `uni gslides rename`

Rename a presentation

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Presentation ID or URL |
| `title` | Yes | New title |

**Examples:**

```bash
uni gslides rename 1abc123XYZ "New Title"
uni gslides rename 1abc123XYZ "Q1 Review 2025"
```

---

### `uni gslides add-shape`

Add a shape to a slide

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Presentation ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--slide` | -s | string |  | Slide number (1-indexed). Default: last slide |
| `--type` | -t | string |  | Shape type: rectangle, ellipse, triangle, arrow, star, diamond, heart, cloud |
| `--x` |  | string |  | X position in points (default: 100) |
| `--y` |  | string |  | Y position in points (default: 100) |
| `--width` | -w | string |  | Width in points (default: 200) |
| `--height` | -h | string |  | Height in points (default: 150) |
| `--color` | -c | string |  | Fill color (hex or name) |

**Examples:**

```bash
uni gslides add-shape ID --type rectangle
uni gslides add-shape ID --type ellipse --slide 2 --color blue
uni gslides add-shape ID --type star --x 200 --y 150 --width 100 --height 100
uni gslides add-shape ID --type arrow --color "#FF5500"
```

---

### `uni gslides add-line`

Add a line to a slide

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Presentation ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--slide` | -s | string |  | Slide number (1-indexed). Default: last slide |
| `--type` | -t | string |  | Line type: straight, bent, curved (default: straight) |
| `--start-x` |  | string |  | Start X position (default: 50) |
| `--start-y` |  | string |  | Start Y position (default: 100) |
| `--end-x` |  | string |  | End X position (default: 300) |
| `--end-y` |  | string |  | End Y position (default: 100) |
| `--color` | -c | string |  | Line color (hex or name) |
| `--weight` | -w | string |  | Line weight in points |
| `--dash` | -d | string |  | Dash style: solid, dot, dash, dash-dot |

**Examples:**

```bash
uni gslides add-line ID
uni gslides add-line ID --slide 2 --color red --weight 3
uni gslides add-line ID --start-x 50 --start-y 100 --end-x 400 --end-y 300
uni gslides add-line ID --type curved --dash dot --color blue
```

---

### `uni gslides notes`

Get or set speaker notes for a slide

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Presentation ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--slide` | -s | string |  | Slide number (1-indexed). Default: 1 |
| `--text` | -t | string |  | Set speaker notes text |
| `--get` | -g | boolean |  | Get current speaker notes |

**Examples:**

```bash
uni gslides notes ID --slide 1 --get
uni gslides notes ID --slide 2 --text "Remember to mention the key points"
uni gslides notes ID -s 3 -t "Transition to demo here"
```

---

### `uni gslides reorder`

Move slides to a new position

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Presentation ID or URL |
| `slide` | Yes | Slide number to move (1-indexed) |
| `to` | Yes | New position (1-indexed) |

**Examples:**

```bash
uni gslides reorder ID 3 1
uni gslides reorder ID 5 2
uni gslides reorder ID 1 10
```

---

### `uni gslides add-table`

Add a table to a slide

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Presentation ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--slide` | -s | string |  | Slide number (1-indexed). Default: last slide |
| `--rows` | -r | string |  | Number of rows (default: 3) |
| `--cols` | -c | string |  | Number of columns (default: 3) |
| `--x` |  | string |  | X position in points (default: 50) |
| `--y` |  | string |  | Y position in points (default: 100) |
| `--width` | -w | string |  | Width in points (default: 400) |
| `--height` | -h | string |  | Height in points (default: 200) |

**Examples:**

```bash
uni gslides add-table ID --rows 3 --cols 4
uni gslides add-table ID --slide 2 --rows 5 --cols 2
uni gslides add-table ID --rows 2 --cols 3 --x 100 --y 150 --width 300
```

---

### `uni gslides background`

Set slide background color or image

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Presentation ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--slide` | -s | string |  | Slide number (1-indexed). Default: all slides |
| `--color` | -c | string |  | Background color (hex or name) |
| `--image` | -i | string |  | Background image URL |

**Examples:**

```bash
uni gslides background ID --color blue
uni gslides background ID --slide 1 --color "#FF5500"
uni gslides background ID --slide 2 --image "https://example.com/bg.jpg"
uni gslides background ID --color white
```

---

### `uni gslides format-text`

Format text in a shape element

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Presentation ID or URL |
| `elementId` | Yes | Element (shape/textbox) ID |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--bold` | -b | boolean |  | Make text bold |
| `--italic` | -i | boolean |  | Make text italic |
| `--underline` | -u | boolean |  | Underline text |
| `--strike` |  | boolean |  | Strikethrough text |
| `--size` | -s | string |  | Font size in points |
| `--color` | -c | string |  | Text color (hex or name) |
| `--font` | -f | string |  | Font family |
| `--start` |  | string |  | Start index (default: all text) |
| `--end` |  | string |  | End index (default: all text) |

**Examples:**

```bash
uni gslides format-text ID textbox_123 --bold
uni gslides format-text ID shape_456 --size 24 --color red
uni gslides format-text ID element_789 --font "Arial" --italic
uni gslides format-text ID textbox_123 --bold --start 0 --end 10
```

---

### `uni gslides delete-element`

Delete a page element (shape, image, table, etc.)

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Presentation ID or URL |
| `elementId` | Yes | Element ID to delete |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--force` | -f | boolean |  | Skip confirmation |

**Examples:**

```bash
uni gslides delete-element ID textbox_123
uni gslides delete-element ID shape_456 --force
uni gslides delete-element ID image_789
```

---

### `uni gslides transform`

Move or resize a page element

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Presentation ID or URL |
| `elementId` | Yes | Element ID to transform |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--x` |  | string |  | X position in points |
| `--y` |  | string |  | Y position in points |
| `--scale-x` |  | string |  | Scale factor for width (1 = 100%) |
| `--scale-y` |  | string |  | Scale factor for height (1 = 100%) |

**Examples:**

```bash
uni gslides transform ID shape_123 --x 200 --y 150
uni gslides transform ID textbox_456 --scale-x 1.5 --scale-y 1.5
uni gslides transform ID image_789 --x 100 --y 100 --scale-x 0.5
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

### `uni gcontacts groups`

List and manage contact groups

**Aliases:** `group`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--create` | -c | string |  | Create a new group |
| `--delete` | -d | string |  | Delete a group by resource name |
| `--add-contact` | -a | string |  | Add contact to group (requires --group) |
| `--remove-contact` | -r | string |  | Remove contact from group (requires --group) |
| `--group` | -g | string |  | Group resource name for add/remove operations |

**Examples:**

```bash
uni gcontacts groups
uni gcontacts groups --create "Work Colleagues"
uni gcontacts groups --delete contactGroups/123
uni gcontacts groups --add-contact people/123 --group contactGroups/456
uni gcontacts groups --remove-contact people/123 --group contactGroups/456
```

---

### `uni gcontacts export`

Export contacts as vCard format

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | string |  | Number of contacts to export (default: 100) |

**Examples:**

```bash
uni gcontacts export
uni gcontacts export --limit 50
uni gcontacts export > contacts.vcf
```

---

### `uni gcontacts batch-delete`

Delete multiple contacts at once

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `resourceNames` | Yes | Contact resource names (comma-separated) |

**Examples:**

```bash
uni gcontacts batch-delete "people/123,people/456,people/789"
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
| `--all` | -a | boolean | `true` | Search all mail (default: true for AI agents) |
| `--primary` | -p | boolean | `false` | Limit to primary inbox only |

**Examples:**

```bash
uni gmail search "flight booking"
uni gmail search "indigo PNR"
uni gmail search "invoice" -n 20
uni gmail search "newsletter" --primary
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

### `uni gmail labels`

List and manage labels

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--create` | -c | string |  | Create a new label |
| `--delete` | -d | string |  | Delete a label by ID |
| `--add` | -a | string |  | Add label to message (requires --message) |
| `--remove` | -r | string |  | Remove label from message (requires --message) |
| `--message` | -m | string |  | Message ID for add/remove operations |

**Examples:**

```bash
uni gmail labels
uni gmail labels --create "Important/Work"
uni gmail labels --delete Label_123
uni gmail labels --add Label_123 --message MSG_ID
uni gmail labels --remove Label_123 --message MSG_ID
```

---

### `uni gmail draft`

Create and manage drafts

**Aliases:** `drafts`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--create` | -c | boolean |  | Create a new draft |
| `--to` | -t | string |  | Recipient email (for create) |
| `--subject` | -s | string |  | Subject (for create) |
| `--body` | -b | string |  | Body text (for create) |
| `--delete` | -d | string |  | Delete draft by ID |
| `--send` |  | string |  | Send draft by ID |
| `--view` | -v | string |  | View draft by ID |
| `--limit` | -n | string |  | Number of drafts to list (default: 10) |

**Examples:**

```bash
uni gmail draft
uni gmail draft --create --to "user@example.com" --subject "Hello" --body "Message"
uni gmail draft --view DRAFT_ID
uni gmail draft --send DRAFT_ID
uni gmail draft --delete DRAFT_ID
```

---

### `uni gmail reply`

Reply to an email

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `messageId` | Yes | Message ID to reply to |
| `body` | Yes | Reply message body |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--all` | -a | boolean |  | Reply all (include all recipients) |

**Examples:**

```bash
uni gmail reply MSG_ID "Thanks for your email!"
uni gmail reply MSG_ID "Got it, thanks!" --all
```

---

### `uni gmail forward`

Forward an email

**Aliases:** `fwd`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `messageId` | Yes | Message ID to forward |
| `to` | Yes | Recipient email address |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--message` | -m | string |  | Additional message to include |

**Examples:**

```bash
uni gmail forward MSG_ID "user@example.com"
uni gmail forward MSG_ID "user@example.com" --message "FYI - see below"
```

---

### `uni gmail star`

Star or unstar an email

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `messageId` | Yes | Message ID |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--remove` | -r | boolean |  | Unstar the message |

**Examples:**

```bash
uni gmail star MSG_ID
uni gmail star MSG_ID --remove
```

---

### `uni gmail mark`

Mark email as read or unread

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `messageId` | Yes | Message ID |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--read` | -r | boolean |  | Mark as read |
| `--unread` | -u | boolean |  | Mark as unread |

**Examples:**

```bash
uni gmail mark MSG_ID --read
uni gmail mark MSG_ID --unread
```

---

### `uni gmail archive`

Archive or unarchive an email

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `messageId` | Yes | Message ID |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--undo` | -u | boolean |  | Unarchive (move back to inbox) |

**Examples:**

```bash
uni gmail archive MSG_ID
uni gmail archive MSG_ID --undo
```

---

### `uni gmail threads`

List and view email threads

**Aliases:** `thread`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `threadId` | No | Thread ID to view (optional) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--query` | -q | string |  | Search query |
| `--limit` | -n | string |  | Number of threads (default: 20) |

**Examples:**

```bash
uni gmail threads
uni gmail threads --query "from:boss@company.com"
uni gmail threads THREAD_ID
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

### `uni reddit user`

View a Reddit user profile and activity

**Aliases:** `u`, `profile`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `username` | Yes | Reddit username |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--posts` | -p | boolean |  | Show recent posts |
| `--comments` | -c | boolean |  | Show recent comments |
| `--limit` | -n | string |  | Number of items (default: 5) |

**Examples:**

```bash
uni reddit user spez
uni reddit user spez --posts
uni reddit user spez --comments --limit 10
```

---

### `uni reddit subreddit`

View subreddit information

**Aliases:** `sub`, `info`, `about`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `subreddit` | Yes | Subreddit name (without r/) |

**Examples:**

```bash
uni reddit subreddit programming
uni reddit subreddit AskReddit
uni reddit sub rust
```

---

### `uni reddit comments`

View comments on a Reddit post

**Aliases:** `c`, `discussion`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `postId` | Yes | Post ID |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | string |  | Number of top-level comments to show |

**Examples:**

```bash
uni reddit comments 1abc2de
uni reddit comments 1abc2de --limit 20
```

---

### `uni reddit rising`

Get rising posts from a subreddit

**Aliases:** `rise`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `subreddit` | Yes | Subreddit name (without r/) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | string |  | Number of posts (default: 10) |

**Examples:**

```bash
uni reddit rising programming
uni reddit rising AskReddit -n 20
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

### `uni gmeet get`

Get meeting details

**Aliases:** `view`, `show`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `eventId` | Yes | Meeting/event ID |

**Examples:**

```bash
uni gmeet get EVENT_ID
```

---

### `uni gmeet update`

Update meeting title or time

**Aliases:** `edit`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `eventId` | Yes | Meeting/event ID |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--title` | -t | string |  | New title |
| `--date` | -d | string |  | New date/time (ISO format) |
| `--duration` |  | string |  | Duration in minutes |

**Examples:**

```bash
uni gmeet update EVENT_ID --title "Updated Meeting"
uni gmeet update EVENT_ID --date "2024-01-20T15:00:00"
uni gmeet update EVENT_ID --date "2024-01-20T15:00:00" --duration 60
```

---

### `uni gmeet invite`

Add or remove meeting attendees

**Aliases:** `attendees`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `eventId` | Yes | Meeting/event ID |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--add` | -a | string |  | Email(s) to add (comma-separated) |
| `--remove` | -r | string |  | Email to remove |

**Examples:**

```bash
uni gmeet invite EVENT_ID --add "user@example.com"
uni gmeet invite EVENT_ID --add "alice@example.com,bob@example.com"
uni gmeet invite EVENT_ID --remove "user@example.com"
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

### `uni gtasks move`

Move or reorder a task

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `taskId` | Yes | Task ID to move |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--list` | -l | string |  | Task list ID (default: @default) |
| `--parent` | -p | string |  | Parent task ID (makes it a subtask) |
| `--after` | -a | string |  | Task ID to position after |

**Examples:**

```bash
uni gtasks move TASK_ID --parent PARENT_TASK_ID
uni gtasks move TASK_ID --after OTHER_TASK_ID
uni gtasks move TASK_ID --list LIST_ID --parent PARENT_ID
```

---

### `uni gtasks clear`

Clear all completed tasks from a list

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--list` | -l | string |  | Task list ID (default: @default) |

**Examples:**

```bash
uni gtasks clear
uni gtasks clear --list LIST_ID
```

---

### `uni gtasks subtask`

Add a subtask under a parent task

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `parentId` | Yes | Parent task ID |
| `title` | Yes | Subtask title |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--list` | -l | string |  | Task list ID (default: @default) |
| `--notes` | -n | string |  | Task notes |
| `--due` | -d | string |  | Due date (YYYY-MM-DD) |

**Examples:**

```bash
uni gtasks subtask PARENT_ID "Subtask title"
uni gtasks subtask PARENT_ID "Subtask" --notes "Details here"
uni gtasks subtask PARENT_ID "Subtask" --due 2024-01-20
```

---

### `uni gtasks get`

Get task details

**Aliases:** `view`, `show`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `taskId` | Yes | Task ID |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--list` | -l | string |  | Task list ID (default: @default) |

**Examples:**

```bash
uni gtasks get TASK_ID
uni gtasks get TASK_ID --list LIST_ID
```

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

### `uni notion create`

Create a new page

**Aliases:** `new`, `add`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `title` | Yes | Page title |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--parent` | -p | string |  | Parent page ID |
| `--database` | -d | string |  | Database ID to add to |
| `--content` | -c | string |  | Initial content (paragraph) |

**Examples:**

```bash
uni notion create "Meeting Notes"
uni notion create "New Task" --database abc123
uni notion create "Ideas" --parent xyz789 --content "Initial thoughts here"
```

---

### `uni notion update`

Update page properties or archive

**Aliases:** `edit`, `modify`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `pageId` | Yes | Page ID |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--archive` | -a | boolean |  | Archive the page |
| `--unarchive` | -u | boolean |  | Unarchive the page |
| `--title` | -t | string |  | Update title |

**Examples:**

```bash
uni notion update abc123 --archive
uni notion update abc123 --unarchive
uni notion update abc123 --title "New Title"
```

---

### `uni notion blocks`

View and manage page content blocks

**Aliases:** `block`, `content`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `pageId` | Yes | Page or block ID |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--add` | -a | string |  | Add a paragraph block |
| `--heading` | -h | string |  | Add a heading block |
| `--todo` |  | string |  | Add a todo block |
| `--bullet` | -b | string |  | Add a bullet point |
| `--delete` | -d | string |  | Delete a block by ID |
| `--level` | -l | string |  | Heading level 1-3 (default: 1) |

**Examples:**

```bash
uni notion blocks abc123
uni notion blocks abc123 --add "New paragraph text"
uni notion blocks abc123 --heading "New Section" --level 2
uni notion blocks abc123 --todo "Task to complete"
uni notion blocks abc123 --bullet "List item"
uni notion blocks abc123 --delete block-id-123
```

---

### `uni notion append`

Quickly append text to a page

**Aliases:** `write`, `add-content`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `pageId` | Yes | Page ID |
| `content` | Yes | Text content to append |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--type` | -t | string |  | Block type: paragraph, heading, todo, bullet (default: paragraph) |

**Examples:**

```bash
uni notion append abc123 "New note content"
uni notion append abc123 "Important Task" --type todo
uni notion append abc123 "Section Title" --type heading
uni notion append abc123 "List item" --type bullet
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

### `uni slack threads`

Get thread replies

**Aliases:** `thread`, `replies`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `channel` | Yes | Channel name or ID |
| `threadTs` | Yes | Thread timestamp |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | string |  | Number of replies (default: 20) |

**Examples:**

```bash
uni slack threads general 1234567890.123456
uni slack threads C01234567 1234567890.123456 --limit 50
```

---

### `uni slack reactions`

Add or remove reactions from messages

**Aliases:** `react`, `emoji`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `channel` | Yes | Channel name or ID |
| `timestamp` | Yes | Message timestamp |
| `emoji` | Yes | Emoji name (without colons) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--remove` | -r | boolean |  | Remove reaction instead of adding |

**Examples:**

```bash
uni slack reactions general 1234567890.123456 thumbsup
uni slack reactions C01234567 1234567890.123456 fire
uni slack reactions general 1234567890.123456 thumbsup --remove
```

---

### `uni slack pins`

Pin, unpin, or list pinned messages

**Aliases:** `pin`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `channel` | Yes | Channel name or ID |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--add` | -a | string |  | Pin a message (timestamp) |
| `--remove` | -r | string |  | Unpin a message (timestamp) |

**Examples:**

```bash
uni slack pins general
uni slack pins general --add 1234567890.123456
uni slack pins general --remove 1234567890.123456
```

---

### `uni slack search`

Search messages (requires user token)

**Aliases:** `find`, `query`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | Yes | Search query |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | string |  | Number of results (default: 20) |

**Examples:**

```bash
uni slack search "deployment"
uni slack search "from:@john bug" --limit 50
uni slack search "in:#general meeting"
```

---

### `uni slack schedule`

Schedule messages for later

**Aliases:** `later`, `timer`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `channel` | Yes | Channel name or ID |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--message` | -m | string |  | Message to schedule |
| `--time` | -t | string |  | Unix timestamp or relative time (e.g., "+1h", "+30m") |
| `--list` | -l | boolean |  | List scheduled messages |
| `--delete` | -d | string |  | Delete a scheduled message by ID |
| `--thread` |  | string |  | Thread timestamp for threaded reply |

**Examples:**

```bash
uni slack schedule general --list
uni slack schedule general --message "Good morning!" --time "+1h"
uni slack schedule general -m "Reminder" -t 1700000000
uni slack schedule general --delete Q1234567890
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

### `uni gforms update`

Update form title or description

**Aliases:** `edit`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `formId` | Yes | Form ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--title` | -t | string |  | New title |
| `--description` | -d | string |  | New description |

**Examples:**

```bash
uni gforms update FORM_ID --title "New Title"
uni gforms update FORM_ID --description "Updated description"
```

---

### `uni gforms link`

Get form URLs (edit, respond, results)

**Aliases:** `links`, `url`, `urls`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `formId` | Yes | Form ID or URL |

**Examples:**

```bash
uni gforms link FORM_ID
```

---

### `uni gforms export`

Export form responses to CSV format

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `formId` | Yes | Form ID or URL |

**Examples:**

```bash
uni gforms export FORM_ID
uni gforms export FORM_ID > responses.csv
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

### `uni gcal calendars`

List all calendars

**Aliases:** `cals`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--create` | -c | string |  | Create a new calendar with this name |
| `--delete` | -d | string |  | Delete calendar by ID |
| `--description` |  | string |  | Description for new calendar |

**Examples:**

```bash
uni gcal calendars
uni gcal calendars --create "Work"
uni gcal calendars --create "Personal" --description "My personal events"
uni gcal calendars --delete CALENDAR_ID
```

---

### `uni gcal quick`

Quick add event using natural language

**Aliases:** `q`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `text` | Yes | Natural language event description |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--calendar` | -c | string |  | Calendar ID (default: primary) |

**Examples:**

```bash
uni gcal quick "Lunch with John tomorrow at noon"
uni gcal quick "Team meeting Friday 3pm-4pm"
uni gcal quick "Dentist appointment next Monday 10am" --calendar work
```

---

### `uni gcal freebusy`

Check free/busy times

**Aliases:** `fb`, `busy`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--days` | -d | string |  | Number of days to check (default: 1) |
| `--calendar` | -c | string |  | Calendar ID (default: primary) |
| `--start` | -s | string |  | Start date (YYYY-MM-DD, default: today) |

**Examples:**

```bash
uni gcal freebusy
uni gcal freebusy --days 7
uni gcal freebusy --start 2024-01-15 --days 3
```

---

### `uni gcal get`

Get event details

**Aliases:** `view`, `show`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `eventId` | Yes | Event ID |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--calendar` | -c | string |  | Calendar ID (default: primary) |

**Examples:**

```bash
uni gcal get EVENT_ID
uni gcal get EVENT_ID --calendar work
```

---

### `uni gcal move`

Move event to another calendar

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `eventId` | Yes | Event ID |
| `toCalendar` | Yes | Destination calendar ID |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--from` | -f | string |  | Source calendar ID (default: primary) |

**Examples:**

```bash
uni gcal move EVENT_ID work@group.calendar.google.com
uni gcal move EVENT_ID personal --from work
```

---

### `uni gcal invite`

Add or remove attendees from an event

**Aliases:** `attendees`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `eventId` | Yes | Event ID |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--add` | -a | string |  | Email(s) to add (comma-separated) |
| `--remove` | -r | string |  | Email to remove |
| `--calendar` | -c | string |  | Calendar ID (default: primary) |

**Examples:**

```bash
uni gcal invite EVENT_ID --add "john@example.com"
uni gcal invite EVENT_ID --add "alice@example.com,bob@example.com"
uni gcal invite EVENT_ID --remove "john@example.com"
```

---

### `uni gcal recurring`

Create a recurring event

**Aliases:** `repeat`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `title` | Yes | Event title |
| `datetime` | Yes | Start date/time (ISO or natural) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--duration` | -d | string |  | Duration in minutes (default: 60) |
| `--freq` | -f | string |  | Frequency: daily, weekly, monthly, yearly |
| `--count` | -n | string |  | Number of occurrences |
| `--until` | -u | string |  | End date (YYYY-MM-DD) |
| `--days` |  | string |  | Days of week for weekly (MO,TU,WE,TH,FR,SA,SU) |
| `--interval` | -i | string |  | Interval (e.g., 2 for every 2 weeks) |
| `--calendar` | -c | string |  | Calendar ID (default: primary) |
| `--location` | -l | string |  | Event location |

**Examples:**

```bash
uni gcal recurring "Daily Standup" "2024-01-15T09:00:00" --freq daily --count 30
uni gcal recurring "Weekly Team Meeting" "2024-01-15T14:00:00" --freq weekly --days MO,WE,FR
uni gcal recurring "Monthly Review" "2024-01-15T10:00:00" --freq monthly --until 2024-12-31
uni gcal recurring "Bi-weekly Sync" "2024-01-15T15:00:00" --freq weekly --interval 2
```

---

### `uni gcal remind`

Set reminders for an event

**Aliases:** `reminder`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `eventId` | Yes | Event ID |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--popup` | -p | string |  | Popup reminder minutes before (comma-separated) |
| `--email` | -e | string |  | Email reminder minutes before (comma-separated) |
| `--calendar` | -c | string |  | Calendar ID (default: primary) |

**Examples:**

```bash
uni gcal remind EVENT_ID --popup 10
uni gcal remind EVENT_ID --popup 10,30 --email 60
uni gcal remind EVENT_ID --popup "5,15,30" --email "60,1440"
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
| `--download` | -d | boolean | `false` | Download media for piping (slower) |

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

Delete messages by ID, range, or text search

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `chat` | Yes | Chat identifier (@username, phone, ID, or title) |
| `query` | Yes | Message ID, range (10645-10649), or text to search |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--revoke` | -r | boolean | `true` | Delete for everyone (default: true) |
| `--limit` | -n | number | `10` | Max messages to delete when searching by text (default: 10) |

**Examples:**

```bash
uni telegram delete me 12345
uni telegram delete me 10645-10649
uni telegram delete me "test message"
uni telegram delete @username 67890 --no-revoke
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

### `uni gdocs insert`

Insert text at position or insert image from URL

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Document ID or URL |
| `content` | Yes | Text to insert or image URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--at` | -a | string |  | Position: "start", "end", or index number (default: end) |
| `--image` | -i | boolean |  | Insert as image (content should be URL) |
| `--width` | -w | number |  | Image width in points (default: 400) |

**Examples:**

```bash
uni gdocs insert ID "New paragraph at end"
uni gdocs insert ID "Header text" --at start
uni gdocs insert ID "Middle text" --at 100
uni gdocs insert ID "https://example.com/image.png" --image
uni gdocs insert ID "https://example.com/logo.png" --image --width 200
```

---

### `uni gdocs find`

Find text in document, optionally replace

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Document ID or URL |
| `text` | Yes | Text to find |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--replace` | -r | string |  | Replace with this text |
| `--case` | -c | boolean |  | Case-sensitive search |

**Examples:**

```bash
uni gdocs find 1abc123XYZ "old text"
uni gdocs find 1abc123XYZ "TODO" --replace "DONE"
uni gdocs find 1abc123XYZ "Error" --case
```

---

### `uni gdocs clear`

Clear all content from document

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Document ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--force` | -f | boolean |  | Skip confirmation |

**Examples:**

```bash
uni gdocs clear 1abc123XYZ
uni gdocs clear 1abc123XYZ --force
```

---

### `uni gdocs import`

Import content from text file into document

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Document ID or URL |
| `file` | Yes | File path to import (.txt, .md) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--append` | -a | boolean |  | Append to existing content (default: replace) |
| `--at` |  | string |  | Insert position: "start", "end", or index (default: end for append) |

**Examples:**

```bash
uni gdocs import ID notes.txt
uni gdocs import ID readme.md --append
uni gdocs import ID content.txt --at start
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

### `uni gdocs delete`

Delete a document (moves to trash)

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Document ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--force` | -f | boolean |  | Skip confirmation |

**Examples:**

```bash
uni gdocs delete 1abc123XYZ
uni gdocs delete 1abc123XYZ --force
```

---

### `uni gdocs rename`

Rename a document

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Document ID or URL |
| `title` | Yes | New title |

**Examples:**

```bash
uni gdocs rename 1abc123XYZ "New Title"
uni gdocs rename 1abc123XYZ "Meeting Notes - Q1"
```

---

### `uni gdocs format`

Apply text formatting (bold, italic, underline, etc.)

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Document ID or URL |
| `start` | Yes | Start index |
| `end` | Yes | End index |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--bold` | -b | boolean |  | Make text bold |
| `--italic` | -i | boolean |  | Make text italic |
| `--underline` | -u | boolean |  | Underline text |
| `--strike` |  | boolean |  | Strikethrough text |
| `--size` | -s | string |  | Font size in points |
| `--color` | -c | string |  | Text color (hex or name) |
| `--bg` |  | string |  | Background color (hex or name) |
| `--font` | -f | string |  | Font family |

**Examples:**

```bash
uni gdocs format ID 1 10 --bold
uni gdocs format ID 5 20 --italic --underline
uni gdocs format ID 1 50 --size 14 --color red
uni gdocs format ID 10 30 --font "Arial" --bold
```

---

### `uni gdocs style`

Apply paragraph style (heading, alignment, spacing)

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Document ID or URL |
| `start` | Yes | Start index |
| `end` | Yes | End index |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--heading` | -h | string |  | Heading level: title, subtitle, 1-6, normal |
| `--align` | -a | string |  | Alignment: left, center, right, justified |
| `--line-spacing` |  | string |  | Line spacing (e.g., 100 for single, 200 for double) |
| `--space-above` |  | string |  | Space above paragraph (points) |
| `--space-below` |  | string |  | Space below paragraph (points) |
| `--indent` |  | string |  | First line indent (points) |

**Examples:**

```bash
uni gdocs style ID 1 20 --heading 1
uni gdocs style ID 1 50 --heading title --align center
uni gdocs style ID 10 100 --align justified --line-spacing 150
uni gdocs style ID 1 30 --heading 2 --space-below 12
```

---

### `uni gdocs bullets`

Create or remove bulleted/numbered lists

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Document ID or URL |
| `start` | Yes | Start index |
| `end` | Yes | End index |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--type` | -t | string |  | List type: bullet, numbered, checkbox, or remove |
| `--style` | -s | string |  | Bullet style: disc, diamond, arrow, star (for bullets) or decimal, alpha, roman (for numbered) |

**Examples:**

```bash
uni gdocs bullets ID 1 100 --type bullet
uni gdocs bullets ID 1 50 --type numbered
uni gdocs bullets ID 10 80 --type checkbox
uni gdocs bullets ID 1 100 --type bullet --style star
uni gdocs bullets ID 1 100 --type numbered --style roman
uni gdocs bullets ID 1 100 --type remove
```

---

### `uni gdocs table`

Insert a table or manage table rows/columns

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Document ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--insert` |  | boolean |  | Insert a new table |
| `--rows` | -r | string |  | Number of rows (for insert) |
| `--cols` | -c | string |  | Number of columns (for insert) |
| `--at` |  | string |  | Insert position (index) |
| `--add-row` |  | string |  | Add row at table (tableStartIndex:rowIndex) |
| `--add-col` |  | string |  | Add column at table (tableStartIndex:colIndex) |
| `--del-row` |  | string |  | Delete row from table (tableStartIndex:rowIndex) |
| `--del-col` |  | string |  | Delete column from table (tableStartIndex:colIndex) |

**Examples:**

```bash
uni gdocs table ID --insert --rows 3 --cols 4
uni gdocs table ID --insert --rows 5 --cols 2 --at 100
uni gdocs table ID --add-row 50:2
uni gdocs table ID --add-col 50:1
uni gdocs table ID --del-row 50:0
uni gdocs table ID --del-col 50:3
```

---

### `uni gdocs link`

Insert or remove hyperlinks from text

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Document ID or URL |
| `start` | Yes | Start index |
| `end` | Yes | End index |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--url` | -u | string |  | URL to link to |
| `--remove` | -r | boolean |  | Remove existing link |

**Examples:**

```bash
uni gdocs link ID 10 20 --url "https://example.com"
uni gdocs link ID 5 15 --url "https://google.com"
uni gdocs link ID 10 20 --remove
```

---

### `uni gdocs page-break`

Insert a page break

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Document ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--at` |  | string |  | Insert position (index). Default: end of document |

**Examples:**

```bash
uni gdocs page-break ID
uni gdocs page-break ID --at 100
uni gdocs page-break ID --at 50
```

---

### `uni gdocs header`

Add, update, or remove document header

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Document ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--text` | -t | string |  | Header text to add |
| `--remove` | -r | string |  | Header ID to remove |

**Examples:**

```bash
uni gdocs header ID --text "Company Name"
uni gdocs header ID --text "Confidential Document"
uni gdocs header ID --remove kix.abc123
```

---

### `uni gdocs footer`

Add, update, or remove document footer

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Document ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--text` | -t | string |  | Footer text to add |
| `--remove` | -r | string |  | Footer ID to remove |

**Examples:**

```bash
uni gdocs footer ID --text "Page 1"
uni gdocs footer ID --text "© 2025 Company"
uni gdocs footer ID --remove kix.xyz789
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

## uni wa

WhatsApp messaging (Baileys)

### `uni wa auth`

Authenticate with WhatsApp (pairing code)

**Examples:**

```bash
uni wa auth
```

---

### `uni wa logout`

Clear WhatsApp session

**Examples:**

```bash
uni wa logout
```

---

### `uni wa status`

Check WhatsApp daemon status

**Examples:**

```bash
uni wa status
```

---

### `uni wa stop`

Stop the WhatsApp daemon

**Examples:**

```bash
uni wa stop
```

---

### `uni wa chats`

List recent chats

**Aliases:** `list`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | number | `20` | Number of chats (default: 20) |

**Examples:**

```bash
uni wa chats
uni wa chats -n 10
```

---

### `uni wa read`

Read messages from a chat

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `chat` | Yes | Chat (phone number or "me") |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | number | `10` | Number of messages (default: 10) |

**Examples:**

```bash
uni wa read me
uni wa read 919876543210
uni wa read me -n 20
```

---

### `uni wa send`

Send a message

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `chat` | Yes | Chat (phone number or "me") |
| `message` | No | Message text |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--file` | -f | string |  | Attach file |
| `--reply` | -r | string |  | Reply to message ID |

**Examples:**

```bash
uni wa send me "Hello!"
uni wa send 919876543210 "Hi"
uni wa send me -f photo.jpg "Check this"
```

---

### `uni wa edit`

Edit a sent message

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `chat` | Yes | Chat (phone number or "me") |
| `messageId` | Yes | Message ID to edit |
| `newText` | Yes | New message text |

**Examples:**

```bash
uni wa edit me ABC123 "Fixed typo"
```

---

### `uni wa delete`

Delete a message

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `chat` | Yes | Chat (phone number or "me") |
| `messageId` | Yes | Message ID to delete |

**Examples:**

```bash
uni wa delete me ABC123
```

---

### `uni wa forward`

Forward a message to another chat

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `fromChat` | Yes | Source chat (phone number or "me") |
| `toChat` | Yes | Destination chat |
| `messageId` | Yes | Message ID to forward |

**Examples:**

```bash
uni wa forward me 919876543210 ABC123
uni wa forward 919876543210 me XYZ789
```

---

### `uni wa react`

React to a message with an emoji

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `chat` | Yes | Chat (phone number or "me") |
| `messageId` | Yes | Message ID to react to |
| `emoji` | No | Emoji to react with (empty to remove) |

**Examples:**

```bash
uni wa react me ABC123 "👍"
uni wa react 919876543210 XYZ789 "❤️"
uni wa react me ABC123 ""
```

---

### `uni wa search`

Search messages across chats

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | Yes | Search query |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--chat` | -c | string |  | Limit to specific chat |
| `--limit` | -n | number |  | Max results (default: 20) |

**Examples:**

```bash
uni wa search "meeting"
uni wa search "invoice" -c 919876543210
```

---

### `uni wa contacts`

List WhatsApp contacts

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | number |  | Max results (default: 50) |

**Examples:**

```bash
uni wa contacts
uni wa contacts -n 100
```

---

### `uni wa download`

Download media from a message

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `chat` | Yes | Chat (phone number or "me") |
| `messageId` | Yes | Message ID with media |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--output` | -o | string |  | Output file path |

**Examples:**

```bash
uni wa download me ABC123
uni wa download 919876543210 XYZ789 -o ~/Downloads/photo.jpg
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
| `--data` | -d | boolean |  | Dump all sheet data |
| `--tsv` |  | boolean |  | Output as TSV (for piping) |
| `--cells` |  | boolean |  | JSON output as cell-keyed object (e.g., {"A1": "value"}) |
| `--filter` | -f | string |  | Filter rows (e.g., "C>100", "A=foo AND B<50", "A=x OR A=y") |
| `--skip-blank` |  | boolean |  | Skip rows where all cells are blank (empty or whitespace-only) |
| `--trim` |  | boolean |  | Trim whitespace from cell values and remove trailing empty rows/columns |

**Examples:**

```bash
uni gsheets get 1abc123XYZ
uni gsheets get 1abc123XYZ A1:B10
uni gsheets get 1abc123XYZ --data
uni gsheets get 1abc123XYZ --data --tsv > data.tsv
uni gsheets get 1abc123XYZ A1:D100 --filter "C>100"
uni gsheets get 1abc123XYZ A1:D100 --filter "B>50 AND C<100"
uni gsheets get 1abc123XYZ A1:D100 --json --cells
uni gsheets get 1abc123XYZ --data --skip-blank
uni gsheets get 1abc123XYZ --data --trim
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

Set cell value(s)

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `range` | Yes | Cell or range (e.g., A1, B2:C5) |
| `value` | Yes | Value(s) - use | for columns, \n for rows |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets set ID A1 "Hello"
uni gsheets set ID B2 "=SUM(A1:A10)"
uni gsheets set ID A1:C1 "Name | Age | Email"
uni gsheets set ID A1:B3 "Header1|Header2\nVal1|Val2\nVal3|Val4"
uni gsheets set ID --sheet "Data" A1 "Value"
```

---

### `uni gsheets append`

Append row(s) to spreadsheet

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `values` | Yes | Values separated by | or , (use \n for multiple rows) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |
| `--range` | -r | string |  | Starting range (default: A:A) |

**Examples:**

```bash
uni gsheets append ID "Name | Age | Email"
uni gsheets append ID "John,Doe,john@example.com"
uni gsheets append ID "Row1|Data|Here\nRow2|More|Data"
uni gsheets append ID --sheet "Data" "Item | 100 | In Stock"
```

---

### `uni gsheets clear`

Clear cell values in a range (keeps formatting)

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `range` | Yes | Cell range to clear (e.g., A1:Z100) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets clear ID A1:Z100
uni gsheets clear ID B2:D50 --sheet "Data"
uni gsheets clear ID A:A
```

---

### `uni gsheets share`

Share spreadsheet (with email or publicly)

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `target` | Yes | Email address or "anyone" for public link |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--role` | -r | string | `writer` | Permission role: reader or writer (default: writer) |

**Examples:**

```bash
uni gsheets share ID colleague@company.com
uni gsheets share ID viewer@example.com --role reader
uni gsheets share ID anyone
uni gsheets share ID anyone --role reader
```

---

### `uni gsheets copy`

Duplicate a sheet within the spreadsheet

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `newName` | Yes | Name for the copy |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--sheet` | -s | string |  | Source sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets copy ID "Sheet1 Copy"
uni gsheets copy ID "Backup" --sheet "Data"
uni gsheets copy ID "Template Copy" -s "Template"
```

---

### `uni gsheets sheets`

Manage worksheets (tabs) in a spreadsheet

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `action` | No | Action: list (default), add, rename, delete |
| `name` | No | Sheet name (for add/rename) or sheet ID (for delete) |
| `newName` | No | New name (for rename only) |

**Examples:**

```bash
uni gsheets sheets ID
uni gsheets sheets ID list
uni gsheets sheets ID add "New Sheet"
uni gsheets sheets ID rename "Sheet1" "Data"
uni gsheets sheets ID delete 123456789
```

---

### `uni gsheets format`

Apply formatting to cells

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `range` | Yes | Cell range (e.g., A1:B10) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |
| `--bold` | -b | boolean |  | Make text bold |
| `--italic` | -i | boolean |  | Make text italic |
| `--size` |  | string |  | Font size (e.g., 12) |
| `--bg` |  | string |  | Background color (name or hex) |
| `--color` | -c | string |  | Text color (name or hex) |
| `--header-row` |  | boolean |  | Format first row as header (bold, blue bg, white text) |
| `--alternating` |  | boolean |  | Apply alternating row colors (zebra striping) |

**Examples:**

```bash
uni gsheets format ID A1:B1 --bold
uni gsheets format ID A1:C10 --bg yellow
uni gsheets format ID D1:D100 --color red --italic
uni gsheets format ID A1 --bold --size 14 --bg "#4285f4" --color white
uni gsheets format ID A1:D20 --header-row --alternating
uni gsheets format ID A1:Z100 --header-row
```

---

### `uni gsheets chart`

Create a chart from data range

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `range` | Yes | Data range for values (e.g., B1:B10) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |
| `--type` | -t | string |  | Chart type: bar, line, pie, column, area, scatter (default: column) |
| `--title` |  | string |  | Chart title |
| `--labels` | -l | string |  | Labels/x-axis range (e.g., A1:A10) |
| `--position` | -p | string |  | Anchor cell for chart position (e.g., I2) |
| `--width` | -w | number |  | Chart width in pixels (default: 600) |
| `--height` | -h | number |  | Chart height in pixels (default: 371) |
| `--legend` |  | string |  | Legend position: top, bottom, left, right, none (default: bottom) |

**Examples:**

```bash
uni gsheets chart ID B1:B10 --labels A1:A10
uni gsheets chart ID B1:C20 --labels A1:A20 --type bar --title "Sales"
uni gsheets chart ID --sheet "Data" E1:E50 -l D1:D50 --type line
uni gsheets chart ID B1:B5 --labels A1:A5 --type pie --title "Distribution"
uni gsheets chart ID B1:C10 --position I2 --width 800 --height 400
uni gsheets chart ID B1:B10 --sheet "Charts" --legend right --title "Revenue"
```

---

### `uni gsheets charts`

List all charts in a spreadsheet

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--sheet` | -s | string |  | Filter by sheet name |

**Examples:**

```bash
uni gsheets charts ID
uni gsheets charts ID --sheet "Dashboard"
```

---

### `uni gsheets chart-delete`

Delete a chart from spreadsheet

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `chartId` | Yes | Chart ID to delete (use "charts" command to list) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--force` | -f | boolean |  | Skip confirmation |

**Examples:**

```bash
uni gsheets chart-delete ID 123456789
uni gsheets chart-delete ID 123456789 --force
```

---

### `uni gsheets chart-move`

Move or resize an existing chart

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `chartId` | Yes | Chart ID to move |
| `position` | Yes | New anchor cell (e.g., I2) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--width` | -w | number |  | New width in pixels |
| `--height` | -h | number |  | New height in pixels |

**Examples:**

```bash
uni gsheets chart-move ID 123456789 I2
uni gsheets chart-move ID 123456789 A20 --width 800 --height 400
```

---

### `uni gsheets compare`

Add comparison formulas between columns

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `range` | Yes | Data range with 2+ columns (e.g., A1:B10) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |
| `--type` | -t | string |  | Comparison type: diff, percent, change (default: percent) |
| `--header` | -h | string |  | Header for new column (default: "Change") |
| `--direction` | -d | string |  | higher = higher is better (TPS), lower = lower is better (latency). Default: lower |

**Examples:**

```bash
uni gsheets compare ID A1:B10
uni gsheets compare ID A1:B10 --type diff --header "Difference"
uni gsheets compare ID C1:D20 --type percent --header "% Change"
uni gsheets compare ID A1:B10 --direction higher
uni gsheets compare ID --sheet "Data" E1:F50 --direction lower
```

---

### `uni gsheets import`

Import CSV/TSV file into spreadsheet

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `file` | Yes | Path to CSV or TSV file |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |
| `--range` | -r | string |  | Starting cell (default: A1) |
| `--delimiter` | -d | string |  | Delimiter: comma, tab, pipe (default: auto-detect) |
| `--append` | -a | boolean |  | Append to existing data instead of overwriting |

**Examples:**

```bash
uni gsheets import ID data.csv
uni gsheets import ID data.tsv --range B2
uni gsheets import ID export.csv --sheet "Import" --append
uni gsheets import ID data.txt --delimiter pipe
```

---

### `uni gsheets export`

Export spreadsheet data to CSV/TSV file

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `output` | Yes | Output file path (e.g., data.csv) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |
| `--range` | -r | string |  | Range to export (default: all data) |
| `--format` | -f | string |  | Format: csv, tsv (default: auto from filename) |
| `--force` |  | boolean |  | Overwrite existing file without warning |

**Examples:**

```bash
uni gsheets export 1abc123XYZ data.csv
uni gsheets export 1abc123XYZ data.tsv --sheet "Sales"
uni gsheets export 1abc123XYZ output.csv --range A1:D100
uni gsheets export 1abc123XYZ data.txt --format csv
uni gsheets export 1abc123XYZ data.csv --force
```

---

### `uni gsheets delete`

Delete a spreadsheet (moves to trash)

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--force` | -f | boolean |  | Skip confirmation |

**Examples:**

```bash
uni gsheets delete 1abc123XYZ
uni gsheets delete 1abc123XYZ --force
```

---

### `uni gsheets rename`

Rename a spreadsheet

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `newName` | Yes | New name for the spreadsheet |

**Examples:**

```bash
uni gsheets rename 1abc123XYZ "New Name"
uni gsheets rename 1abc123XYZ "Budget 2025"
```

---

### `uni gsheets sort`

Sort data in a range by column

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `range` | Yes | Range to sort (e.g., A1:D100) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |
| `--col` | -c | string |  | Column to sort by (e.g., B). Default: first column |
| `--desc` |  | boolean |  | Sort descending (default: ascending) |
| `--header` |  | boolean |  | First row is header (exclude from sort) |

**Examples:**

```bash
uni gsheets sort ID A1:D100 --col B
uni gsheets sort ID A1:Z50 --col C --desc
uni gsheets sort ID A1:D100 --col B --header
uni gsheets sort ID --sheet "Data" A1:E200 --col A
```

---

### `uni gsheets stats`

Calculate statistics (sum, avg, min, max, count) for a range

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `range` | Yes | Range to analyze (e.g., B2:B100) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets stats ID B2:B100
uni gsheets stats ID C1:C500 --sheet "Sales"
uni gsheets stats ID "Revenue!D2:D1000"
```

---

### `uni gsheets find`

Find text in spreadsheet, optionally replace

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `search` | Yes | Text to search for |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |
| `--range` | -r | string |  | Range to search (default: all) |
| `--replace` |  | string |  | Replace matches with this text |
| `--case` |  | boolean |  | Case-sensitive search |
| `--whole` |  | boolean |  | Match whole cell only |
| `--regex` | -E | boolean |  | Treat search as regular expression |

**Examples:**

```bash
uni gsheets find ID "old text"
uni gsheets find ID "error" --sheet "Logs"
uni gsheets find ID "old" --replace "new"
uni gsheets find ID "TODO" --case --whole
uni gsheets find ID "2024" --range A1:A100 --replace "2025"
uni gsheets find ID "\d{4}-\d{2}-\d{2}" --regex
uni gsheets find ID "^Error:" --regex --replace "Warning:"
```

---

### `uni gsheets note`

Add, view, or remove cell notes (comments)

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `cell` | Yes | Cell reference or range (e.g., A1, A1:A5) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |
| `--set` |  | string |  | Set note text (applies to all cells in range) |
| `--remove` | -r | boolean |  | Remove note from cell(s) |

**Examples:**

```bash
uni gsheets note ID A1
uni gsheets note ID B2 --set "Remember to update this"
uni gsheets note ID A1:A5 --set "Same note on all cells"
uni gsheets note ID C3 --remove
uni gsheets note ID A1:B10 --remove
uni gsheets note ID --sheet "Data" D4 --set "Important value"
```

---

### `uni gsheets cond-format`

Apply or manage conditional formatting rules

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `range` | No | Range to format (e.g., B2:B100) - not required for --list or --remove |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |
| `--type` | -t | string |  | Rule type: gt, lt, eq, ne, empty, not-empty, contains, between (default: gt) |
| `--value` | -v | string |  | Value to compare (required for most types) |
| `--value2` |  | string |  | Second value (for "between" type) |
| `--bg` |  | string |  | Background color: red, green, blue, yellow, orange, purple, pink, gray |
| `--color` |  | string |  | Text color: red, green, blue, yellow, orange, purple, pink, white |
| `--bold` |  | boolean |  | Make text bold |
| `--list` | -l | boolean |  | List all conditional formatting rules |
| `--remove` | -r | string |  | Remove rule by index (use --list to see indices) |

**Examples:**

```bash
uni gsheets cond-format ID B2:B100 --type gt --value 100 --bg green
uni gsheets cond-format ID C2:C50 --type lt --value 0 --bg red --bold
uni gsheets cond-format ID A1:A100 --type empty --bg yellow
uni gsheets cond-format ID D1:D50 --type contains --value "error" --bg red --color white
uni gsheets cond-format ID E2:E100 --type between --value 10 --value2 50 --bg blue
uni gsheets cond-format ID --list
uni gsheets cond-format ID --remove 0
```

---

### `uni gsheets merge`

Merge or unmerge cells

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `range` | Yes | Range to merge (e.g., A1:C1) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |
| `--unmerge` | -u | boolean |  | Unmerge cells instead of merging |
| `--type` | -t | string |  | Merge type: all, horizontal, vertical (default: all) |

**Examples:**

```bash
uni gsheets merge ID A1:C1
uni gsheets merge ID A1:A5 --type vertical
uni gsheets merge ID B2:D2 --type horizontal
uni gsheets merge ID A1:C3 --unmerge
```

---

### `uni gsheets protect`

Protect a sheet or range from editing

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--sheet` | -s | string |  | Sheet name to protect (default: first sheet) |
| `--range` | -r | string |  | Range to protect (protects entire sheet if not specified) |
| `--description` | -d | string |  | Description for the protection |
| `--warning` | -w | boolean |  | Show warning when editing instead of blocking |
| `--list` | -l | boolean |  | List existing protections |

**Examples:**

```bash
uni gsheets protect ID --sheet "Data"
uni gsheets protect ID --range A1:B10 --description "Header row"
uni gsheets protect ID --sheet "Summary" --warning
uni gsheets protect ID --list
```

---

### `uni gsheets named-range`

Manage named ranges

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--list` | -l | boolean |  | List all named ranges |
| `--add` | -a | string |  | Add named range (name) |
| `--range` | -r | string |  | Range for add/update (e.g., A1:D10) |
| `--remove` |  | string |  | Remove named range by name or ID |
| `--update` | -u | string |  | Update named range (name or ID) |
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets named-range ID --list
uni gsheets named-range ID --add "DataRange" --range A1:D100
uni gsheets named-range ID --remove "DataRange"
uni gsheets named-range ID --update "DataRange" --range A1:E200
```

---

### `uni gsheets validate`

Set data validation rules on cells

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `range` | Yes | Cell range (e.g., A1:A100) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--type` | -t | string |  | Validation type: list, number, date, checkbox, text, custom |
| `--values` | -v | string |  | Comma-separated values for list validation |
| `--min` |  | string |  | Minimum value for number validation |
| `--max` |  | string |  | Maximum value for number validation |
| `--operator` | -o | string |  | Operator: gt, gte, lt, lte, eq, ne, between |
| `--date` | -d | string |  | Date value (YYYY-MM-DD) |
| `--date2` |  | string |  | Second date for between operator |
| `--date-op` |  | string |  | Date operator: before, after, on, between |
| `--formula` | -f | string |  | Custom formula (e.g., =A1>0) |
| `--message` | -m | string |  | Input message to show user |
| `--strict` |  | boolean |  | Reject invalid data (default: true) |
| `--no-dropdown` |  | boolean |  | Hide dropdown UI for list validation |
| `--clear` | -c | boolean |  | Clear validation from range |
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets validate ID A1:A100 --type list --values "Yes,No,Maybe"
uni gsheets validate ID B1:B50 --type number --min 0 --max 100
uni gsheets validate ID C1:C100 --type number --operator gt --min 0
uni gsheets validate ID D1:D50 --type date --date-op after --date 2024-01-01
uni gsheets validate ID E1:E100 --type checkbox
uni gsheets validate ID F1:F50 --type custom --formula "=LEN(F1)<=100"
uni gsheets validate ID A1:A100 --clear
```

---

### `uni gsheets freeze`

Freeze rows and/or columns

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--rows` | -r | string |  | Number of rows to freeze |
| `--cols` | -c | string |  | Number of columns to freeze |
| `--clear` |  | boolean |  | Unfreeze all rows and columns |
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets freeze ID --rows 1
uni gsheets freeze ID --cols 2
uni gsheets freeze ID --rows 1 --cols 1
uni gsheets freeze ID --clear
uni gsheets freeze ID --sheet "Data" --rows 2
```

---

### `uni gsheets border`

Set cell borders

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `range` | Yes | Cell range (e.g., A1:D10) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--all` | -a | boolean |  | Apply border to all sides and inner lines |
| `--outer` | -o | boolean |  | Apply border to outer edges only |
| `--inner` | -i | boolean |  | Apply border to inner lines only |
| `--top` |  | boolean |  | Apply border to top |
| `--bottom` |  | boolean |  | Apply border to bottom |
| `--left` |  | boolean |  | Apply border to left |
| `--right` |  | boolean |  | Apply border to right |
| `--style` | -s | string |  | Border style: solid, solid-medium, solid-thick, dashed, dotted, double |
| `--color` | -c | string |  | Border color (name or hex) |
| `--clear` |  | boolean |  | Clear all borders |
| `--sheet` |  | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets border ID A1:D10 --all
uni gsheets border ID A1:D10 --all --style solid-thick --color blue
uni gsheets border ID A1:D10 --outer --style double
uni gsheets border ID A1:D10 --inner --style dashed --color gray
uni gsheets border ID A1:D10 --top --bottom --style solid
uni gsheets border ID A1:D10 --clear
```

---

### `uni gsheets resize`

Auto-resize or manually set row/column sizes

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--cols` | -c | string |  | Column range to resize (e.g., A:D, A) |
| `--rows` | -r | string |  | Row range to resize (e.g., 1:10, 5) |
| `--size` | -p | string |  | Pixel size (if not specified, auto-fit to content) |
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets resize ID --cols A:D
uni gsheets resize ID --cols A:Z
uni gsheets resize ID --rows 1:10
uni gsheets resize ID --cols B --size 200
uni gsheets resize ID --rows 1:5 --size 50
```

---

### `uni gsheets hide`

Hide or show rows/columns

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--cols` | -c | string |  | Column range to hide/show (e.g., B:D, C) |
| `--rows` | -r | string |  | Row range to hide/show (e.g., 5:10, 3) |
| `--show` | -s | boolean |  | Show instead of hide |
| `--sheet` |  | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets hide ID --cols B:D
uni gsheets hide ID --rows 5:10
uni gsheets hide ID --cols C
uni gsheets hide ID --cols B:D --show
uni gsheets hide ID --rows 5:10 --show
```

---

### `uni gsheets insert`

Insert rows or columns

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--rows` | -r | string |  | Row number to insert at (1-indexed) |
| `--cols` | -c | string |  | Column letter to insert at (e.g., B) |
| `--count` | -n | string |  | Number of rows/columns to insert (default: 1) |
| `--inherit` | -i | boolean |  | Inherit formatting from row/column before |
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets insert ID --rows 5
uni gsheets insert ID --rows 5 --count 3
uni gsheets insert ID --cols B
uni gsheets insert ID --cols C --count 2
uni gsheets insert ID --rows 10 --inherit
```

---

### `uni gsheets delete-rows`

Delete rows from spreadsheet

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `range` | Yes | Row range to delete (e.g., 5:10, 3) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets delete-rows ID 5
uni gsheets delete-rows ID 5:10
uni gsheets delete-rows ID 100:150 --sheet "Data"
```

---

### `uni gsheets delete-cols`

Delete columns from spreadsheet

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `range` | Yes | Column range to delete (e.g., B:D, C) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets delete-cols ID B
uni gsheets delete-cols ID B:D
uni gsheets delete-cols ID E:G --sheet "Data"
```

---

### `uni gsheets filter`

Set or clear basic filter (dropdown filters)

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `range` | No | Range to filter (e.g., A1:D100) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--clear` | -c | boolean |  | Clear existing filter |
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets filter ID A1:D100
uni gsheets filter ID --clear
uni gsheets filter ID
```

---

### `uni gsheets filter-view`

Manage saved filter views

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--list` | -l | boolean |  | List all filter views |
| `--add` | -a | string |  | Add filter view with name |
| `--range` | -r | string |  | Range for new filter view (e.g., A1:D100) |
| `--remove` |  | string |  | Remove filter view by ID |
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets filter-view ID --list
uni gsheets filter-view ID --add "My Filter" --range A1:E100
uni gsheets filter-view ID --remove 123456789
```

---

### `uni gsheets copy-paste`

Copy and paste a range to another location

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `source` | Yes | Source range (e.g., A1:B10) |
| `dest` | Yes | Destination cell (e.g., D1) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--type` | -t | string |  | Paste type: normal, values, format, formula, validation, conditional |
| `--sheet` | -s | string |  | Source sheet name (default: first sheet) |
| `--dest-sheet` |  | string |  | Destination sheet name (default: same as source) |

**Examples:**

```bash
uni gsheets copy-paste ID A1:B10 D1
uni gsheets copy-paste ID A1:C5 A10 --type values
uni gsheets copy-paste ID A1:D10 A1 --sheet "Sheet1" --dest-sheet "Sheet2"
uni gsheets copy-paste ID B2:E5 G2 --type format
```

---

### `uni gsheets group`

Create collapsible row/column groups

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--rows` | -r | string |  | Row range to group (e.g., 5:10) |
| `--cols` | -c | string |  | Column range to group (e.g., B:D) |
| `--ungroup` | -u | boolean |  | Remove group instead of creating |
| `--collapse` |  | boolean |  | Collapse the group |
| `--expand` |  | boolean |  | Expand the group |
| `--list` | -l | boolean |  | List all groups |
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets group ID --rows 5:10
uni gsheets group ID --cols B:D
uni gsheets group ID --rows 5:10 --ungroup
uni gsheets group ID --rows 5:10 --collapse
uni gsheets group ID --rows 5:10 --expand
uni gsheets group ID --list
```

---

### `uni gsheets pivot`

Create a pivot table

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `source` | Yes | Source data range (e.g., A1:E100) |
| `dest` | Yes | Destination cell (e.g., G1) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--rows` | -r | string |  | Row grouping columns (0-indexed, comma-separated) |
| `--cols` | -c | string |  | Column grouping columns (0-indexed, comma-separated) |
| `--values` | -v | string |  | Value columns with function (e.g., "2:SUM,3:AVERAGE") |
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets pivot ID A1:E100 G1 --rows 0 --values "2:SUM"
uni gsheets pivot ID A1:D50 F1 --rows 0,1 --cols 2 --values "3:SUM"
uni gsheets pivot ID A1:E100 G1 --rows 0 --values "2:COUNT,3:AVERAGE"
```

---

### `uni gsheets hyperlink`

Add or remove hyperlinks from cells

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `range` | Yes | Cell or range (e.g., A1, A1:A10) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--url` | -u | string |  | URL to link to |
| `--clear` | -c | boolean |  | Remove hyperlink |
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets hyperlink ID A1 --url "https://example.com"
uni gsheets hyperlink ID B2:B10 --url "https://google.com"
uni gsheets hyperlink ID A1 --clear
```

---

### `uni gsheets number-format`

Set number format on cells (currency, percent, date, etc.)

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `range` | Yes | Cell or range (e.g., A1, B1:B100) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--type` | -t | string |  | Format type: number, currency, percent, date, time, datetime, text, scientific |
| `--pattern` | -p | string |  | Custom pattern (e.g., "$#,##0.00", "0.00%") |
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets number-format ID B1:B100 --type currency
uni gsheets number-format ID C1:C50 --type percent
uni gsheets number-format ID D1:D100 --type date
uni gsheets number-format ID E1:E50 --type number --pattern "#,##0.00"
uni gsheets number-format ID F1:F100 --type currency --pattern "$#,##0.00"
```

---

### `uni gsheets align`

Set text alignment in cells

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `range` | Yes | Cell or range (e.g., A1, A1:D10) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--horizontal` | -h | string |  | Horizontal alignment: left, center, right |
| `--vertical` | -v | string |  | Vertical alignment: top, middle, bottom |
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets align ID A1:D10 --horizontal center
uni gsheets align ID B1:B100 --vertical middle
uni gsheets align ID A1:Z1 --horizontal center --vertical middle
```

---

### `uni gsheets wrap`

Set text wrapping strategy for cells

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `range` | Yes | Cell or range (e.g., A1, A1:D10) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--strategy` | -t | string |  | Wrap strategy: wrap, overflow, clip |
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets wrap ID A1:D100 --strategy wrap
uni gsheets wrap ID B2:B50 --strategy clip
uni gsheets wrap ID C1:C10 --strategy overflow
```

---

### `uni gsheets rotate`

Rotate text in cells

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `range` | Yes | Cell or range (e.g., A1, A1:Z1) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--angle` | -a | string |  | Rotation angle (-90 to 90 degrees) |
| `--vertical` | -v | boolean |  | Stack text vertically |
| `--clear` | -c | boolean |  | Clear rotation (reset to 0) |
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets rotate ID A1:Z1 --angle 45
uni gsheets rotate ID A1:A10 --angle -90
uni gsheets rotate ID B1:B5 --vertical
uni gsheets rotate ID A1:Z1 --clear
```

---

### `uni gsheets chart-update`

Update chart title or properties

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `chartId` | Yes | Chart ID to update |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--title` | -t | string |  | New chart title |

**Examples:**

```bash
uni gsheets chart-update ID 123456 --title "Sales Report 2024"
uni gsheets chart-update ID 789 --title "Monthly Revenue"
```

---

### `uni gsheets unprotect`

Remove protection from a range

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `protectedRangeId` | No | Protected range ID to remove (not needed with --list) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--list` | -l | boolean |  | List all protected ranges instead |

**Examples:**

```bash
uni gsheets unprotect ID --list
uni gsheets unprotect ID 123456
```

---

### `uni gsheets slicer`

Add, list, or delete slicers (interactive filters)

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--add` | -a | boolean |  | Add a new slicer |
| `--list` | -l | boolean |  | List all slicers |
| `--delete` | -d | string |  | Delete slicer by ID |
| `--anchor` |  | string |  | Anchor cell for slicer (e.g., E1) |
| `--data-range` |  | string |  | Data range to filter (e.g., A1:D100) |
| `--column` | -c | string |  | Column index to filter (0-based) |
| `--title` | -t | string |  | Slicer title |
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets slicer ID --list
uni gsheets slicer ID --add --anchor E1 --data-range A1:D100 --column 0 --title "Category"
uni gsheets slicer ID --delete 123456
```

---

### `uni gsheets text-to-cols`

Split text in cells into multiple columns

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `range` | Yes | Source range (e.g., A1:A100) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--delimiter` | -d | string |  | Delimiter: comma, semicolon, period, space, custom |
| `--custom` | -c | string |  | Custom delimiter string (use with --delimiter custom) |
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets text-to-cols ID A1:A100 --delimiter comma
uni gsheets text-to-cols ID B1:B50 --delimiter semicolon
uni gsheets text-to-cols ID C1:C20 --delimiter custom --custom "|"
uni gsheets text-to-cols ID A1:A10 --delimiter space
```

---

### `uni gsheets autofill`

Auto-fill cells based on a pattern (like dragging fill handle)

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `source` | Yes | Source range with pattern (e.g., A1:A2) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--count` | -n | string |  | Number of cells to fill |
| `--direction` | -d | string |  | Direction: down, right (default: down) |
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets autofill ID A1:A2 --count 10
uni gsheets autofill ID A1:B1 --count 5 --direction right
uni gsheets autofill ID A1:A3 --count 100 --direction down
```

---

### `uni gsheets move-dim`

Move rows or columns to a new position

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--rows` | -r | boolean |  | Move rows |
| `--cols` | -c | boolean |  | Move columns |
| `--start` |  | string |  | Start index (1-based, e.g., 5 for row 5 or column E) |
| `--end` |  | string |  | End index (1-based, inclusive) |
| `--to` |  | string |  | Destination index (1-based) |
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets move-dim ID --rows --start 5 --end 7 --to 2
uni gsheets move-dim ID --cols --start 3 --end 3 --to 1
uni gsheets move-dim ID --rows --start 10 --end 15 --to 1 --sheet "Data"
```

---

### `uni gsheets banding`

Add, list, or delete banded (alternating color) ranges

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--add` | -a | boolean |  | Add banding to a range |
| `--list` | -l | boolean |  | List all banded ranges |
| `--delete` | -d | string |  | Delete banding by ID |
| `--range` | -r | string |  | Range for banding (e.g., A1:D100) |
| `--header-color` |  | string |  | Header row color (name or #hex) |
| `--first-color` |  | string |  | First band color (name or #hex) |
| `--second-color` |  | string |  | Second band color (name or #hex) |
| `--footer-color` |  | string |  | Footer row color (name or #hex) |
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets banding ID --list
uni gsheets banding ID --add --range A1:D100 --header-color blue --first-color white --second-color lightgray
uni gsheets banding ID --add --range A1:Z50 --first-color "#ffffff" --second-color "#f0f0f0"
uni gsheets banding ID --delete 123456
```

---

### `uni gsheets image`

Insert an image into a cell

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Spreadsheet ID or URL |
| `cell` | Yes | Target cell (e.g., A1) |
| `url` | Yes | Image URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--mode` | -m | string |  | Insert mode: 1 (fit to cell), 2 (stretch), 3 (original size), 4 (custom size) |
| `--sheet` | -s | string |  | Sheet name (default: first sheet) |

**Examples:**

```bash
uni gsheets image ID A1 "https://example.com/logo.png"
uni gsheets image ID B5 "https://example.com/chart.png" --mode 2
uni gsheets image ID C1 "https://example.com/image.jpg" --mode 3 --sheet "Images"
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

### `uni todoist sections`

List and manage sections within projects

**Aliases:** `section`, `sec`

**Examples:**

```bash
uni todoist sections list
uni todoist sections create "In Progress" --project PROJECT_ID
uni todoist sections delete SECTION_ID
```

**Subcommands:**

#### `uni todoist sections list`

List sections

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--project` | -p | string | Filter by project ID |

```bash
uni todoist sections list
uni todoist sections list --project PROJECT_ID
```

#### `uni todoist sections create`

Create a section

| Argument | Required | Description |
|----------|----------|-------------|
| `name` | Yes | Section name |

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--project` | -p | string | Project ID |

```bash
uni todoist sections create "In Progress" --project PROJECT_ID
```

#### `uni todoist sections delete`

Delete a section

| Argument | Required | Description |
|----------|----------|-------------|
| `id` | Yes | Section ID |

```bash
uni todoist sections delete SECTION_ID
```

---

### `uni todoist quick`

Quick add a task using natural language

**Aliases:** `q`, `add-quick`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `text` | Yes | Task with natural language due date |

**Examples:**

```bash
uni todoist quick "Buy milk tomorrow"
uni todoist quick "Call mom every monday at 10am"
uni todoist quick "Submit report friday #work @urgent"
uni todoist quick "Meeting next wednesday at 2pm"
```

---

### `uni todoist due`

View tasks by due date filter

**Aliases:** `today`, `upcoming`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--filter` | -f | string |  | Filter: today, tomorrow, week, overdue |
| `--project` | -p | string |  | Filter by project ID |

**Examples:**

```bash
uni todoist due
uni todoist due --filter today
uni todoist due --filter tomorrow
uni todoist due --filter overdue
uni todoist due --filter week --project PROJECT_ID
```

---

### `uni todoist move`

Move a task to a different project or section

**Aliases:** `mv`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `taskId` | Yes | Task ID |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--project` | -p | string |  | Target project ID |
| `--section` | -s | string |  | Target section ID |

**Examples:**

```bash
uni todoist move TASK_ID --project PROJECT_ID
uni todoist move TASK_ID --section SECTION_ID
uni todoist move TASK_ID --project PROJECT_ID --section SECTION_ID
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

## uni sendgrid

SendGrid - transactional email

### `uni sendgrid auth`

Configure SendGrid API key

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `apiKey` | No | SendGrid API Key (SG.xxx) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--from` | -f | string |  | Default from email address |
| `--name` | -n | string |  | Default from name |
| `--status` | -s | boolean |  | Check current auth status |
| `--logout` |  | boolean |  | Remove stored credentials |

**Examples:**

```bash
uni sendgrid auth SG.xxx -f sender@example.com
uni sendgrid auth SG.xxx -f sender@example.com -n "My App"
uni sendgrid auth --status
uni sendgrid auth --logout
```

---

### `uni sendgrid send`

Send an email

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `to` | Yes | Recipient email address(es), comma-separated |
| `subject` | Yes | Email subject |
| `body` | No | Email body (text) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--from` | -f | string |  | From email (default: SENDGRID_FROM) |
| `--name` | -n | string |  | From name |
| `--html` |  | string |  | HTML body (instead of text) |
| `--cc` |  | string |  | CC recipients (comma-separated) |
| `--bcc` |  | string |  | BCC recipients (comma-separated) |
| `--reply-to` |  | string |  | Reply-to address |
| `--template` | -t | string |  | Dynamic template ID (d-xxx) |
| `--data` | -d | string |  | JSON data for dynamic template |

**Examples:**

```bash
uni sendgrid send user@example.com "Hello" "This is the message"
uni sendgrid send user@example.com "Welcome" --html "<h1>Welcome!</h1>"
uni sendgrid send user@example.com "Invite" -t d-xxx -d '{"name":"John"}'
uni sendgrid send "a@test.com,b@test.com" "Newsletter" "Content here"
```

---

## uni spotify

Spotify - control playback, search, and manage playlists

### `uni spotify auth`

Authenticate with Spotify

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--logout` |  | boolean |  | Log out and remove stored credentials |
| `--status` |  | boolean |  | Check authentication status |
| `--setup` |  | boolean |  | Show instructions to use your own Spotify app |

**Examples:**

```bash
uni spotify auth
uni spotify auth --status
uni spotify auth --logout
uni spotify auth --setup
```

---

### `uni spotify now`

Show currently playing track

**Aliases:** `np`, `now-playing`, `status`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--watch` | -w | boolean |  | Continuously update (every 5s) |

**Examples:**

```bash
uni spotify now
uni spotify np
uni spotify now --watch
```

---

### `uni spotify play`

Play/resume playback or play a specific track

**Aliases:** `resume`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | No | Track name, Spotify URI, or search query |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--device` | -d | string |  | Device ID to play on |
| `--album` | -a | boolean |  | Search for albums instead of tracks |
| `--playlist` | -p | boolean |  | Search for playlists instead of tracks |

**Examples:**

```bash
uni spotify play
uni spotify play "Bohemian Rhapsody"
uni spotify play "spotify:track:6rqhFgbbKwnb9MLmUQDhG6"
uni spotify play "Abbey Road" --album
uni spotify play "Chill Vibes" --playlist
uni spotify play --device abc123
```

---

### `uni spotify pause`

Pause playback

**Aliases:** `stop`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--device` | -d | string |  | Device ID |

**Examples:**

```bash
uni spotify pause
```

---

### `uni spotify next`

Skip to next track

**Aliases:** `skip`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--device` | -d | string |  | Device ID |

**Examples:**

```bash
uni spotify next
uni spotify skip
```

---

### `uni spotify prev`

Go to previous track

**Aliases:** `previous`, `back`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--device` | -d | string |  | Device ID |

**Examples:**

```bash
uni spotify prev
uni spotify previous
```

---

### `uni spotify search`

Search for tracks, albums, artists, or playlists

**Aliases:** `s`, `find`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | Yes | Search query |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--type` | -t | string | `track` | Type: track, album, artist, playlist (default: track) |
| `--limit` | -n | number | `10` | Max results (default: 10) |

**Examples:**

```bash
uni spotify search "Bohemian Rhapsody"
uni spotify search "Queen" --type artist
uni spotify search "Abbey Road" --type album
uni spotify search "Chill" --type playlist -n 5
```

---

### `uni spotify queue`

Add track to playback queue

**Aliases:** `q`, `add`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | Yes | Track name or Spotify URI |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--device` | -d | string |  | Device ID |

**Examples:**

```bash
uni spotify queue "Bohemian Rhapsody"
uni spotify queue "spotify:track:6rqhFgbbKwnb9MLmUQDhG6"
uni spotify q "Stairway to Heaven"
```

---

### `uni spotify devices`

List available playback devices

**Aliases:** `device`, `d`

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--transfer` | -t | string |  | Transfer playback to device ID |

**Examples:**

```bash
uni spotify devices
uni spotify devices --transfer abc123
```

---

### `uni spotify playlists`

List your playlists

**Aliases:** `playlist`, `pl`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | No | Playlist ID to view tracks |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | number | `20` | Max results (default: 20) |

**Examples:**

```bash
uni spotify playlists
uni spotify playlists -n 50
uni spotify playlists 37i9dQZF1DXcBWIGoYBM5M
```

---

### `uni spotify volume`

Get or set volume (0-100)

**Aliases:** `vol`, `v`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `level` | No | Volume level (0-100) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--device` | -d | string |  | Device ID |

**Examples:**

```bash
uni spotify volume
uni spotify volume 50
uni spotify vol 75
```

---

## uni ntfy

Ntfy - Push notifications

### `uni ntfy send`

Send a push notification

**Aliases:** `push`, `notify`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `message` | Yes | Notification message |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--topic` | -t | string |  | Topic to publish to |
| `--title` | -T | string |  | Notification title |
| `--priority` | -p | string |  | Priority: min, low, default, high, urgent |
| `--tags` |  | string |  | Comma-separated tags (emoji shortcodes) |
| `--click` | -c | string |  | URL to open on click |
| `--icon` | -i | string |  | Icon URL |
| `--delay` | -d | string |  | Delay delivery (e.g., 30m, 1h) |

**Examples:**

```bash
uni ntfy send "Hello world" -t mytopic
uni ntfy send "Build done!" -T "CI Alert" -p high --tags tada
uni ntfy send "Check this" -c "https://example.com"
```

---

### `uni ntfy config`

Configure ntfy settings

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--topic` | -t | string |  | Default topic |
| `--server` | -s | string |  | Server URL (default: ntfy.sh) |
| `--username` | -u | string |  | Username for auth |
| `--password` | -p | string |  | Password for auth |
| `--status` |  | boolean |  | Show current config |
| `--logout` |  | boolean |  | Remove stored config |

**Examples:**

```bash
uni ntfy config -t mytopic
uni ntfy config -s https://ntfy.example.com -t alerts
uni ntfy config --status
```

---

## uni cloudinary

Cloudinary - Image/video hosting

### `uni cloudinary auth`

Configure Cloudinary credentials

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `cloudName` | No | Cloud name |
| `apiKey` | No | API key |
| `apiSecret` | No | API secret |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--status` | -s | boolean |  | Check current auth status |
| `--logout` |  | boolean |  | Remove stored credentials |

**Examples:**

```bash
uni cloudinary auth my-cloud-name API_KEY API_SECRET
uni cloudinary auth --status
uni cloudinary auth --logout
```

---

### `uni cloudinary upload`

Upload an image or video

**Aliases:** `up`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `source` | Yes | File path or URL |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--folder` | -f | string |  | Folder to upload to |
| `--name` | -n | string |  | Public ID (name) |
| `--type` | -t | string |  | Resource type: image, video, raw, auto |

**Examples:**

```bash
uni cloudinary upload ./photo.jpg
uni cloudinary upload ./video.mp4 -f uploads
uni cloudinary upload https://example.com/img.png -n my-image
```

---

### `uni cloudinary url`

Generate a transformed image URL

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `publicId` | Yes | Public ID of the image |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--width` | -w | string |  | Width in pixels |
| `--height` | -h | string |  | Height in pixels |
| `--crop` | -c | string |  | Crop mode: fill, fit, scale, thumb |

**Examples:**

```bash
uni cloudinary url my-image
uni cloudinary url folder/my-image -w 300 -h 200
uni cloudinary url avatar -w 100 -c thumb
```

---

### `uni cloudinary delete`

Delete an asset

**Aliases:** `rm`, `del`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `publicId` | Yes | Public ID of the asset |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--type` | -t | string |  | Resource type: image, video, raw |

**Examples:**

```bash
uni cloudinary delete my-image
uni cloudinary delete folder/my-video -t video
```

---

## uni imgbb

imgbb - Image hosting

### `uni imgbb auth`

Configure imgbb API key

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `apiKey` | No | imgbb API key |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--status` | -s | boolean |  | Check current auth status |
| `--logout` |  | boolean |  | Remove stored credentials |

**Examples:**

```bash
uni imgbb auth YOUR_API_KEY
uni imgbb auth --status
uni imgbb auth --logout
```

---

### `uni imgbb upload`

Upload an image

**Aliases:** `up`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `image` | Yes | Image file path, URL, or base64 |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--name` | -n | string |  | Custom image name |
| `--expiration` | -e | string |  | Auto-delete after seconds (60-15552000) |

**Examples:**

```bash
uni imgbb upload ./screenshot.png
uni imgbb upload https://example.com/image.jpg
uni imgbb upload ./temp.png -e 3600
```

---

## uni vonage

Vonage - SMS messaging

### `uni vonage auth`

Configure Vonage credentials

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `apiKey` | No | Vonage API Key |
| `apiSecret` | No | Vonage API Secret |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--phone` | -p | string |  | Your Vonage phone number |
| `--status` | -s | boolean |  | Check current auth status |
| `--logout` |  | boolean |  | Remove stored credentials |

**Examples:**

```bash
uni vonage auth API_KEY API_SECRET -p 15551234567
uni vonage auth --status
uni vonage auth --logout
```

---

### `uni vonage send`

Send an SMS message

**Aliases:** `sms`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `to` | Yes | Recipient phone number |
| `message` | Yes | Message text |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--from` | -f | string |  | From phone number |

**Examples:**

```bash
uni vonage send 15559876543 "Hello from Vonage!"
uni vonage send 15559876543 "Test" -f 15551234567
```

---

## uni pushover

Pushover - push notifications

### `uni pushover auth`

Configure Pushover credentials

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `userKey` | No | Your Pushover User Key |
| `apiToken` | No | Your Application API Token |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--status` | -s | boolean |  | Check current auth status |
| `--logout` |  | boolean |  | Remove stored credentials |

**Examples:**

```bash
uni pushover auth USER_KEY API_TOKEN
uni pushover auth --status
uni pushover auth --logout
```

---

### `uni pushover send`

Send a push notification

**Aliases:** `push`, `notify`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `message` | Yes | Notification message |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--title` | -t | string |  | Notification title |
| `--url` | -u | string |  | URL to include |
| `--url-title` |  | string |  | Title for the URL |
| `--priority` | -p | number |  | Priority: -2 (lowest) to 2 (emergency) |
| `--sound` |  | string |  | Sound name (pushover, bike, bugle, etc.) |
| `--device` | -d | string |  | Specific device name |

**Examples:**

```bash
uni pushover send "Build complete!"
uni pushover send "Server down!" -t "Alert" -p 1
uni pushover send "Check this" -u "https://example.com"
```

---

## uni airtable

Airtable - bases, tables, and records

### `uni airtable auth`

Configure Airtable API key

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `apiKey` | No | Airtable Personal Access Token (pat...) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--base` | -b | string |  | Default base ID (app...) |
| `--status` | -s | boolean |  | Check current auth status |
| `--logout` |  | boolean |  | Remove stored credentials |

**Examples:**

```bash
uni airtable auth patXXX.XXXX
uni airtable auth patXXX.XXXX -b appXXXXX
uni airtable auth --status
uni airtable auth --logout
```

---

### `uni airtable bases`

List accessible bases

**Aliases:** `base`

**Examples:**

```bash
uni airtable bases
```

---

### `uni airtable tables`

List tables in a base

**Aliases:** `table`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `baseId` | No | Base ID (appXXX) or use default |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--fields` | -f | boolean |  | Show field definitions |

**Examples:**

```bash
uni airtable tables appXXXXX
uni airtable tables appXXXXX --fields
```

---

### `uni airtable records`

List, create, update, or delete records

**Aliases:** `record`, `r`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `table` | Yes | Table ID or name |
| `action` | No | Action: list, get, create, update, delete |
| `recordId` | No | Record ID (for get/update/delete) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--base` | -b | string |  | Base ID (uses default if not specified) |
| `--data` | -d | string |  | JSON data for create/update |
| `--filter` | -f | string |  | Filter formula for list |
| `--view` | -v | string |  | View name for list |
| `--limit` | -n | number | `100` | Max records to return (default: 100) |

**Examples:**

```bash
uni airtable records Tasks -b appXXX
uni airtable records tblXXX get recXXX -b appXXX
uni airtable records tblXXX create -b appXXX -d '{"Name":"New Task"}'
uni airtable records tblXXX update recXXX -b appXXX -d '{"Status":"Done"}'
uni airtable records tblXXX delete recXXX -b appXXX
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

## uni trello

Trello - boards, lists, cards, and members

### `uni trello boards`

Manage boards

**Aliases:** `board`, `b`

**Subcommands:**

#### `uni trello boards list`

List boards

```bash
uni trello boards list
```

#### `uni trello boards create`

Create a board

| Argument | Required | Description |
|----------|----------|-------------|
| `name` | Yes | Board name |

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--description` | -d | string | Board description |

```bash
uni trello boards create "My Project"
uni trello boards create "Sprint Board" -d "Q1 Sprint planning"
```

#### `uni trello boards close`

Close (archive) a board

| Argument | Required | Description |
|----------|----------|-------------|
| `name` | Yes | Board name or ID |

```bash
uni trello boards close "Old Project"
```

---

### `uni trello lists`

Manage lists in a board

**Aliases:** `list`, `l`

**Subcommands:**

#### `uni trello lists list`

List lists in a board

| Argument | Required | Description |
|----------|----------|-------------|
| `board` | Yes | Board name or ID |

```bash
uni trello lists list "My Project"
```

#### `uni trello lists create`

Create a list in a board

| Argument | Required | Description |
|----------|----------|-------------|
| `board` | Yes | Board name or ID |
| `name` | Yes | List name |

```bash
uni trello lists create "My Project" "To Do"
```

#### `uni trello lists archive`

Archive a list

| Argument | Required | Description |
|----------|----------|-------------|
| `board` | Yes | Board name or ID |
| `name` | Yes | List name |

```bash
uni trello lists archive "My Project" "Done"
```

---

### `uni trello cards`

Manage cards

**Aliases:** `card`, `c`

**Subcommands:**

#### `uni trello cards list`

List cards in a board or list

| Argument | Required | Description |
|----------|----------|-------------|
| `board` | Yes | Board name or ID |

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--list` | -l | string | Filter by list name |

```bash
uni trello cards list "My Project"
uni trello cards list "My Project" --list "To Do"
```

#### `uni trello cards create`

Create a card

| Argument | Required | Description |
|----------|----------|-------------|
| `board` | Yes | Board name or ID |
| `list` | Yes | List name |
| `name` | Yes | Card name |

| Option | Short | Type | Description |
|--------|-------|------|-------------|
| `--description` | -d | string | Card description |
| `--due` |  | string | Due date (YYYY-MM-DD) |

```bash
uni trello cards create "My Project" "To Do" "Fix login bug"
uni trello cards create "Sprint" "Backlog" "Add dark mode" -d "Users want dark mode" --due 2026-01-15
```

#### `uni trello cards move`

Move a card to another list

| Argument | Required | Description |
|----------|----------|-------------|
| `board` | Yes | Board name or ID |
| `card` | Yes | Card name (partial match) |
| `list` | Yes | Destination list name |

```bash
uni trello cards move "My Project" "Fix bug" "Done"
```

#### `uni trello cards archive`

Archive a card

| Argument | Required | Description |
|----------|----------|-------------|
| `board` | Yes | Board name or ID |
| `card` | Yes | Card name (partial match) |

```bash
uni trello cards archive "My Project" "Old task"
```

#### `uni trello cards delete`

Delete a card permanently

| Argument | Required | Description |
|----------|----------|-------------|
| `board` | Yes | Board name or ID |
| `card` | Yes | Card name (partial match) |

```bash
uni trello cards delete "My Project" "Test card"
```

---

### `uni trello members`

List board members

**Aliases:** `member`, `m`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `board` | Yes | Board name or ID |

**Examples:**

```bash
uni trello members "My Project"
```

---

## uni asana

Asana - Task management

### `uni asana auth`

Configure Asana credentials

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `token` | No | Personal Access Token |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--workspace` | -w | string |  | Default workspace GID |
| `--status` | -s | boolean |  | Check current auth status |
| `--logout` |  | boolean |  | Remove stored credentials |

**Examples:**

```bash
uni asana auth YOUR_ACCESS_TOKEN
uni asana auth YOUR_TOKEN -w 1234567890
uni asana auth --status
```

---

### `uni asana workspaces`

List workspaces

**Aliases:** `ws`

**Examples:**

```bash
uni asana workspaces
```

---

### `uni asana projects`

List projects in a workspace

**Aliases:** `proj`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `workspaceGid` | No | Workspace GID (uses default if not specified) |

**Examples:**

```bash
uni asana projects
uni asana projects 1234567890
```

---

### `uni asana tasks`

List or manage tasks in a project

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `projectGid` | Yes | Project GID |
| `action` | No | Action: list (default), add, done, delete |
| `taskArg` | No | Task name (for add) or GID (for done/delete) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--notes` | -n | string |  | Task notes (for add) |
| `--due` | -d | string |  | Due date YYYY-MM-DD (for add) |
| `--assignee` | -a | string |  | Assignee GID or "me" (for add) |
| `--all` |  | boolean |  | Show completed tasks too |

**Examples:**

```bash
uni asana tasks 1234567890
uni asana tasks 1234567890 add "New task"
uni asana tasks 1234567890 add "Important" -d 2025-01-15 -n "Details here"
uni asana tasks 1234567890 done 9876543210
uni asana tasks 1234567890 delete 9876543210
```

---

## uni resend

Resend - modern email API

### `uni resend auth`

Configure Resend API key

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `apiKey` | No | Resend API Key (re_xxx) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--from` | -f | string |  | Default from email |
| `--status` | -s | boolean |  | Check current auth status |
| `--logout` |  | boolean |  | Remove stored credentials |

**Examples:**

```bash
uni resend auth re_xxx -f sender@example.com
uni resend auth --status
uni resend auth --logout
```

---

### `uni resend send`

Send an email

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `to` | Yes | Recipient email (comma-separated for multiple) |
| `subject` | Yes | Email subject |
| `body` | No | Email body (text) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--from` | -f | string |  | From email |
| `--html` |  | string |  | HTML body |
| `--cc` |  | string |  | CC recipients |
| `--bcc` |  | string |  | BCC recipients |
| `--reply-to` |  | string |  | Reply-to address |

**Examples:**

```bash
uni resend send user@example.com "Hello" "Message body"
uni resend send user@example.com "Welcome" --html "<h1>Hi!</h1>"
uni resend send "a@test.com,b@test.com" "News" "Content"
```

---

## uni twilio

Twilio - SMS messaging

### `uni twilio auth`

Configure Twilio credentials

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `accountSid` | No | Twilio Account SID (ACXXXXXXX) |
| `authToken` | No | Twilio Auth Token |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--phone` | -p | string |  | Your Twilio phone number (+1XXXYYYZZZZ) |
| `--status` | -s | boolean |  | Check current auth status |
| `--logout` |  | boolean |  | Remove stored credentials |

**Examples:**

```bash
uni twilio auth ACXXX authtoken123 -p +15551234567
uni twilio auth --status
uni twilio auth --logout
```

---

### `uni twilio send`

Send an SMS message

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `to` | Yes | Recipient phone number (+1XXXYYYZZZZ) |
| `message` | Yes | Message text |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--from` | -f | string |  | From phone number (default: TWILIO_PHONE_NUMBER) |

**Examples:**

```bash
uni twilio send +15551234567 "Hello from uni CLI!"
uni twilio send +15551234567 "Meeting at 3pm" -f +15559876543
```

---

### `uni twilio messages`

List or view messages

**Aliases:** `msg`, `sms`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `sid` | No | Message SID to view details |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | number | `20` | Number of messages to list (default: 20) |

**Examples:**

```bash
uni twilio messages
uni twilio messages -n 50
uni twilio messages SM1234567890abcdef
```

---

## uni stripe

Stripe - payments, subscriptions, invoices, and more

### `uni stripe auth`

Configure Stripe API key

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `key` | No | Stripe secret key (sk_test_... or sk_live_...) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--status` |  | boolean |  | Check authentication status |
| `--logout` |  | boolean |  | Remove stored credentials |

**Examples:**

```bash
uni stripe auth sk_test_xxx
uni stripe auth --status
uni stripe auth --logout
```

---

### `uni stripe balance`

Check account balance

**Aliases:** `bal`

**Examples:**

```bash
uni stripe balance
uni stripe bal
```

---

### `uni stripe payments`

List recent payments

**Aliases:** `pay`, `p`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | No | Payment ID to view details |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | number | `10` | Number of payments to show (default: 10) |

**Examples:**

```bash
uni stripe payments
uni stripe payments -n 20
uni stripe payments pi_xxx
```

---

### `uni stripe link`

Create or list payment links

**Aliases:** `links`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `amount` | No | Amount in dollars (e.g., 50 or 49.99) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--description` | -d | string |  | Payment description |
| `--currency` | -c | string | `usd` | Currency code (default: usd) |
| `--list` | -l | boolean |  | List existing payment links |
| `--limit` | -n | number | `10` | Number of links to list (default: 10) |

**Examples:**

```bash
uni stripe link 50
uni stripe link 99.99 -d "Consulting hour"
uni stripe link 100 --currency eur
uni stripe link --list
```

---

### `uni stripe customers`

List or create customers

**Aliases:** `customer`, `cust`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `email` | No | Email to create customer or customer ID to view |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--name` | -n | string |  | Customer name (for create) |
| `--limit` |  | number | `10` | Number of customers to list (default: 10) |

**Examples:**

```bash
uni stripe customers
uni stripe customers john@example.com -n "John Doe"
uni stripe customers cus_xxx
```

---

### `uni stripe invoices`

List or create invoices

**Aliases:** `invoice`, `inv`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `action` | No | Action: list, create, send |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--customer` |  | string |  | Customer ID (for create) |
| `--amount` | -a | number |  | Amount in dollars (for create) |
| `--description` | -d | string |  | Invoice description |
| `--limit` | -n | number | `10` | Number of invoices to list (default: 10) |

**Examples:**

```bash
uni stripe invoices
uni stripe invoices create --customer cus_xxx -a 100 -d "Consulting"
uni stripe invoices send in_xxx
```

---

### `uni stripe refunds`

List or create refunds

**Aliases:** `refund`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `paymentId` | No | Payment Intent ID to refund (pi_xxx) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--amount` | -a | number |  | Partial refund amount in dollars |
| `--reason` | -r | string |  | Reason: duplicate, fraudulent, requested_by_customer |
| `--limit` | -n | number | `10` | Number of refunds to list (default: 10) |

**Examples:**

```bash
uni stripe refunds
uni stripe refunds pi_xxx
uni stripe refunds pi_xxx -a 25
uni stripe refunds pi_xxx -r requested_by_customer
```

---

### `uni stripe subs`

List or manage subscriptions

**Aliases:** `subscriptions`, `sub`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `action` | No | Action: list (default), cancel, view |
| `id` | No | Subscription ID |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--limit` | -n | number | `10` | Number of subscriptions to list (default: 10) |

**Examples:**

```bash
uni stripe subs
uni stripe subs sub_xxx
uni stripe subs cancel sub_xxx
```

---

### `uni stripe products`

List or create products

**Aliases:** `product`, `prod`

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `name` | No | Product name (to create) |

**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--description` | -d | string |  | Product description |
| `--prices` | -p | boolean |  | Show prices for products |
| `--limit` | -n | number | `10` | Number of products to list (default: 10) |

**Examples:**

```bash
uni stripe products
uni stripe products --prices
uni stripe products "Pro Plan" -d "Full access to all features"
```

---

