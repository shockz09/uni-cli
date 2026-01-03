# uni CLI - Common Workflow Patterns

## Getting Started

### First Time Setup

```bash
# Check what's configured and what's missing
uni doctor

# Interactive setup wizard
uni setup

# Or setup specific services
uni setup gcal              # Uses default credentials
uni setup slack --self-host # Create your own Slack app
uni setup notion --self-host
```

### Authenticating Services

```bash
# Google services (gcal, gmail, gdrive, gtasks, gcontacts, gmeet)
uni gcal auth               # Opens browser for OAuth
uni gmail auth
uni gdrive auth
uni gtasks auth
uni gcontacts auth
uni gmeet auth

# Check auth status
uni gcal auth --status
uni gmail auth --status

# Logout when needed
uni gcal auth --logout
```

### Importing Team Credentials

```bash
# Import from URL
uni setup --from https://company.com/uni-creds.json

# Import from local file
uni setup --from ./team-credentials.json

# Import from GitHub Gist
uni setup --from gist:abc123def456
```

---

## Research & Development Workflows

### Learning a New Library

```bash
# 1. Search for overview and docs
uni exa search "Zod TypeScript validation library 2025"

# 2. Get code examples
uni exa code "Zod schema validation examples"

# 3. Find best practices
uni exa research "Zod best practices error handling"
```

### Comparing Technologies

```bash
# Deep research for comprehensive comparison
uni exa research "React vs Vue vs Svelte 2025" --mode deep

# Or quick comparison with more sources
uni exa research "Prisma vs Drizzle ORM" --num 15
```

### Debugging an Issue

```bash
# Search for error message
uni exa search "TypeError: Cannot read property of undefined React"

# Find solutions in code context
uni exa code "React useEffect async cleanup"
```

---

## GitHub Workflows

### Daily PR Review

```bash
# List open PRs assigned to you
uni gh pr list --state open

# View specific PR with details
uni gh pr view 123

# Open in browser for full review
uni gh pr view 123 --web
```

### Creating a Feature PR

```bash
# Check current branch status
uni gh repo view

# Create PR with title and body
uni gh pr create --title "Add user authentication" --body "Implements JWT auth flow"

# Create as draft
uni gh pr create --title "WIP: New feature" --draft
```

### Issue Triage

```bash
# List bugs
uni gh issue list --label bug --state open

# List by priority
uni gh issue list --label "priority:high"

# View and close
uni gh issue view 456
uni gh issue close 456
```

### Quick Clone and Setup

```bash
# Clone a repo
uni gh repo clone owner/repo

# View repo info before cloning
uni gh repo view owner/repo
```

---

## Calendar Workflows

### Morning Routine

```bash
# Check today's schedule
uni gcal list

# See next upcoming event
uni gcal next

# Check the week ahead
uni gcal list --days 7
```

### Scheduling Meetings

```bash
# Quick standup
uni gcal add "Team standup" --time 10am --duration 15m

# Meeting with location
uni gcal add "Client call" --time 2pm --duration 1h --location "Zoom"

# Tomorrow's lunch
uni gcal add "Lunch with Alex" --time 12:30pm --date tomorrow
```

### Planning Ahead

```bash
# Check specific date
uni gcal list --date 2025-01-15

# View next 3 events
uni gcal next --count 3
```

---

## Task Management Workflows

### Daily Task Routine

```bash
# Check what's on your plate
uni gtasks list

# Add tasks as they come up
uni gtasks add "Review PR #123"
uni gtasks add "Call client" --due today
uni gtasks add "Write docs" --due tomorrow --notes "Focus on API section"

# Mark complete as you go
uni gtasks done "Review PR #123"
```

### Organizing with Task Lists

```bash
# Create separate lists for different projects
uni gtasks lists add "Work"
uni gtasks lists add "Personal"
uni gtasks lists add "Side Project"

# Add to specific list
uni gtasks add "Deploy v2" --list Work
uni gtasks add "Grocery shopping" --list Personal

# View list-specific tasks
uni gtasks list --list Work
```

### Task + Calendar Integration

```bash
# Create a flow for morning planning
uni flow add morning "gcal list" "gtasks list"

# Or check both at once
uni run "gcal list" "gtasks list"
```

---

## Contact Management Workflows

### Finding Contact Info

