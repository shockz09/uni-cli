# Google Calendar Service - Developer Knowledge

## Architecture

- **Package**: `packages/service-gcal/`
- **Auth**: Google OAuth via `@uni/shared` GoogleAuthClient
- **API**: Google Calendar API v3

## Key Implementation Details

### Date Handling
```javascript
// Parse date argument
let startDate = new Date();
if (dateStr === 'tomorrow') {
  startDate.setDate(startDate.getDate() + 1);
} else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
  startDate = new Date(dateStr);
}
startDate.setHours(0, 0, 0, 0);

// End date based on --days
const endDate = new Date(startDate);
endDate.setDate(endDate.getDate() + (days - 1));
endDate.setHours(23, 59, 59, 999);
```

**Supported formats:**
- `today` (default)
- `tomorrow`
- `YYYY-MM-DD` (e.g., `2026-01-15`)

### Event Search for Delete
Delete command searches upcoming 14 days by title:
```javascript
const events = await gcal.listEvents({
  timeMin: new Date(),
  timeMax: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  q: searchText,  // Google's search
});
```

### All-Day vs Timed Events
```javascript
const isAllDay = !event.start.dateTime;
// All-day: event.start.date = "2026-01-15"
// Timed: event.start.dateTime = "2026-01-15T10:00:00+05:30"
```

## Gotchas & Lessons Learned

1. **Date bug was NOT a bug** - Agent reported `--date` not working, but testing showed it works fine. Agent likely had no events on tested dates.

2. **Delete by name works** - `uni gcal delete "Meeting"` searches and deletes. No ID needed.

3. **days=1 means same day** - `--days 7` shows 7 days total, not 7 days after today.

4. **Events spanning midnight** - An event from 11:41 PM to 12:11 AM shows under BOTH dates in results.

## File Structure
```
src/
├── api.ts          # Calendar API client
├── index.ts        # Service definition
└── commands/
    ├── auth.ts     # OAuth flow
    ├── list.ts     # List events (date/days args)
    ├── add.ts      # Create event
    ├── next.ts     # Upcoming events
    ├── update.ts   # Modify event
    └── delete.ts   # Delete by name (searches 14 days)
```

## Testing Commands
```bash
uni gcal list                          # Today
uni gcal list --date tomorrow          # Tomorrow
uni gcal list --date 2026-01-15        # Specific date
uni gcal list --days 7                 # Next 7 days
uni gcal add "Test" --time 3pm --duration 30m
uni gcal delete "Test"                 # Delete by name
```

## Natural Time Parsing

The `add` command supports natural times:
- `10am`, `2:30pm`, `14:00`
- Duration: `30m`, `1h`, `1h30m`
- Dates: `tomorrow`, `next monday`, `2026-01-15`
