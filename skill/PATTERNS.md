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
# Google services (gcal, gmail, gdrive, gtasks, gcontacts, gmeet, gsheets, gdocs, gslides, gforms)
uni gcal auth               # Opens browser for OAuth
uni gmail auth
uni gdrive auth
uni gtasks auth
uni gcontacts auth
uni gmeet auth
uni gsheets auth
uni gdocs auth
uni gslides auth
uni gforms auth
# uni gkeep auth            # Plugin - Workspace accounts only

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

### Fixing Event Names

```bash
# Rename ambiguous events
uni gcal update "Flight Check-in" --title "Web Check-in: 6E 906"

# Update location
uni gcal update "Team Sync" --location "Zoom"

# Fix typos quickly
uni gcal update "Standpu" -t "Standup"
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
uni flow add standup "gcal list" "gtasks list" "gmail list --unread --limit 5"

# Run it every morning
uni standup
```

### Morning Check Flow

Check weather and calendar in one command:

```bash
# Create flow with location argument
uni flow add morning "weather London" "gcal next --count 3"

# Use it
uni morning
```

### End of Day Flow

```bash
# Create flow
uni flow add eod "gtasks list" "gcal list --date tomorrow"

# Run before leaving
uni eod
```

### Quick Status Check

```bash
# Create flow
uni flow add status "gcal next --count 2" "gtasks list --limit 3" "slack messages general --limit 5"

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
uni run -p "gtasks list" "gcal list" "gmail list --unread"

# Preview before running
uni run --dry-run "gcal add 'Meeting'" "slack send dev 'Meeting scheduled'"
```

### Sequential Operations

Run commands that depend on each other:

```bash
# Add task then notify team
uni run "gtasks add 'Review feature'" "slack send dev 'New task created'"
```

### Brace Expansion

Send multiple messages or run batches efficiently:

```bash
# Send 5 numbered messages
uni run "wa send me update{1..5}"

# Test multiple endpoints
uni run "weather {London,Paris,Tokyo}"

# Notify multiple channels
uni run "slack send {general,dev,design} 'Announcement'"
```

### Conditional Execution

Chain commands based on success/failure:

```bash
# Only notify if calendar add succeeds
uni run "gcal add 'Meeting' && slack send dev 'Meeting scheduled'"

# Fallback on failure
uni run "weather London || telegram send me 'Weather check failed'"
```

### Batch from File

Read commands from a file:

```bash
# Create a batch file
cat > daily.txt << 'EOF'
# Morning routine
gcal list
gtasks list
gmail list --unread
EOF

# Execute batch
uni run --file daily.txt
```

### Retry on Failure

Retry flaky commands with exponential backoff:

```bash
# Retry up to 3 times (waits 1s, 2s, 4s between attempts)
uni run --retry 3 "external-api-command"
```

### Piping Output

Send command output to messaging services:

```bash
# Send weather to yourself
uni run "weather London | telegram send me"
uni run "weather Tokyo | wa send me"

# Send stock info
uni run "stocks AAPL | slack send trading"

# Send calendar to team
uni run "gcal list | slack send team"

# Chain multiple pipes
uni run "exa search 'AI news' | telegram send me"
```

### Smart Message Forwarding

Forward messages between services (including media):

```bash
# Forward Telegram saved messages to WhatsApp
uni run "telegram read me --limit 5 | wa send me"

# Forward to Slack
uni run "telegram read @channel --limit 10 | slack send general"

# How it works:
# - Each message forwarded separately
# - Media (images, files) auto-downloaded and sent
# - Text messages sent as-is
```

---

## Multi-Service Workflows

### Starting a New Project

```bash
# 1. Research the stack
uni exa research "best tech stack for SaaS 2025"

# 2. Get code patterns
uni exa code "Next.js 15 project setup"

# 3. Add tasks for project setup
uni gtasks add "Set up project repository"
uni gtasks add "Configure CI/CD"

# 4. Schedule kickoff
uni gcal add "Project kickoff" --time 10am --duration 1h
```

### Productive Morning

```bash
# 1. Check calendar for meetings
uni gcal list

# 2. List pending tasks
uni gtasks list

# 3. Research unfamiliar patterns
uni exa code "React Server Components patterns"

# Or create a flow for this
uni flow add morning "gcal list" "gtasks list"
uni morning
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

## Telegram Workflows

### Getting Started

```bash
# Authenticate with phone + OTP
uni telegram auth

