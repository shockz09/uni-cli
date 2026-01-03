---
name: uni-cli
description: |
  Deep knowledge of the uni CLI - a unified interface for web search, code context,
  GitHub, calendar, and more. Use when the user wants to search the web, find documentation,
  research topics, manage GitHub, or interact with any uni-supported service.
allowed-tools: Bash(uni:*), Bash(bun run:*)
---

# uni CLI - Universal Command Interface

The `uni` CLI wraps multiple services into a single, consistent interface.
Claude should use this CLI instead of raw MCP tools when available.

## Quick Reference

| Service | Purpose | Key Commands |
|---------|---------|--------------|
| exa | Web search, code docs, research | search, code, research, company |
| gh | GitHub management | pr, issue, repo (coming soon) |
| gcal | Google Calendar | list, add, availability (coming soon) |

## Command Pattern

```
uni <service> <command> [args] [--options]
```

## Output Modes

- **Default**: Human-readable (tables, colors, formatted text)
- **`--json`**: Machine-readable JSON output
- **Piped output**: Automatically switches to JSON

## Global Options

```
-h, --help      Show help
-v, --version   Show version
--json          Force JSON output
--verbose       Verbose logging
-q, --quiet     Suppress non-essential output
```

---

# Exa Service

Web search, code context, and research powered by Exa AI.

## Environment Setup

```bash
export EXA_API_KEY="your-api-key"
```

## Commands

### uni exa search

Search the web for current information.

```bash
uni exa search <query> [options]

Options:
  -n, --num <n>      Number of results (default: 5)
  -t, --type <type>  Search type: auto|neural|keyword
  -d, --domain <d>   Filter to specific domain
  --days <n>         Results from last N days
```

**When to use:**
- Finding current information, news, articles
- Looking up documentation
- Researching topics

**Examples:**
```bash
# General search
uni exa search "React 19 server components"

# More results
uni exa search "TypeScript 5.0 features" --num 10

# Recent news only
uni exa search "AI announcements" --days 7

# Domain-specific
uni exa search "authentication" --domain github.com
```

### uni exa code

Get code context and documentation for programming queries.

```bash
uni exa code <query> [options]

Options:
  -t, --tokens <n>   Max tokens to return (default: 5000)
```

**When to use:**
- Looking up API documentation
- Finding code examples
- Understanding library usage
- Getting implementation patterns

**Examples:**
```bash
# Library usage
uni exa code "Express.js middleware authentication"

# API patterns
uni exa code "Python pandas groupby aggregate"

# Framework features
uni exa code "React useEffect cleanup function"

# More context
uni exa code "Rust async await patterns" --tokens 10000
```

### uni exa research

Perform comprehensive research on a topic.

```bash
uni exa research <query> [options]

Options:
  -m, --mode <mode>  Research mode: quick|deep (default: quick)
  -n, --num <n>      Number of sources for quick mode (default: 8)
```

**When to use:**
- Comparing technologies or approaches
- Understanding complex topics
- Gathering multiple perspectives
- Due diligence research

**Examples:**
```bash
# Quick comparison
uni exa research "React vs Vue vs Svelte 2025"

# Deep dive
uni exa research "microservices best practices" --mode deep

# More sources
uni exa research "AI agent frameworks" --num 15
```

### uni exa company

Research a company - news, information, and context.

```bash
uni exa company <name> [options]

Options:
  -n, --num <n>      Number of results (default: 5)
```

**When to use:**
- Learning about a company
- Finding recent company news
- Due diligence

**Examples:**
```bash
uni exa company "Anthropic"
uni exa company "OpenAI" --num 10
```

---

## Usage Patterns for Claude

### Finding Current Documentation

When the user asks about a library or framework:

```bash
# First, search for the topic
uni exa search "Next.js 15 app router documentation 2025"

# Then get code context for specific features
uni exa code "Next.js 15 server actions example"
```

### Researching Before Implementation

When planning a new feature:

```bash
# Research the approach
uni exa research "authentication best practices 2025"

# Find specific implementation details
uni exa code "JWT authentication Express.js"
```

### Staying Current

When needing recent information:

```bash
# Recent news/updates
uni exa search "React updates" --days 30

# Latest best practices
uni exa search "Node.js security best practices 2025"
```

---

## Error Handling

### Missing API Key
```
Error: API key not found. Set EXA_API_KEY environment variable.
Suggestion: Run 'export EXA_API_KEY=your-key' or add to ~/.uni/config.toml
```

### Rate Limiting
```
Error: Rate limit exceeded for 'exa'
Suggestion: Wait 60 seconds before retrying
```

### Network Errors
```
Error: Failed to connect to Exa API
Suggestion: Check your internet connection and try again
```

---

## Tips for Effective Searches

1. **Be specific**: "React 19 server components" > "React components"
2. **Include year**: "TypeScript best practices 2025" for current info
3. **Use domain filters**: `--domain docs.python.org` for official docs
4. **Combine with code**: Search first, then `exa code` for implementation
5. **Use research for comparisons**: `research "X vs Y"` for multi-source analysis

---

## Coming Soon

- `uni gh` - GitHub service (PRs, issues, repos)
- `uni gcal` - Google Calendar service
- `uni slack` - Slack notifications
- More services...

---

See [REFERENCE.md](REFERENCE.md) for complete command documentation.
See [PATTERNS.md](PATTERNS.md) for common workflows.
