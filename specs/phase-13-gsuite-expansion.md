# Phase 13: GSuite Expansion

## Objective
Add three new Google services: Tasks, Contacts, and Meet.

## Deliverables

### 1. Google Tasks (gtasks)
- [x] Package: `packages/service-gtasks/`
- [x] API client with OAuth
- [x] Commands implementation
- [x] Update SKILL.md

### 2. Google Contacts (gcontacts)
- [x] Package: `packages/service-gcontacts/`
- [x] API client with OAuth (People API)
- [x] Commands implementation
- [x] Update SKILL.md

### 3. Google Meet (gmeet)
- [x] Package: `packages/service-gmeet/`
- [x] API client (uses Calendar API for meet links)
- [x] Commands implementation
- [x] Update SKILL.md

---

## Service 1: Google Tasks (gtasks)

### API
- **API**: Google Tasks API
- **Base URL**: `https://tasks.googleapis.com/tasks/v1`
- **Scopes**: `https://www.googleapis.com/auth/tasks`
- **Docs**: https://developers.google.com/tasks/reference/rest

### Commands

#### `uni gtasks list`
List tasks from default or specified list.

```bash
uni gtasks list [options]

Options:
  --list, -l <id>        Task list ID (default: @default)
  --completed            Include completed tasks
  --limit <n>            Max tasks (default: 20)

Examples:
  uni gtasks list
  uni gtasks list --completed
  uni gtasks list --list "Work"
```

#### `uni gtasks add`
Add a new task.

```bash
uni gtasks add <title> [options]

Options:
  --list, -l <id>        Task list ID (default: @default)
  --notes, -n <text>     Task notes/description
  --due, -d <date>       Due date (today, tomorrow, YYYY-MM-DD)

Examples:
  uni gtasks add "Buy groceries"
  uni gtasks add "Finish report" --due tomorrow
  uni gtasks add "Call mom" --notes "Ask about weekend plans"
```

#### `uni gtasks done`
Mark task as completed.

```bash
uni gtasks done <task-id|title>

Examples:
  uni gtasks done "Buy groceries"
  uni gtasks done abc123
```

#### `uni gtasks delete`
Delete a task.

```bash
uni gtasks delete <task-id|title> [--force]

Examples:
  uni gtasks delete "Old task"
  uni gtasks delete abc123 --force
```

#### `uni gtasks lists`
Manage task lists.

```bash
uni gtasks lists                    # List all task lists
uni gtasks lists add <name>         # Create new list
uni gtasks lists delete <id>        # Delete list

Examples:
  uni gtasks lists
  uni gtasks lists add "Work"
  uni gtasks lists add "Personal"
```

#### `uni gtasks auth`
Authenticate with Google Tasks.

```bash
uni gtasks auth
uni gtasks auth --status
uni gtasks auth --logout
```

---

## Service 2: Google Contacts (gcontacts)

### API
- **API**: Google People API
- **Base URL**: `https://people.googleapis.com/v1`
- **Scopes**: `https://www.googleapis.com/auth/contacts.readonly`, `https://www.googleapis.com/auth/contacts`
- **Docs**: https://developers.google.com/people/api/rest

### Commands

#### `uni gcontacts list`
List contacts.

```bash
uni gcontacts list [options]

Options:
  --limit, -l <n>        Max contacts (default: 20)
  --group <name>         Filter by group/label

Examples:
  uni gcontacts list
  uni gcontacts list --limit 50
  uni gcontacts list --group "Work"
```

#### `uni gcontacts search`
Search contacts by name, email, or phone.

```bash
uni gcontacts search <query>

Examples:
  uni gcontacts search "John"
  uni gcontacts search "john@example.com"
  uni gcontacts search "+91"
```

#### `uni gcontacts get`
Get contact details.

```bash
uni gcontacts get <name|email>

Examples:
  uni gcontacts get "John Doe"
  uni gcontacts get "john@example.com"
```

#### `uni gcontacts add`
Add a new contact.

```bash
uni gcontacts add <name> [options]

Options:
  --email, -e <email>    Email address
  --phone, -p <phone>    Phone number
  --company, -c <name>   Company name

Examples:
  uni gcontacts add "John Doe" --email john@example.com
  uni gcontacts add "Jane" --phone "+91-9876543210" --company "Acme Inc"
```

#### `uni gcontacts delete`
Delete a contact.

```bash
uni gcontacts delete <name|email> [--force]

Examples:
  uni gcontacts delete "John Doe"
  uni gcontacts delete "old@email.com" --force
```

#### `uni gcontacts auth`
Authenticate with Google Contacts.