# Logout when needed
uni telegram logout
```

### Reading Messages

```bash
# List all chats
uni telegram chats

# Read messages from a chat (by name, username, phone, or ID)
uni telegram read "Family Group"
uni telegram read @username
uni telegram read 777000 -n 5

# Search messages across all chats
uni telegram search "meeting notes"

# Search in specific chat
uni telegram search "project" -c "Work Group"
```

### Sending Messages

```bash
# Send by name
uni telegram send "Family Group" "Dinner at 7?"

# Send by username
uni telegram send @friend "Hey!"

# Send by ID
uni telegram send 777000 "Test message"
```

### Sending Files

```bash
# Send a file
uni telegram send me --file ./screenshot.png

# File with caption
uni telegram send "Work Chat" "Here's the report" -f report.pdf
```

### Message Actions

```bash
# Reply to a message
uni telegram send @user "Thanks!" --reply 12345

# Edit your message
uni telegram edit @user 12345 "Fixed typo"

# Delete a message
uni telegram delete @user 12345

# Forward to another chat
uni telegram forward @source 12345 @dest

# React to message
uni telegram react @user 12345 "👍"
```

### Media & Contacts

```bash
# List contacts
uni telegram contacts

# Search contacts
uni telegram contacts "john"

# Download media from a message
uni telegram download "Group Name" 12345 -o ./downloads
```

---

## WhatsApp Workflows

### Getting Started

```bash
# Authenticate with pairing code
uni wa auth

# Check daemon status
uni wa status

# Logout
uni wa logout
```

### Sending Messages

```bash
# Send to self (notes to self)
uni wa send me "Remember to buy milk"

# Send to phone number
uni wa send 919876543210 "Hello!"

# Send with file
uni wa send me -f photo.jpg "Check this out"
```

### Message Actions

```bash
# Edit sent message (need message ID from send output)
uni wa edit me ABC123 "Fixed typo"

# Delete message
uni wa delete me ABC123

# React to message
uni wa react me ABC123 "👍"

# Forward message
uni wa forward me 919876543210 ABC123
```

### Chats

```bash
# List recent chats
uni wa chats

# List more chats
uni wa chats -n 50
```

### Daemon Control

```bash
# First command auto-starts daemon (~12s)
# Subsequent commands are fast (~35ms)

# Check status
uni wa status

# Stop daemon manually (auto-stops after 30min idle)
uni wa stop
```

---

## Linear Workflows

### Daily Issue Triage

```bash
# Check your open issues
uni linear issues

# Filter by team
uni linear issues list --team ENG

# Close completed issues
uni linear issues close ENG-123

# Search for related issues
uni linear issues search "authentication"
```

### Sprint Planning

```bash
# Check all projects
uni linear projects

# Create issues for sprint
uni linear issues create "Implement feature X" -t ENG -p 2
uni linear issues create "Fix bug Y" -t ENG -p 1

# Add context to issues
uni linear comments add ENG-123 "Needs design review first"
```

---

## Todoist Workflows

### Daily Task Management

```bash
# Check today's tasks
uni todoist tasks list --filter today

# Check overdue
uni todoist tasks list --filter overdue

# Add quick task
uni todoist tasks add "Review PR" --due today

# Complete tasks as you go
uni todoist tasks done "Review PR"
```

### Project Organization

```bash
# Create project structure
uni todoist projects create "Q1 Goals"
uni todoist labels create "priority"
uni todoist labels create "waiting"

# Add tasks to project
uni todoist tasks add "Define OKRs" -p "Q1 Goals" --priority 4
```

---

## Spotify Workflows (Plugin)

### Getting Started

```bash
# Authenticate (default app embedded, no setup needed)
uni spotify auth

# Check status
uni spotify auth --status

# Use your own Spotify app (optional)
uni spotify auth --setup
```

### What's Playing

```bash
# Show currently playing
uni spotify now

# Live updates
uni spotify now --watch
```

### Search Music

```bash
# Search for tracks
uni spotify search "Bohemian Rhapsody"

# Search artists
uni spotify search "Queen" --type artist

