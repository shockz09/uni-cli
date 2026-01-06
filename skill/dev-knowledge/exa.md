# Exa Service - Developer Knowledge

## Architecture

- **Package**: `packages/service-exa/`
- **Auth**: Optional API key OR MCP (free tier)
- **API**: Exa Search API

## Dual Mode: MCP vs Direct API

### MCP Mode (Default, Free)
Uses MCP client to call Exa through their free tier:
```javascript
// No API key needed
const mcpClient = new McpClient();
const results = await mcpClient.search(query);
```

### Direct API Mode
With `EXA_API_KEY`:
```javascript
// Higher rate limits, more features
const response = await fetch('https://api.exa.ai/search', {
  headers: { 'x-api-key': process.env.EXA_API_KEY }
});
```

## Commands

```bash
uni exa search "query"          # Web search
uni exa code "react hooks"      # Code-focused search
uni exa research "topic"        # Deep research mode
uni exa company "startup name"  # Company research
```

## Implementation Notes

### No Setup Warning
```javascript
async setup() {
  // Exa has a free tier - API key is optional
}
```
Unlike Slack/Notion, Exa works without any config via MCP.

### Search Modes
- `search` - General web search
- `code` - Prioritizes documentation, GitHub, Stack Overflow
- `research` - Multiple queries, aggregated results
- `company` - Company info, news, funding

### Result Format
```javascript
{
  title: "Page Title",
  url: "https://...",
  snippet: "Relevant excerpt...",
  score: 0.95  // Relevance score
}
```

## Gotchas

1. **MCP can be slow** - First request may take longer due to MCP connection setup.

2. **Rate limits differ** - MCP free tier has lower limits than direct API.

3. **No API key needed for basic use** - This is a feature, not a bug.
