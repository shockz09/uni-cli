# uni-cli Developer Knowledge Base

Deep implementation knowledge for each service, extracted from development sessions.

## Quick Reference

| File | Services | Key Knowledge |
|------|----------|---------------|
| [cli-core.md](cli-core.md) | CLI framework | Spinner non-TTY fix, output system |
| [google-shared.md](google-shared.md) | All Google | OAuth, shared auth, scopes |
| [gmail.md](gmail.md) | Gmail | IDs in output, search all mail |
| [gcal.md](gcal.md) | Calendar | Date parsing, delete by name |
| [gtasks.md](gtasks.md) | Tasks | No confirmation prompts, IDs |
| [todoist.md](todoist.md) | Todoist | API ID vs URL ID (critical!) |
| [linear.md](linear.md) | Linear | Token expiry, auto-logout |
| [telegram.md](telegram.md) | Telegram | Delete range/text, GramJS |
| [whatsapp.md](whatsapp.md) | WhatsApp | Daemon architecture, auth issues |
| [slack-notion.md](slack-notion.md) | Slack, Notion | Env var auth |
| [exa.md](exa.md) | Exa | MCP vs direct API |
| [utilities.md](utilities.md) | Weather, Currency, etc. | Small stateless services |

## Top Lessons Learned

### Agent Compatibility (Most Important)

1. **Show IDs by default** - Agents need IDs to reference items
2. **No interactive prompts** - `[y/N]` confirmations block agents
3. **Spinner output in non-TTY** - Must show success/fail even when piped
4. **Search inclusively** - Don't filter by default (gmail category:primary)
5. **Clear error messages** - Tell user exactly how to fix

### Common Gotchas

1. **API ID vs URL ID** (Todoist) - Different formats, only API ID works
2. **Token expiry** (Linear) - Auto-logout on 401, clear message
3. **Duplicate messages** - Don't warn in both setup() and command handler
4. **GramJS is slow** - Media downloads take 40+ seconds

## How to Use This Knowledge

When working on a service:
1. Read the relevant `.md` file first
2. Check "Gotchas & Lessons Learned" section
3. Follow existing patterns for similar operations
4. Test in both TTY and non-TTY modes

## Adding New Knowledge

When you discover something important:
1. Add to the relevant service file
2. If it's cross-cutting, add to `cli-core.md`
3. Update "Top Lessons Learned" if it's a pattern