# Search albums
uni spotify search "Abbey Road" --type album

# Search playlists
uni spotify search "Chill" --type playlist -n 20
```

### Playback Control (Premium Only)

```bash
# Play/resume
uni spotify play

# Search and play
uni spotify play "Bohemian Rhapsody"

# Play album
uni spotify play "Abbey Road" --album

# Play playlist
uni spotify play "Discover Weekly" --playlist

# Pause
uni spotify pause

# Next/previous
uni spotify next
uni spotify prev

# Volume
uni spotify volume 50
```

### Queue & Devices

```bash
# Add to queue
uni spotify queue "Stairway to Heaven"

# List devices
uni spotify devices

# Switch device
uni spotify devices --transfer <device-id>
```

### Playlists

```bash
# List your playlists
uni spotify playlists

# View playlist tracks
uni spotify playlists <playlist-id>
```

### Music Flow Ideas

```bash
# Create a "vibe check" flow
uni flow add vibe "spotify now" "spotify playlists -n 5"

# Quick play flow
uni flow add music "spotify play '$1'"
uni music "jazz vibes"
```

---

## Stripe Workflows (Plugin)

### Getting Started

```bash
# Set API key
uni stripe auth sk_test_xxx

# Or use environment variable
export STRIPE_SECRET_KEY="sk_test_xxx"

# Check status
uni stripe auth --status
```

### Check Balance

```bash
uni stripe balance
```

### Create Payment Links

```bash
# Quick payment link
uni stripe link 50                    # $50 link
uni stripe link 99.99 -d "Service"    # With description
uni stripe link 100 -c eur            # Different currency

# List existing links
uni stripe link --list
```

### Manage Payments

```bash
# List recent payments
uni stripe payments

# View specific payment
uni stripe payments pi_xxx

# Process refund
uni stripe refunds pi_xxx
uni stripe refunds pi_xxx -a 25       # Partial refund
```

### Customers & Invoices

```bash
# Create customer
uni stripe customers john@example.com -n "John Doe"

# Create and send invoice
uni stripe invoices create -c cus_xxx -a 100 -d "Consulting"
uni stripe invoices send in_xxx
```

### Subscriptions

```bash
# List subscriptions
uni stripe subs

# Cancel subscription
uni stripe subs cancel sub_xxx
```

### Products

```bash
# List products with prices
uni stripe products --prices

# Create product
uni stripe products "Pro Plan" -d "Full access"
```

---

## Trello Workflows

### Kanban Board Flow (Plugin)

```bash
# Requires: uni plugins install trello
uni trello boards

# Check cards in a board
uni trello cards list "Sprint Board"

# See specific list
uni trello cards list "Sprint Board" -l "In Progress"

# Move cards between lists
uni trello cards move "Sprint Board" "Fix login" "Done"
```

### Board Setup

```bash
# Create new board
uni trello boards create "New Project"

# Add lists
uni trello lists create "New Project" "Backlog"
uni trello lists create "New Project" "In Progress"
uni trello lists create "New Project" "Done"

# Add initial cards
uni trello cards create "New Project" "Backlog" "Setup CI/CD"
uni trello cards create "New Project" "Backlog" "Write docs"
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

# Full-text search (finds in subject, body, sender)
uni gmail search "flight booking"
uni gmail search "indigo PNR"
uni gmail search "invoice" -n 20

# Read a specific email
uni gmail read "Your Booking is Ticketed"
uni gmail read "from:amazon order confirmation"

# Send email with attachment
uni gmail send -t user@example.com -s "Report" -b "See attached" --attach report.pdf

# Multiple attachments
uni gmail send -t user@example.com -s "Photos" -b "Here are the files" -a doc1.pdf -a doc2.pdf
```

---

## Aliases for Common Commands

### Setup Useful Aliases

```bash
# Quick access to common operations
uni alias add inbox "gmail list --unread"
uni alias add today "gcal list"
uni alias add week "gcal list --days 7"
uni alias add todos "gtasks list"

# Use them
uni inbox
uni today
uni week
uni todos
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
uni gcal list --json | jq '.[0].summary'

# Use in shell scripts
if uni gtasks list --json | jq -e '.[] | select(.status == "needsAction")' > /dev/null; then
  echo "Has pending tasks"
