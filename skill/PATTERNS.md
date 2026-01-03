# uni CLI - Common Workflow Patterns

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
```
