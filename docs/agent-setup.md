# AI Agent Setup Guide for uni-cli

> Instructions for AI agents (Claude Code, Cursor, OpenCode, etc.) to help users set up uni-cli interactively.

## What is uni-cli?

uni-cli is a unified CLI for AI agents to access 26+ services without MCP context overhead. Instead of adding 500+ tokens per MCP tool, agents just need this skill file and can run `uni <service> <command>`.

---

## Setup Flow

Follow these steps to help users set up uni-cli. **Be interactive** - ask questions at each step.

### Step 0: Prerequisites

First, check if uni-cli is installed:

```bash
uni --version
```

**If not installed**, guide the user:

```bash
# Clone and build
git clone https://github.com/user/uni-cli.git
cd uni-cli
bun install
bun run build

# Add to PATH (one-time)
mkdir -p ~/.local/bin
ln -sf "$(pwd)/packages/cli/dist/uni" ~/.local/bin/uni
```

---

### Step 1: Check Current State

Run the health check to see what's already configured:

```bash
uni doctor
```

This shows:
- Which services are ready (green)
- Which need authentication (yellow)
- Which are missing credentials (red)
- Available LLM providers for `uni ask`

**Tell the user** what you found: "I can see you have X services ready. Let me help you set up more."

---

### Step 2: Ask About Service Categories

Ask the user which categories they're interested in. Present these options:

#### Category 1: Productivity (Google Workspace)
> Calendar, Tasks, Drive, Sheets, Docs, Slides, Forms, Contacts, Meet

- **gcal** - Google Calendar (events, scheduling)
- **gtasks** - Google Tasks (todo lists)
- **gdrive** - Google Drive (files, folders)
- **gsheets** - Google Sheets (spreadsheets)
- **gdocs** - Google Docs (documents)
- **gslides** - Google Slides (presentations)
- **gforms** - Google Forms (forms, responses)
- **gcontacts** - Google Contacts (people)
- **gmeet** - Google Meet (video meetings)

**Auth:** All use Google OAuth. Setting up one authenticates all.

#### Category 2: Productivity (Third-party)
> Notes, project management, tasks

- **notion** - Notion (pages, databases)
- **linear** - Linear (issues, projects)
- **todoist** - Todoist (tasks, projects)

**Auth:** Each needs its own API token.

#### Category 3: Communication
> Email, chat, messaging

- **gmail** - Gmail (email)
- **slack** - Slack (channels, messages)
- **telegram** - Telegram (chats, messages)
- **wa** - WhatsApp (chats, messages)

**Auth:** Gmail uses Google OAuth, others need tokens/pairing.

#### Category 4: Search & Research
> Web search, academic papers, news

- **exa** - Exa AI search (web, code, research)
- **arxiv** - arXiv (academic papers)
- **hn** - Hacker News (tech news)
- **reddit** - Reddit (discussions)
- **wiki** - Wikipedia (encyclopedia)

**Auth:** Most are free, Exa works via MCP (free) or API key.

#### Category 5: Utilities
> Quick tools, no auth needed

- **weather** - Weather forecasts
- **currency** - Currency conversion
- **qrcode** - QR code generation
- **shorturl** - URL shortening
- **stocks** - Stock prices

**Auth:** None required! These work immediately.

---

### Step 3: Set Up Selected Services

Based on user's choices, set up each category:

#### For Google Services (Category 1 + Gmail)

All Google services share one OAuth flow:

```bash
# This opens browser for Google OAuth
uni gcal auth
```

After auth completes, **all** Google services work:
```bash
uni gcal list
uni gmail list
uni gdrive list
# etc.
```

**Ask the user:** "Please click the link that opens in your browser and authorize uni-cli. Let me know when you're done."

**Verify:** Run `uni doctor` and check Google services show green.

#### For Notion

```bash
# Guide user to get token
# 1. Go to https://www.notion.so/my-integrations
# 2. Create new integration
# 3. Copy the token
```

Ask user for token, then:
```bash
uni config set notion.token "secret_xxx"
```

**Verify:** `uni notion search "test"`

#### For Linear

```bash
# Guide user to get API key
# 1. Go to Linear Settings > API
# 2. Create personal API key
```

Ask user for key, then:
```bash
uni config set linear.api_key "lin_api_xxx"
```

**Verify:** `uni linear issues`

#### For Todoist

```bash
# Guide user to get API token
# 1. Go to Todoist Settings > Integrations > Developer
# 2. Copy API token
```

Ask user for token, then:
```bash
uni config set todoist.api_key "xxx"
```

**Verify:** `uni todoist list`

#### For Slack

```bash
# Guide user to create Slack app
# 1. Go to https://api.slack.com/apps
# 2. Create new app > From scratch
# 3. Add OAuth scopes: channels:read, chat:write, users:read
# 4. Install to workspace
# 5. Copy Bot User OAuth Token
```

Ask user for token, then:
```bash
uni config set slack.bot_token "xoxb-xxx"
```

