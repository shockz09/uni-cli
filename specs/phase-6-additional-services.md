# Phase 6: Additional Services

> Status: ✅ COMPLETED

## Overview
Added 4 additional services beyond the MVP: Slack, Notion, Gmail, Google Drive.

## Services Implemented

### Slack Service
**Auth:** `SLACK_BOT_TOKEN` (create app at https://api.slack.com/apps)

Commands:
- `uni slack channels list` - List channels
- `uni slack channels info <channel>` - Get channel info
- `uni slack messages <channel>` - Read messages
- `uni slack send <channel> <message>` - Send message
- `uni slack users list` - List users
- `uni slack users info <user>` - Get user info

Files:
- `packages/service-slack/src/api.ts`
- `packages/service-slack/src/commands/channels.ts`
- `packages/service-slack/src/commands/messages.ts`
- `packages/service-slack/src/commands/send.ts`
- `packages/service-slack/src/commands/users.ts`

---

### Notion Service
**Auth:** `NOTION_TOKEN` (create at https://notion.so/my-integrations)

Commands:
- `uni notion search <query>` - Search pages and databases
- `uni notion pages view <id>` - View page with optional content
- `uni notion databases list` - List databases
- `uni notion databases query <id>` - Query database items

Files:
- `packages/service-notion/src/api.ts`
- `packages/service-notion/src/commands/search.ts`
- `packages/service-notion/src/commands/pages.ts`
- `packages/service-notion/src/commands/databases.ts`

---

### Gmail Service
**Auth:** Google OAuth (same creds as gcal)

Commands:
- `uni gmail list` - List emails (with search query support)
- `uni gmail read <id>` - Read email content
- `uni gmail send --to --subject --body` - Send email
- `uni gmail auth` - Authenticate

Files:
- `packages/service-gmail/src/api.ts`
- `packages/service-gmail/src/commands/list.ts`
- `packages/service-gmail/src/commands/read.ts`
- `packages/service-gmail/src/commands/send.ts`
- `packages/service-gmail/src/commands/auth.ts`

Tokens stored: `~/.uni/tokens/gmail.json`

---

### Google Drive Service
**Auth:** Google OAuth (same creds as gcal)

Commands:
- `uni gdrive list` - List files
- `uni gdrive search <query>` - Search files
- `uni gdrive auth` - Authenticate

Files:
- `packages/service-gdrive/src/api.ts`
- `packages/service-gdrive/src/commands/list.ts`
- `packages/service-gdrive/src/commands/search.ts`
- `packages/service-gdrive/src/commands/auth.ts`

Tokens stored: `~/.uni/tokens/gdrive.json`

---

## Environment Variables Summary

```bash
# Google services (gcal, gmail, gdrive)
export GOOGLE_CLIENT_ID="..."
export GOOGLE_CLIENT_SECRET="..."

# Slack
export SLACK_BOT_TOKEN="xoxb-..."

# Notion
export NOTION_TOKEN="secret_..."
```

## Usage Examples

```bash
# Slack
uni slack channels list
uni slack send general "Hello team!"

# Notion
uni notion search "meeting notes"
uni notion databases list

# Gmail
uni gmail list --unread
uni gmail send --to user@example.com --subject "Hi" --body "Hello"

# Drive
uni gdrive search "project proposal"
uni gdrive list --limit 50
```