```bash
# Quick lookup by name
uni gcontacts search "John"

# Get full details
uni gcontacts get "John Doe"

# Find by email domain
uni gcontacts search "@company.com"
```

### Building Your Network

```bash
# Add after meeting someone
uni gcontacts add "Jane Smith" --email jane@startup.io --company "Cool Startup"

# Add with phone
uni gcontacts add "Client Bob" --phone "+1-555-0123" --company "BigCorp"
```

### Contact + Email Integration

```bash
# Find contact then email them
uni gcontacts get "John Doe"  # Get their email
uni gmail send john@example.com --subject "Follow up" --body "Great meeting!"
```

---

## Meeting Workflows

### Quick Meeting Link

```bash
# Instant meeting for ad-hoc discussions
uni gmeet create
# Returns: https://meet.google.com/abc-defg-hij

# Named meeting
uni gmeet create --title "Quick sync"
```

### Scheduling Meetings

```bash
# Schedule for tomorrow
uni gmeet schedule "Team standup" --date tomorrow --time 10am

# With attendees
uni gmeet schedule "1:1 with John" --time 3pm --invite john@example.com

# Longer meeting
uni gmeet schedule "Sprint planning" --date 2026-01-10 --time 2pm --duration 90
```

### Meeting Prep Flow

```bash
# Create a flow to prep for meetings
uni flow add meetprep "gmeet list --days 1" "gtasks list"

# Before your next meeting
uni meetprep
```

### Full Meeting Workflow

```bash
# 1. Find the person's contact
uni gcontacts get "John Doe"

# 2. Schedule meeting with them
uni gmeet schedule "Sync with John" --time 3pm --invite john@example.com

# 3. Add follow-up task
uni gtasks add "Prepare agenda for John sync" --due today
```

---

## Saved Flows & Automation

### Morning Standup Flow

Create a flow to check everything at once:

```bash
# Create the flow
uni flow add standup "gcal list" "gh pr list --state open" "gmail list --unread --limit 5"

# Run it every morning
uni standup
```

### PR Review Flow

Check PR status, diff, and CI in one command:

```bash
# Create flow with argument
uni flow add prcheck "gh pr view $1" "gh pr checks $1"

# Use it
uni prcheck 123
```

### End of Day Flow

```bash
# Create flow
uni flow add eod "gh pr list --author @me" "gcal list --date tomorrow"

# Run before leaving
uni eod
```

### Quick Status Check

```bash
# Create flow
uni flow add status "gcal next --count 2" "gh pr list --limit 3" "slack messages general --limit 5"

# Check anytime
uni status
```

### Research Flow

```bash
# Create flow for researching a topic
uni flow add research "exa search '$1'" "exa code '$1'" "exa research '$1'"

# Use it
uni research "GraphQL subscriptions"
```

---

## Multi-Command Execution

### Quick Parallel Checks

Run independent commands in parallel:

```bash
# Check multiple services at once
uni run -p "gh pr list" "gcal list" "gmail list --unread"

# Preview before running
uni run --dry-run "gh pr create" "slack send dev 'PR ready'"
```

### Sequential Operations

Run commands that depend on each other:

```bash
# Create PR then notify team
uni run "gh pr create --title 'Feature'" "slack send dev 'New PR for review'"
```

---

## Multi-Service Workflows

### Starting a New Project

```bash
# 1. Research the stack
uni exa research "best tech stack for SaaS 2025"

# 2. Get code patterns
uni exa code "Next.js 15 project setup"

# 3. Create repo
uni gh repo create my-project --public --clone

# 4. Schedule kickoff
uni gcal add "Project kickoff" --time 10am --duration 1h
```

### Code Review Day

```bash
# 1. Check calendar for meetings
uni gcal list

# 2. List PRs to review
uni gh pr list --state open

# 3. Research unfamiliar patterns
uni exa code "React Server Components patterns"

# Or create a flow for this
uni flow add reviewday "gcal list" "gh pr list --state open"
uni reviewday
```

### Researching a Company/Competitor

```bash
# Company info
uni exa company "Vercel"

# Recent news
uni exa search "Vercel announcements" --num 10

# Technical research
uni exa research "Vercel edge functions vs Cloudflare Workers"
```

---

## Communication Workflows

### Team Updates

```bash
# Check Slack messages
uni slack messages general --limit 10

# Send update
uni slack send dev "Deployed v2.0 to staging"

# Create a flow for status updates
uni flow add notify "slack send dev '$1'"
uni notify "Feature complete, ready for review"
```