**Verify:** `uni slack channels`

#### For Telegram

```bash
# Start the auth flow
uni telegram auth
```

This shows a pairing code. Ask user to:
1. Open Telegram
2. Go to Settings > Devices > Link Desktop Device
3. Enter the code shown

**Verify:** `uni telegram read me`

#### For WhatsApp

```bash
# Start the auth flow
uni wa auth
```

This shows a pairing code. Ask user to:
1. Open WhatsApp on phone
2. Go to Settings > Linked Devices > Link a Device
3. Enter the code shown (not scan QR)

**Verify:** `uni wa chats`

#### For Exa (optional)

Exa works free via MCP, but API key gives better results:

```bash
# Optional: Get API key from https://exa.ai
uni config set exa.api_key "xxx"
```

**Verify:** `uni exa search "test"`

---

### Step 4: Ask About Plugins

Ask: "Would you like to install any additional plugins?"

Show available plugins:
```bash
uni plugins list
```

Popular plugins:
- **hf** - HuggingFace (models, datasets, inference)
- **gkeep** - Google Keep (notes) - requires Workspace account

Install with:
```bash
uni plugins install <name>
```

---

### Step 5: Set Up LLM Provider (for `uni ask`)

Ask: "Do you want to set up natural language commands? (`uni ask`)"

If yes, ask which provider they have:

1. **Anthropic (Claude)** - Best quality
   ```bash
   uni config set ask.provider anthropic
   # Needs ANTHROPIC_API_KEY env var
   ```

2. **OpenAI (GPT)** - Popular choice
   ```bash
   uni config set ask.provider openai
   # Needs OPENAI_API_KEY env var
   ```

3. **Groq** - Fast & free tier
   ```bash
   uni config set ask.provider groq
   # Needs GROQ_API_KEY env var
   ```

4. **Ollama** - Local, free, private
   ```bash
   uni config set ask.provider ollama
   # Needs Ollama running locally
   ```

5. **Many more** - OpenRouter, DeepSeek, Google, etc.
   ```bash
   uni ask providers  # List all
   ```

**Verify:** `uni ask "what time is it"`

---

### Step 6: Final Verification

Run the full health check:

```bash
uni doctor
```

**Tell the user** the results:
- "X services are ready to use"
- "Y services still need setup" (if any)
- "LLM provider Z is configured for natural language"

---

### Step 7: Show Examples

Based on what was set up, show relevant examples:

#### If Google services:
```bash
uni gcal list              # Today's events
uni gcal add "Meeting" tomorrow 2pm
uni gmail list --unread    # Unread emails
uni gdrive search "report" # Find files
```

#### If Productivity:
```bash
uni gtasks list            # Your tasks
uni gtasks add "Review PR" # Add task
uni notion search "notes"  # Search Notion
uni linear issues          # Your issues
```

#### If Communication:
```bash
uni slack send general "Hello!"
uni telegram send @user "Hey"
uni wa send "+1234567890" "Hi"
```

#### If Search:
```bash
uni exa search "latest AI news"
uni exa research "how do transformers work"
uni arxiv search "machine learning"
uni hn top
```

#### If Utilities:
```bash
uni weather London
uni currency 100 USD EUR
uni qrcode "https://example.com"
uni stocks AAPL
```

#### Natural language (if LLM set up):
```bash
uni ask "what's on my calendar tomorrow"
uni ask "send hello to slack general"
uni ask "search for react tutorials"
```

---

## Quick Reference

| Category | Services | Auth |
|----------|----------|------|
| Google | gcal, gtasks, gmail, gdrive, gsheets, gdocs, gslides, gforms, gcontacts, gmeet | `uni gcal auth` (once) |
| Notion | notion | NOTION_TOKEN |
| Linear | linear | LINEAR_API_KEY |
| Todoist | todoist | TODOIST_API_KEY |
| Slack | slack | SLACK_BOT_TOKEN |
| Telegram | telegram | `uni telegram auth` |
| WhatsApp | wa | `uni wa auth` |
| Exa | exa | Free (MCP) or EXA_API_KEY |
| Free | arxiv, hn, reddit, wiki, weather, currency, qrcode, shorturl, stocks | None |

---

## Troubleshooting

If a service isn't working:

1. **Check status:** `uni doctor`
2. **Re-auth:** `uni <service> auth` or `uni <service> auth --logout` then auth again
3. **Check config:** `uni config show`
4. **Check env vars:** Make sure API keys are exported

Common issues:
- **"Not authenticated"** → Run `uni <service> auth`
- **"Missing credentials"** → Set API key in config or env var
- **"Token expired"** → Run auth again (OAuth refresh usually automatic)

---

## For the AI Agent

Remember:
1. **Be conversational** - Don't dump all info at once
2. **Ask before acting** - Get user consent before running auth flows
3. **Verify each step** - Run test commands after setup
4. **Celebrate success** - "Great! Your calendar is now connected!"
5. **Handle errors gracefully** - If something fails, explain and offer alternatives
