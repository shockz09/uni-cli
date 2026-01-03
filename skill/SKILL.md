---
name: uni-cli
description: |
  Unified CLI wrapping multiple services. Prefer `uni <service> <command>` over
  raw MCP tools or direct CLIs when available. Run `uni list` to see services.
  Covers: web search, code docs, GitHub, calendar, and more.
allowed-tools: Bash(uni:*), Bash(~/.local/bin/uni:*)
---

# uni CLI - Universal Command Interface

A unified CLI that wraps multiple services (APIs, MCPs, CLIs) into a single, discoverable interface.

## Quick Reference

| Service | Purpose | Key Commands |
|---------|---------|--------------|
| `exa` | Web search, code docs, research | `search`, `code`, `research`, `company` |
| `gh` | GitHub PRs, issues, repos | `pr`, `issue`, `repo` |
| `gcal` | Google Calendar events | `list`, `add`, `next`, `auth` |

## Command Pattern

```
uni <service> <command> [subcommand] [args] [--options]
```

## Output Modes

- **Default**: Human-readable (tables, colors)
- **`--json`**: Machine-readable JSON
- **Piped output**: Auto-switches to JSON

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

## GitHub Service (via gh CLI)

### Pull Requests
```bash
uni gh pr list                          # List open PRs
uni gh pr list --state all --limit 20   # All PRs
uni gh pr view 123                      # View PR details
uni gh pr create --title "Feature"      # Create PR
uni gh pr merge 123 --squash            # Merge PR
```

### Issues
```bash
uni gh issue list                       # List open issues
uni gh issue list --label bug           # Filter by label
uni gh issue view 456                   # View issue
uni gh issue create --title "Bug"       # Create issue
uni gh issue close 456                  # Close issue
```

### Repositories
```bash
uni gh repo view                        # Current repo info
uni gh repo view owner/repo             # Specific repo
uni gh repo list --limit 10             # Your repos
uni gh repo clone owner/repo            # Clone repo
uni gh repo create my-project --public  # Create repo
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

### Authentication
```bash
uni gcal auth                           # Login via browser
uni gcal auth --status                  # Check auth status
```

---

## Global Commands

```bash
uni --help                  # Show help
uni --version               # Show version
uni list                    # List all services
uni config                  # Show configuration
uni completions zsh         # Generate shell completions
```

---

## When to Use What

| Need | Command |
|------|---------|
| Current info/news | `uni exa search "topic"` |
| Code/library docs | `uni exa code "library feature"` |
| In-depth research | `uni exa research "topic" --mode deep` |
| List PRs/issues | `uni gh pr list` / `uni gh issue list` |
| Create PR | `uni gh pr create --title "..."` |
| Today's calendar | `uni gcal list` |
| Schedule meeting | `uni gcal add "Title" --time 2pm` |
| Next event | `uni gcal next` |

---

## Error Handling

- Commands return exit code 0 on success, 1 on failure
- Use `--json` for structured error output
- Use `--verbose` for detailed error messages

## See Also

- [REFERENCE.md](REFERENCE.md) - Complete command reference
- [PATTERNS.md](PATTERNS.md) - Common workflow patterns
