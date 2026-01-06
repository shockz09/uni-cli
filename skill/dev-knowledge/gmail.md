# Gmail Service - Developer Knowledge

## Architecture

- **Package**: `packages/service-gmail/`
- **Auth**: Google OAuth via `@uni/shared` GoogleAuthClient
- **API**: Gmail REST API v1

## Key Implementation Details

### ID Handling
- Gmail message IDs are hex strings like `19b946ae9a072e00`
- IDs are shown in list output: `[19b946ae9a072e00]`
- Use these IDs for `read`, `delete`, `reply` commands

### Search Behavior
- **Default**: Searches ALL mail (not just primary inbox)
- Changed from `category:primary` default to all mail for agent-friendliness
- Use `--primary` flag to limit to primary inbox only
- Gmail search syntax supported: `from:`, `to:`, `subject:`, `has:attachment`, etc.

### List Output
```
● Subject Line
   Sender Name  1/6/2026  [19b946ae9a072e00]
   Snippet preview...
```
- `●` = unread, blank = read
- ID shown after date for easy copy-paste

## Gotchas & Lessons Learned

1. **category:primary was too restrictive** - Agents couldn't find emails in promotions/updates tabs. Changed default to search all mail.

2. **IDs were hidden** - Original implementation only showed IDs in `--json` output. Agents need IDs to delete/read specific emails. Now shown by default.

3. **Snippet truncation** - Snippets are HTML-encoded (`&#39;` etc). Display as-is, don't decode.

## File Structure
```
src/
├── api.ts          # Gmail API client, GoogleAuthClient extension
├── index.ts        # Service definition
└── commands/
    ├── auth.ts     # OAuth flow
    ├── list.ts     # List emails (shows IDs)
    ├── read.ts     # Read full email
    ├── search.ts   # Search (all mail by default)
    ├── send.ts     # Send with attachments
    └── delete.ts   # Move to trash
```

## Testing Commands
```bash
uni gmail list -n 5                    # List with IDs
uni gmail search "flight" -n 3         # Search all mail
uni gmail search "newsletter" --primary # Primary only
uni gmail read 19b946ae9a072e00        # Read by ID
```