### Email Check

```bash
# Quick inbox check
uni gmail list --unread

# Search for important emails
uni gmail list --query "from:boss@company.com"
```

---

## Aliases for Common Commands

### Setup Useful Aliases

```bash
# Quick access to common operations
uni alias add prs "gh pr list --state open"
uni alias add inbox "gmail list --unread"
uni alias add today "gcal list"
uni alias add week "gcal list --days 7"

# Use them
uni prs
uni inbox
uni today
uni week
```

---

## Natural Language Shortcuts

### Using uni ask

```bash
# Instead of remembering exact syntax
uni ask "show my calendar for tomorrow"
uni ask "list open pull requests"
uni ask "search for TypeScript tutorials"

# Interactive mode for exploration
uni ask -i
> show my meetings
> what PRs need review
> exit
```

---

## Utility Workflows

### Quick Weather Check

```bash
# Check weather before going out
uni weather London

# Plan for the week
uni weather "New York" --forecast 7

# Check weather in fahrenheit
uni weather Tokyo --units fahrenheit
```

### Currency Conversion

```bash
# Convert before a purchase
uni currency 100 usd to eur

# Check multiple currencies at once
uni currency 1000 eur to usd gbp jpy

# List all supported currencies
uni currency --list
```

### Sharing Links

```bash
# Shorten a long URL before sharing
uni shorturl "https://very-long-url.com/with/many/parameters"

# Generate QR code for a link
uni qrcode "https://example.com" --output meeting-link.png

# WiFi QR code for guests
uni qrcode --wifi "GuestNetwork:password123"

# Display QR in terminal
uni qrcode "https://example.com" --terminal
```

### Utility Flow Ideas

```bash
# Create a travel prep flow
uni flow add travel "weather $1" "currency 100 usd to $2"

# Use it
uni travel "Tokyo" "jpy"
# Shows Tokyo weather + USD to JPY conversion

# Quick link sharing flow
uni flow add share "shorturl $1" "qrcode $1 --terminal"
uni share "https://mysite.com/long-path"
```

---

## Tips & Tricks

### JSON Output for Scripts

```bash
# Pipe JSON to jq
uni gh pr list --json | jq '.[0].title'

# Use in shell scripts
if uni gh pr list --json | jq -e '.[] | select(.isDraft == false)' > /dev/null; then
  echo "Has non-draft PRs"
fi
```

### Combining with Other Tools

```bash
# Open PR in browser after creating
uni gh pr create --title "Feature" && uni gh pr view --web

# Search and copy to clipboard (macOS)
uni exa search "API docs" --json | jq -r '.[0].url' | pbcopy
```

### Shell Completions

```bash
# Add to ~/.zshrc
eval "$(uni completions zsh)"

# Or for bash
eval "$(uni completions bash)"

# Then use tab completion
uni exa <TAB>  # Shows: search, code, research, company
uni standup <TAB>  # Shows flow arguments
```

### Useful Flow Ideas

| Flow Name | Commands | Use Case |
|-----------|----------|----------|
| `standup` | gcal + gtasks + gh pr | Morning check |
| `prcheck` | gh pr view + checks | Review a PR |
| `eod` | gh pr list + gcal tomorrow | End of day |
| `research` | exa search + code + research | Deep dive on topic |
| `deploy` | gh pr merge + slack notify | Deploy and announce |
| `morning` | gcal list + gtasks list | Daily planning |
| `meetprep` | gmeet list + gtasks list | Before meetings |
| `network` | gcontacts search + gmail list | CRM-style lookup |
| `travel` | weather + currency | Trip preparation |
| `share` | shorturl + qrcode | Share links easily |

### Managing Flows

```bash
# List all flows
uni flow list

# Remove unused flows
uni flow remove oldflow

# Flows are stored in ~/.uni/config.toml
uni config edit
```

---

## Troubleshooting

### Check Service Status

```bash
# Full health check
uni doctor

# JSON output for scripting
uni doctor --json | jq '.services[] | select(.status != "ready")'
```

### Re-authenticate a Service

```bash
# Logout and re-login
uni gcal auth --logout
uni gcal auth

# Check if it worked
uni gcal auth --status
```

### Reset Configuration

```bash
# View config path
uni config path

# Edit config manually
uni config edit

# Or view current config
uni config show
```
