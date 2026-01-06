# Todoist Service - Developer Knowledge

## Architecture

- **Package**: `packages/service-todoist/`
- **Auth**: OAuth via `@uni/shared` OAuthClient
- **API**: Todoist REST API v2

## Critical: API ID vs URL ID

**THIS IS THE #1 GOTCHA**

Todoist has TWO different ID formats:
```json
{
  "id": "2365150716",                    // ← API ID (use this!)
  "url": "https://app.todoist.com/app/project/6fhP7GgpHQWWmxxp"
                                         // ↑ URL ID (DON'T use this!)
}
```

- **API ID**: Numeric string like `2365150716` - works with all commands
- **URL ID**: Base64-like `6fhP7GgpHQWWmxxp` - DOES NOT work with API

### Output Shows Correct ID
```
Fresh Test Project  [2365150716]    ← This ID works
  0 comments | list view
```

We removed URL from output to prevent confusion.

## Key Implementation Details

### ID Handling
- Task IDs: numeric strings like `6682022689`
- Project IDs: numeric strings like `2365150716`
- All shown in brackets in output

### Priority Levels
```
4 = p1 (Urgent) - Red
3 = p2 (High) - Yellow
2 = p3 (Medium) - Cyan
1 = p4 (Low/None) - Dim
```

### Delete by Name or ID
```javascript
// Searches by name first, then checks if input matches ID
const project = projects.find(p =>
  p.name.toLowerCase() === name.toLowerCase() || p.id === name
);
```

## Gotchas & Lessons Learned

1. **URL ID doesn't work** - Biggest issue. Agents would copy ID from URL and get "not found". Fixed by showing only API ID in output.

2. **IDs were hidden** - Tasks/projects list didn't show IDs. Now shown by default.

3. **setup() was spammy** - Had duplicate "Not authenticated" messages. Removed from setup(), each command checks auth.

4. **Numeric ID check was wrong** - Original code: `/^\d+$/.test(name)` assumed all IDs are purely numeric. Changed to search by name first, then use as ID.

## File Structure
```
src/
├── api.ts          # Todoist REST client, OAuthClient
├── index.ts        # Service definition (no setup warnings!)
└── commands/
    ├── auth.ts     # OAuth flow
    ├── tasks.ts    # CRUD tasks (shows IDs)
    ├── projects.ts # CRUD projects (shows API ID, not URL)
    ├── labels.ts   # Manage labels
    └── comments.ts # Task comments
```

## Testing Commands
```bash
uni todoist tasks list                 # List with IDs
uni todoist projects list              # Shows [API_ID]
uni todoist projects create "Test"     # Shows [API_ID] in output
uni todoist projects delete 2365150716 # Use API ID
uni todoist projects delete "Test"     # Or use name
```

## API Notes

- OAuth tokens don't expire (supportsRefresh: false)
- Due dates support natural language: "tomorrow", "next week"
- Filters: "today", "overdue", "p1 | p2"
