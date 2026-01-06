# Telegram Service - Developer Knowledge

## Architecture

- **Package**: `packages/service-telegram/`
- **Auth**: Phone number + OTP (MTProto, not Bot API)
- **Library**: GramJS (`telegram` package)
- **Session**: Stored in `~/.uni/tokens/telegram/`

## Key Difference: User API vs Bot API

This service uses **User API (MTProto)**, not Bot API:
- Full account access (read any chat, not just messages to bot)
- Can send as yourself
- Rate limits are stricter
- Requires phone auth, not bot token

## Key Implementation Details

### Message IDs
- Numeric integers: `10680`, `10681`, etc.
- Unique per chat (not globally unique)
- Shown in read output with `--ids` or by default now

### Delete Supports Multiple Modes
```bash
uni telegram delete me 12345          # Single ID
uni telegram delete me 10680-10690    # Range
uni telegram delete me "test message" # Text search (finds & deletes)
```

**Range parsing:**
```javascript
const rangeMatch = input.match(/^(\d+)-(\d+)$/);
if (rangeMatch) {
  // Expand to array [start...end]
}
```

**Text search delete:**
- Searches last 100 messages
- Finds those containing query (case-insensitive)
- Deletes up to `--limit` matches (default 10)

### Special Chat Identifiers
- `me` = Saved Messages
- `@username` = By username
- `+1234567890` = By phone
- Chat title = By name match

## Gotchas & Lessons Learned

1. **GramJS is SLOW for media** - `downloadMedia()` takes ~40 seconds even for small files. Added `--download` flag to make downloads opt-in.

2. **TTY detection for downloads** - Originally auto-downloaded when not piped. Changed to explicit `--download` flag for predictability.

3. **Delete by text is powerful** - Agents can clean up test messages easily: `uni telegram delete me "test"`

4. **Range delete for bulk cleanup** - `10680-10690` deletes 11 messages at once.

5. **Message search is local** - `getMessages()` fetches from Telegram, then we filter locally. Not using Telegram's search API.

## File Structure
```
src/
├── client.ts       # GramJS client setup, session management
├── index.ts        # Service definition
└── commands/
    ├── auth.ts     # Phone + OTP flow
    ├── read.ts     # Read messages (--download flag)
    ├── send.ts     # Send text/files
    ├── edit.ts     # Edit message
    ├── delete.ts   # Delete by ID/range/text
    ├── forward.ts  # Forward messages
    ├── react.ts    # Add reactions
    ├── search.ts   # Search messages
    ├── chats.ts    # List dialogs
    ├── contacts.ts # List contacts
    └── download.ts # Download media
```

## Testing Commands
```bash
uni telegram send me "test 1"
uni telegram send me "test 2"
uni telegram send me "test 3"
uni telegram read me -n 5              # See IDs
uni telegram delete me 10680-10682     # Range delete
uni telegram delete me "test"          # Text search delete
```

## Auth Flow

1. User runs `uni telegram auth`
2. Prompts for phone number
3. Telegram sends OTP
4. User enters OTP
5. Session saved to `~/.uni/tokens/telegram/session`

No OAuth - direct MTProto authentication.

## Rate Limits

GramJS handles flood waits automatically, but:
- Bulk operations should have delays
- Don't spam send messages
- Media downloads are particularly slow