```bash
uni gcontacts auth
uni gcontacts auth --status
uni gcontacts auth --logout
```

---

## Service 3: Google Meet (gmeet)

### API
- **API**: Google Calendar API (Meet links are created via Calendar)
- **Scopes**: `https://www.googleapis.com/auth/calendar.events`
- **Note**: Meet links are generated when creating calendar events with conferenceData

### Commands

#### `uni gmeet create`
Create an instant meeting link.

```bash
uni gmeet create [options]

Options:
  --title, -t <name>     Meeting title (default: "Quick Meeting")
  --duration, -d <mins>  Duration in minutes (default: 30)

Examples:
  uni gmeet create
  uni gmeet create --title "Standup"
  uni gmeet create --title "Interview" --duration 60
```

Output:
```
Meeting: Standup
Link: https://meet.google.com/abc-defg-hij
Time: Now - 30 mins
```

#### `uni gmeet schedule`
Schedule a meeting for later.

```bash
uni gmeet schedule <title> [options]

Options:
  --date <date>          Date (today, tomorrow, YYYY-MM-DD)
  --time <time>          Time (e.g., 2pm, 14:00)
  --duration, -d <mins>  Duration (default: 30)
  --invite <emails>      Comma-separated emails to invite

Examples:
  uni gmeet schedule "Team Sync" --date tomorrow --time 10am
  uni gmeet schedule "1:1" --time 3pm --invite john@example.com
  uni gmeet schedule "Review" --date 2026-01-10 --time 2pm --duration 60
```

#### `uni gmeet list`
List upcoming meetings with Meet links.

```bash
uni gmeet list [options]

Options:
  --days <n>             Days to look ahead (default: 7)

Examples:
  uni gmeet list
  uni gmeet list --days 14
```

#### `uni gmeet auth`
Uses same auth as gcal (shared Google OAuth).

```bash
uni gmeet auth
uni gmeet auth --status
uni gmeet auth --logout
```

---

## Shared Infrastructure

### OAuth Token Reuse
All Google services can share the same OAuth flow but need different scopes:
- Store tokens per service in `~/.uni/tokens/<service>.json`
- When adding new scope, may need re-auth

### API Enablement
User needs to enable these APIs in Google Cloud Console:
- Tasks API: https://console.cloud.google.com/apis/library/tasks.googleapis.com
- People API: https://console.cloud.google.com/apis/library/people.googleapis.com
- Calendar API: Already enabled (for gcal/gmeet)

### Error Handling
- 403: API not enabled → show enable link
- 401: Token expired → auto-refresh
- 404: Resource not found → friendly message

---

## File Structure

```
packages/
├── service-gtasks/
│   ├── src/
│   │   ├── index.ts
│   │   ├── api.ts
│   │   └── commands/
│   │       ├── list.ts
│   │       ├── add.ts
│   │       ├── done.ts
│   │       ├── delete.ts
│   │       ├── lists.ts
│   │       └── auth.ts
│   └── package.json
│
├── service-gcontacts/
│   ├── src/
│   │   ├── index.ts
│   │   ├── api.ts
│   │   └── commands/
│   │       ├── list.ts
│   │       ├── search.ts
│   │       ├── get.ts
│   │       ├── add.ts
│   │       ├── delete.ts
│   │       └── auth.ts
│   └── package.json
│
└── service-gmeet/
    ├── src/
    │   ├── index.ts
    │   ├── api.ts
    │   └── commands/
    │       ├── create.ts
    │       ├── schedule.ts
    │       ├── list.ts
    │       └── auth.ts
    └── package.json
```

---

## Implementation Order

1. **gtasks** - Simple CRUD, good starting point
2. **gcontacts** - People API is straightforward
3. **gmeet** - Builds on existing gcal infrastructure

---

## Success Criteria

- [ ] All three services working with OAuth
- [ ] Commands match spec above
- [ ] Error handling for API not enabled
- [ ] SKILL.md updated with new services
- [ ] `uni doctor` shows new services status
- [ ] Tokens stored correctly in ~/.uni/tokens/

---

## Testing Checklist

### gtasks
- [ ] List default task list
- [ ] Add task with due date
- [ ] Mark task as done
- [ ] Delete task
- [ ] Create/list/delete task lists

### gcontacts
- [ ] List contacts
- [ ] Search by name/email
- [ ] Get contact details (email, phone)
- [ ] Add new contact
- [ ] Delete contact

### gmeet
- [ ] Create instant meeting (get link)
- [ ] Schedule meeting for later
- [ ] List upcoming meetings with links
- [ ] Invite attendees
