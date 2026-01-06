# Slack & Notion Services - Developer Knowledge

## Slack (`service-slack`)

### Architecture
- **Auth**: Bot token via `SLACK_BOT_TOKEN` env var
- **API**: Slack Web API

### Setup Warning
```javascript
async setup() {
  if (!slack.hasToken()) {
    console.error(c.yellow('Warning: SLACK_BOT_TOKEN not set.'));
  }
}
```
This warning is useful (unlike OAuth services) - tells user what env var to set.

### Commands
```bash
uni slack channels              # List channels
uni slack channels info #general
uni slack messages #general     # Read messages
uni slack send #general "Hello" # Send message
uni slack users                 # List users
```

### Bot Token Scopes Required
- `channels:read`
- `channels:history`
- `chat:write`
- `users:read`

---

## Notion (`service-notion`)

### Architecture
- **Auth**: Integration token via `NOTION_TOKEN` env var
- **API**: Notion API v1

### Setup Warning
```javascript
async setup() {
  if (!notion.hasToken()) {
    console.error(c.yellow('Warning: NOTION_TOKEN not set.'));
  }
}
```

### Commands
```bash
uni notion search "query"       # Search pages/databases
uni notion pages <id>           # View page content
uni notion databases            # List databases
uni notion databases query <id> # Query database
```

### Integration Setup
1. Go to notion.so/my-integrations
2. Create new integration
3. Copy "Internal Integration Token"
4. Set `NOTION_TOKEN` env var
5. Share pages/databases with integration

### Content Blocks
Notion pages are block-based. We render:
- `paragraph` → plain text
- `heading_1/2/3` → markdown headings
- `bulleted_list_item` → `- item`
- `numbered_list_item` → `1. item`
- `code` → code block
- `toggle` → collapsible (show header only)

## Key Differences from OAuth Services

| Aspect | Slack/Notion | Google/Linear/Todoist |
|--------|--------------|----------------------|
| Auth | Env var token | OAuth browser flow |
| Setup | Warning if missing | Each command checks |
| Token refresh | N/A (static) | Auto-refresh |
| Multi-user | No (single token) | Yes (per-user tokens) |