fi
```

### Combining with Other Tools

```bash
# Search and copy to clipboard (macOS)
uni exa search "API docs" --json | jq -r '.[0].url' | pbcopy

# Create event and notify
uni gcal add "Team meeting" --time 3pm && uni slack send general "Meeting scheduled at 3pm"
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
| `standup` | gcal + gtasks + gmail | Morning check |
| `eod` | gtasks list + gcal tomorrow | End of day |
| `research` | exa search + code + research | Deep dive on topic |
| `morning` | gcal list + gtasks list | Daily planning |
| `meetprep` | gmeet list + gtasks list | Before meetings |
| `network` | gcontacts search + gmail list | CRM-style lookup |
| `travel` | weather + currency | Trip preparation |
| `share` | shorturl + qrcode | Share links easily |
| `docreport` | gdocs create + append | Create reports |
| `surveyme` | gforms create + add-question | Quick surveys |
| `deckexport` | gslides export pdf | Export presentations |
| `notify` | slack send + gmail send | Multi-channel notify |

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

## GSuite Document Workflows

### Creating a Report

```bash
# 1. Create a new document
uni gdocs create "Weekly Report"

# 2. Add content
uni gdocs append <id> "## Summary\n\nThis week we accomplished..."

# 3. Export as PDF for sharing
uni gdocs export <id> pdf -o weekly-report.pdf

# 4. Share with team
uni gdocs share <id> team@company.com --role reader
```

### Managing Spreadsheet Data

```bash
# 1. Create a budget spreadsheet
uni gsheets create "Q1 Budget"

# 2. Set headers
uni gsheets set <id> A1 "Category"
uni gsheets set <id> B1 "Amount"
uni gsheets set <id> C1 "Notes"

# 3. Add data rows
uni gsheets append <id> "A:C" "Marketing,5000,Ad campaigns"
uni gsheets append <id> "A:C" "Engineering,15000,Tools and infra"

# 4. Read back data
uni gsheets get <id> --range "A1:C10"
```

### Presentation Workflow

```bash
# 1. Create presentation
uni gslides create "Product Launch"

# 2. Add slides with content
uni gslides add-slide <id>
uni gslides add-text <id> "Welcome to Product X" --slide 1

uni gslides add-slide <id>
uni gslides add-text <id> "Key Features" --slide 2

# 3. Export for offline viewing
uni gslides export <id> pptx -o launch-deck.pptx

# 4. Share with stakeholders
uni gslides share <id> ceo@company.com --role reader
```

### Survey/Form Workflow

```bash
# 1. Create a feedback form
uni gforms create "Product Feedback"

# 2. Add questions
uni gforms add-question <id> "Your name" text -r
uni gforms add-question <id> "How satisfied are you?" scale --low 1 --high 10
uni gforms add-question <id> "What could we improve?" paragraph
uni gforms add-question <id> "Would you recommend us?" choice --choices "Yes,No,Maybe"

# 3. Get the form URL to share
uni gforms get <id>
# → Response URL: https://docs.google.com/forms/d/e/.../viewform

# 4. Check responses later
uni gforms responses <id>
```

### Cross-Service Document Flow

```bash
# Create a flow for weekly reporting
uni flow add weekly-report \
  "gdocs create 'Week $1 Report'" \
  "gsheets get <budget-id> --range 'A1:D10'"

# Use it
uni weekly-report 42
```

### Document Search and Export

```bash
# 1. Find a document by name
uni gdocs list | grep -i "meeting"

# 2. Get the content
uni gdocs get <id> --text

# 3. Export in multiple formats
uni gdocs export <id> pdf -o meeting-notes.pdf
uni gdocs export <id> md -o meeting-notes.md
```

### Spreadsheet Formula Example

```bash
# Create a spreadsheet with formulas
uni gsheets create "Sales Calculator"

# Set up data
uni gsheets set <id> A1 "Price"
uni gsheets set <id> B1 "Quantity"
uni gsheets set <id> C1 "Total"
uni gsheets set <id> A2 "100"
uni gsheets set <id> B2 "5"
uni gsheets set <id> C2 "=A2*B2"  # Formula!

# Check the calculated value
uni gsheets get <id> --range "C2"
# → 500
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
