# Google Tasks Service - Developer Knowledge

## Architecture

- **Package**: `packages/service-gtasks/`
- **Auth**: Google OAuth via `@uni/shared` GoogleAuthClient
- **API**: Google Tasks API v1

## Key Implementation Details

### ID Handling
- Task IDs are base64-like strings: `bmpXOFI0SlVPWmIxM1YyaA`
- List IDs are similar: `MTA5OTk0NzcwNzEwMDY0ODc0NDg6MDow`
- IDs shown in list output: `○ Task title  [bmpXOFI0SlVPWmIxM1YyaA]`

### Task Lists
- Default list is `@default` (user's primary "My Tasks")
- Can have multiple lists, each with own ID
- `uni gtasks lists` shows all lists with IDs

### Task Status
- `needsAction` = incomplete (shown as `○`)
- `completed` = done (shown as `✓` with strikethrough)

## Gotchas & Lessons Learned

1. **No confirmation prompts** - `lists delete` had interactive `[y/N]` prompt that blocked agents. Removed entirely - agent-first CLI shouldn't have interactive prompts.

2. **IDs were hidden** - Tasks list didn't show IDs, forcing users to use `--json`. Now shown by default.

3. **findTaskByTitle uses partial match** - `gtasks.findTaskByTitle()` uses `includes()` not exact match. "Buy" matches "Buy groceries".

4. **Completed tasks hidden by default** - Use `--completed` flag to include them in list.

## File Structure
```
src/
├── api.ts          # Tasks API client
├── index.ts        # Service definition
└── commands/
    ├── auth.ts     # OAuth flow
    ├── list.ts     # List tasks (shows IDs)
    ├── add.ts      # Create task
    ├── done.ts     # Mark complete
    ├── undone.ts   # Mark incomplete
    ├── delete.ts   # Delete task
    ├── update.ts   # Update task
    └── lists.ts    # Manage task lists (NO confirmation prompt)
```

## Testing Commands
```bash
uni gtasks list                        # List with IDs
uni gtasks list --completed            # Include completed
uni gtasks add "Test task"             # Create
uni gtasks done "Test task"            # Complete (partial match)
uni gtasks lists                       # Show all lists
uni gtasks lists delete <id>           # Delete list (no prompt!)
```

## API Quirks

- `@default` resolves to user's primary list
- Due dates are date-only (no time), format: `2026-01-15T00:00:00.000Z`
- Task notes limited to plain text
