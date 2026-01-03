# Phase 15: GSuite Expansion

> Status: PENDING

## Overview

Additional GSuite services to complete the Google ecosystem integration. These services enable reading, creating, and editing Google Sheets, Docs, Slides, Forms, Keep notes, and translations.

**Design Principles:**
- Uses existing Google OAuth credentials (no new auth required)
- Consistent with existing GSuite services (gcal, gmail, gdrive)
- Supports both reading and creating/editing operations
- Human and JSON output formats

---

## Commands

### gsheets

**Google Sheets - Read and write spreadsheet cells.**

```bash
uni gsheets list                            # List recent spreadsheets
uni gsheets get <id>                        # Get sheet metadata
uni gsheets get <id> --data                 # Get all data
uni gsheets get <id> A1:B10                 # Get cell range
uni gsheets get <id> --json                 # JSON output
uni gsheets create "Budget 2025"            # Create new spreadsheet
uni gsheets set <id> A1 "Value"             # Set cell value
uni gsheets set <id> B2 "=SUM(A1:A10)"      # Set formula
uni gsheets append <id> "row data"          # Append row
uni gsheets share <id> colleague@email.com  # Share spreadsheet
uni gsheets rows <id>                       # Count rows
uni gsheets cols <id>                       # Count columns
```

**Arguments:**
| Arg | Required | Description |
|-----|----------|-------------|
| id | No* | Spreadsheet ID or URL. Required for get/set operations. |
| range | No* | Cell range (e.g., A1, A1:B10, Sheet1!A1). |

**Flags:**
| Flag | Type | Description |
|------|------|-------------|
| `--data` | Boolean | Include all sheet data in output |
| `--json` | Boolean | JSON output |
| `--sheet` | String | Specific sheet name (default: first sheet) |
| `--raw` | Boolean | Get raw values (no formulas) |

**Examples:**
```bash
uni gsheets get 1abc123XYZ
# Spreadsheet: Budget 2025
# Sheet: Sheet1
# Cells: A1:E10 (10 rows, 5 cols)

uni gsheets get 1abc123XYZ A1:B5
#   |     A         |     B       |
# 1  | Item          | Amount      |
# 2  | Rent          | $2,000      |
# 3  | Food          | $500        |
# ...

uni gsheets get 1abc123XYZ --json
# {
#   "id": "1abc123XYZ",
#   "name": "Budget 2025",
#   "sheets": [...],
#   "data": [["Item", "Amount"], ...]
# }

uni gsheets set 1abc123XYZ A1 "Total"
# Cell A1 set to "Total"

uni gsheets create "Expenses Q1"
# Created: https://docs.google.com/spreadsheets/d/abc123
# Spreadsheet: Expenses Q1

uni gsheets share 1abc123XYZ teammate@company.com
# Shared with teammate@company.com (editor access)
```

**Implementation:**
- API: Google Sheets API v4
- Auth: Google OAuth (reuses gcal/gmail credentials)
- Format detection: Auto-detects numbers, dates, formulas

---

### gdocs

**Google Docs - Read and edit documents.**

```bash
uni gdocs list                              # List recent documents
uni gdocs get <id>                          # Get document content
uni gdocs get <id> --json                   # JSON output
uni gdocs get <id> --markdown               # Output as markdown
uni gdocs create "Meeting Notes"            # Create new document
uni gdocs append <id> "New paragraph"       # Append text
uni gdocs insert <id> "text" --after "para" # Insert after paragraph
uni gdocs replace <id> "old" "new"          # Replace text
uni gdocs delete <id>                       # Delete document
uni gdocs share <id> colleague@email.com    # Share document
uni gdocs title <id> "New Title"            # Rename document
uni gdocs export <id> pdf                   # Export as PDF
uni gdocs export <id> md --output file.md   # Export as markdown
```

**Arguments:**
| Arg | Required | Description |
|-----|----------|-------------|
| id | No* | Document ID or URL. Required for most operations. |
| text | No* | Text to append/insert/replace. |

**Flags:**
| Flag | Type | Description |
|------|------|-------------|
| `--json` | Boolean | JSON output |
| `--markdown` | Boolean | Output as markdown |
| `--output` | String | Output file path for export |
| `--after` | String | Paragraph marker to insert after |
| `--all` | Boolean | Include all metadata (title, created, modified) |

**Examples:**
```bash
uni gdocs get 1abc123XYZ
# Document: Meeting Notes
# Created: 2025-01-02 | Modified: 2025-01-03
#
# Agenda:
# 1. Review Q4 metrics
# 2. Plan Q1 goals
# 3. Team updates

uni gdocs get 1abc123XYZ --markdown
# # Meeting Notes
# ## Agenda
# 1. Review Q4 metrics
# ...

uni gdocs get 1abc123XYZ --json
# {
#   "id": "1abc123XYZ",
#   "title": "Meeting Notes",
#   "content": "Agenda:\n1. Review Q4 metrics\n...",
#   "createdTime": "2025-01-02T10:00:00Z",
#   "modifiedTime": "2025-01-03T14:30:00Z"
# }

uni gdocs create "Project Plan"
# Created: https://docs.google.com/document/d/def456
# Document: Project Plan

uni gdocs append 1abc123XYZ "\n\nAction Items:\n- [ ] Task 1\n- [ ] Task 2"
# Appended text to document

uni gdocs replace 1abc123XYZ "old text" "new text"
# Replaced 1 occurrence(s)

uni gdocs export 1abc123XYZ pdf --output plan.pdf
# Exported: plan.pdf
```

**Implementation:**
- API: Google Docs API v1
- Auth: Google OAuth (reuses gcal/gmail credentials)
- Content extraction: Text only, no images/formatted tables
- Export formats: PDF, Markdown, Plain text

---

### gslides

**Google Slides - Create and edit presentations.**

```bash
uni gslides list                            # List recent presentations
uni gslides get <id>                        # Get presentation info
uni gslides get <id> --json                 # JSON output
uni gslides create "Q1 Review"              # Create new presentation
uni gslides add-slide <id>                  # Add blank slide
uni gslides add-slide <id> --title "Intro"  # Add slide with title
uni gslides add-text <id> "Hello World"     # Add text to slide
uni gslides add-text <id> "Title" --slide 1 # Add to specific slide
uni gslides set-title <id> "New Title"      # Set presentation title
uni gslides share <id> colleague@email.com  # Share presentation
uni gslides export <id> pdf                 # Export as PDF
uni gslides export <id> pptx                # Export as PPTX
```

**Arguments:**
| Arg | Required | Description |
|-----|----------|-------------|
| id | No* | Presentation ID or URL. Required for most operations. |
| text | No* | Text to add. |

**Flags:**
| Flag | Type | Description |
|------|------|-------------|
| `--json` | Boolean | JSON output |
| `--slide` | Number | Slide number (default: last slide) |
| `--title` | String | Title for new slide |
| `--output` | String | Output file path for export |
| `--theme` | String | Theme for new presentation |

**Examples:**
```bash
uni gslides get 1abc123XYZ
# Presentation: Q1 Review
# Slides: 5
# Created: 2025-01-02

uni gslides get 1abc123XYZ --json
# {
#   "id": "1abc123XYZ",
#   "title": "Q1 Review",
#   "slides": [
#     {"title": "Title Slide", "notes": "..."},
#     {"title": "Overview", "notes": "..."},
#     ...
#   ]
# }

uni gslides create "Product Launch"
# Created: https://docs.google.com/presentation/d/def456
# Presentation: Product Launch
# Slides: 1

uni gslides add-slide 1abc123XYZ --title "Agenda"
# Added slide 2: Agenda

uni gslides add-text 1abc123XYZ "Key Points:\n- Feature 1\n- Feature 2"
# Added text to slide 2

uni gslides export 1abc123XYZ pdf --output presentation.pdf
# Exported: presentation.pdf
```

**Implementation:**
- API: Google Slides API v1
- Auth: Google OAuth (reuses gcal/gmail credentials)
- Limited editing: Add slides, add text, set titles
- Export: PDF, PPTX

---

### gforms

**Google Forms - List and submit forms.**

```bash
uni gforms list                             # List your forms
uni gforms get <id>                         # Get form details
uni gforms get <id> --json                  # JSON output
uni gforms create "Survey Title"            # Create new form
uni gforms add-question <id> "Name" text    # Add text question
uni gforms add-question <id> "Age" number   # Add number question
uni gforms add-question <id> "Rate 1-5" scale  # Add scale question
uni gforms submit <id> "answer1" "answer2"  # Submit responses
uni gforms responses <id>                   # View responses
uni gforms delete <id>                      # Delete form
```

**Arguments:**
| Arg | Required | Description |
|-----|----------|-------------|
| id | No* | Form ID or URL. Required for most operations. |
| answers | No* | Answers to submit (order matches questions). |

**Flags:**
| Flag | Type | Description |
|------|------|-------------|
| `--json` | Boolean | JSON output |
| `--all` | Boolean | Include all form details (questions, settings) |

**Examples:**
```bash
uni gforms list
# My Forms:
# 1. Customer Feedback - 45 responses
# 2. Event Registration - 12 responses
# 3. Team Survey - 8 responses

uni gforms get 1abc123XYZ
# Form: Customer Feedback
# Questions:
# 1. Name (text)
# 2. Rating (scale 1-5)
# 3. Comments (paragraph)
# Responses: 45

uni gforms get 1abc123XYZ --json
# {
#   "id": "1abc123XYZ",
#   "title": "Customer Feedback",
#   "questions": [
#     {"id": "q1", "type": "text", "title": "Name"},
#     {"id": "q2", "type": "scale", "title": "Rating", "min": 1, "max": 5},
#     {"id": "q3", "type": "paragraph", "title": "Comments"}
#   ],
#   "responseCount": 45
# }

uni gforms create "Event Registration"
# Created: https://docs.google.com/forms/d/def456
# Form: Event Registration

uni gforms add-question 1abc123XYZ "Email" text
# Added question: Email (text)

uni gforms add-question 1abc123XYZ "Party Size" number
# Added question: Party Size (number)

uni gforms submit 1abc123XYZ "john@example.com" 2
# Submitted response #46

uni gforms responses 1abc123XYZ
# Responses (45 total):
# 1. john@example.com - Party Size: 2
# 2. jane@company.com - Party Size: 4
# ...
```

**Implementation:**
- API: Google Forms API (limited, read-only for responses)
- Form creation: Creates blank form, questions added via API
- Response submission: Via form URL (pre-filled)
- Response viewing: Linked to Google Sheets (most practical)

---

### gkeep

**Google Keep - Quick notes capture and management.**

```bash
uni gkeep list                              # List all notes
uni gkeep list --labels "work"              # Filter by label
uni gkeep get <id>                          # Get note content
uni gkeep get <id> --json                   # JSON output
uni gkeep add "Buy milk and eggs"           # Create text note
uni gkeep add "Meeting at 3pm" --title "Reminder"  # With title
uni gkeep add "https://link.com" --url      # URL note
uni gkeep add "Image description" --image /path/to/img.jpg  # Image note
uni gkeep delete <id>                       # Delete note
uni gkeep archive <id>                      # Archive note
uni gkeep unarchive <id>                    # Unarchive note
uni gkeep search "milk"                     # Search notes
uni gkeep labels                            # List all labels
```

**Arguments:**
| Arg | Required | Description |
|-----|----------|-------------|
| id | No* | Note ID. Required for get/delete/archive operations. |
| content | Yes | Note content (text or URL). |

**Flags:**
| Flag | Type | Description |
|------|------|-------------|
| `--json` | Boolean | JSON output |
| `--title` | String | Note title |
| `--url` | Boolean | Content is a URL |
| `--image` | String | Path to image to attach |
| `--labels` | String | Comma-separated labels |
| `--trash` | Boolean | Include trashed notes |

**Examples:**
```bash
uni gkeep list
# Notes:
# 1. Buy milk and eggs (labels: shopping)
# 2. Meeting at 3pm (labels: work, reminder)
# 3. https://interesting-link.com (labels: readlater)

uni gkeep list --labels work
# Notes with label 'work':
# 1. Meeting at 3pm (labels: work, reminder)
# 2. Project ideas (labels: work)

uni gkeep get abc123
# Note: Shopping List
# Labels: shopping
# Created: 2025-01-02 | Modified: 2025-01-03
#
# - Milk
# - Eggs
# - Bread

uni gkeep get abc123 --json
# {
#   "id": "abc123",
#   "title": "Shopping List",
#   "content": "- Milk\n- Eggs\n- Bread",
#   "labels": ["shopping"],
#   "created": "2025-01-02T10:00:00Z",
#   "modified": "2025-01-03T14:30:00Z",
#   "isTrashed": false,
#   "isArchived": false
# }

uni gkeep add "Call mom later" --labels personal
# Created note: Call mom later
# Labels: personal

uni gkeep add "https://youtube.com/watch?v=..." --url --labels watchlater
# Created note: https://youtube.com/watch?v=...
# Labels: watchlater

uni gkeep search "milk"
# Search results:
# 1. Buy milk and eggs (shopping)

uni gkeep delete abc123
# Deleted note
```

**Implementation:**
- API: Google Keep API v1
- Auth: Google OAuth (requires `keep` scope)
- Supports: Notes, labels, archive/unarchive, search

---

## Service Discovery

These services are built-in, auto-discovered like others:

```bash
uni list
# ...
# gsheets    Google Sheets             [builtin]
# gdocs      Google Docs               [builtin]
# gslides    Google Slides             [builtin]
# gforms     Google Forms              [builtin]
# gkeep      Google Keep               [builtin]
```

---

## Output Formats

### Human Format (gsheets)
```bash
uni gsheets get 1abc123XYZ A1:B3
# Spreadsheet: Budget 2025
# Sheet: Sheet1
#
#   |     A         |     B       |
# 1  | Item          | Amount      |
# 2  | Rent          | $2,000      |
# 3  | Food          | $500        |
```

### JSON Format (all services)
```bash
uni gsheets get 1abc123XYZ --json
# {
#   "id": "1abc123XYZ",
#   "name": "Budget 2025",
#   "sheets": [...],
#   "data": [["Item", "Amount"], ["Rent", "$2,000"]]
# }
```

---

## Error Handling

| Error | Handling |
|-------|----------|
| No OAuth token | "Not authenticated. Run: uni gcal auth" |
| Permission denied | "Access denied. Check sharing permissions." |
| Resource not found | "Document/Sheet/Form not found." |
| API rate limit | "Too many requests. Wait a moment and try again." |
| Network failure | "Unable to connect. Check internet." |

---

## Files to Create

```
packages/
├── service-gsheets/
│   ├── src/
│   │   ├── index.ts
│   │   └── commands/
│   │       ├── list.ts
│   │       ├── get.ts
│   │       ├── create.ts
│   │       ├── set.ts
│   │       ├── append.ts
│   │       └── share.ts
│   ├── package.json
│   └── README.md
│
├── service-gdocs/
│   ├── src/
│   │   ├── index.ts
│   │   └── commands/
│   │       ├── list.ts
│   │       ├── get.ts
│   │       ├── create.ts
│   │       ├── append.ts
│   │       ├── insert.ts
│   │       ├── replace.ts
│   │       ├── delete.ts
│   │       ├── share.ts
│   │       └── export.ts
│   ├── package.json
│   └── README.md
│
├── service-gslides/
│   ├── src/
│   │   ├── index.ts
│   │   └── commands/
│   │       ├── list.ts
│   │       ├── get.ts
│   │       ├── create.ts
│   │       ├── add-slide.ts
│   │       ├── add-text.ts
│   │       ├── share.ts
│   │       └── export.ts
│   ├── package.json
│   └── README.md
│
├── service-gforms/
│   ├── src/
│   │   ├── index.ts
│   │   └── commands/
│   │       ├── list.ts
│   │       ├── get.ts
│   │       ├── create.ts
│   │       ├── add-question.ts
│   │       ├── submit.ts
│   │       ├── responses.ts
│   │       └── delete.ts
│   ├── package.json
│   └── README.md
│
└── service-gkeep/
    ├── src/
    │   ├── index.ts
    │   └── commands/
    │       ├── list.ts
    │       ├── get.ts
    │       ├── add.ts
    │       ├── delete.ts
    │       ├── archive.ts
    │       ├── search.ts
    │       └── labels.ts
    ├── package.json
    └── README.md
```

---

## Dependencies

```json
{
  "dependencies": {
    "googleapis": "^130.0.0"
  }
}
```

All services use the official `googleapis` package for API interactions.

---

## Configuration

Uses existing Google OAuth configuration. No additional setup required.

Optional overrides in `~/.uni/config.toml`:
```toml
[gsheets]
default_format = "raw"  # or "formatted"

[gdocs]
default_output = "markdown"  # or "text"
```

---

## Testing Checklist

### gsheets
- [ ] `uni gsheets list` shows recent spreadsheets
- [ ] `uni gsheets get <id>` returns metadata
- [ ] `uni gsheets get <id> A1:B10` returns cell range
- [ ] `uni gsheets create "Name"` creates new spreadsheet
- [ ] `uni gsheets set <id> A1 "value"` sets cell value
- [ ] `uni gsheets append <id> "data"` appends row
- [ ] `uni gsheets share <id> email` shares spreadsheet
- [ ] `--json` flag works

### gdocs
- [ ] `uni gdocs list` shows recent documents
- [ ] `uni gdocs get <id>` returns content
- [ ] `uni gdocs get <id> --markdown` outputs markdown
- [ ] `uni gdocs create "Name"` creates new document
- [ ] `uni gdocs append <id> "text"` appends text
- [ ] `uni gdocs replace <id> "old" "new"` replaces text
- [ ] `uni gdocs export <id> pdf` exports PDF
- [ ] `--json` flag works

### gslides
- [ ] `uni gslides list` shows recent presentations
- [ ] `uni gslides get <id>` returns info
- [ ] `uni gslides create "Name"` creates presentation
- [ ] `uni gslides add-slide <id>` adds blank slide
- [ ] `uni gslides add-slide <id> --title "Title"` adds titled slide
- [ ] `uni gslides add-text <id> "text"` adds text
- [ ] `uni gslides export <id> pdf` exports PDF
- [ ] `--json` flag works

### gforms
- [ ] `uni gforms list` shows your forms
- [ ] `uni gforms get <id>` returns form details
- [ ] `uni gforms create "Name"` creates form
- [ ] `uni gforms add-question <id> "Question" type` adds question
- [ ] `uni gforms submit <id> "answer"` submits response
- [ ] `uni gforms responses <id>` shows responses
- [ ] `--json` flag works

### gkeep
- [ ] `uni gkeep list` shows all notes
- [ ] `uni gkeep list --labels "work"` filters by label
- [ ] `uni gkeep get <id>` returns note content
- [ ] `uni gkeep add "content"` creates note
- [ ] `uni gkeep add "content" --title "Title"` creates titled note
- [ ] `uni gkeep delete <id>` deletes note
- [ ] `uni gkeep search "query"` searches notes
- [ ] `--json` flag works

---

## Performance

| Command | Target Response Time |
|---------|---------------------|
| `uni gsheets list` | < 500ms |
| `` | < 300uni gsheets getms |
| `uni gsheets set` | < 500ms |
| `uni gdocs list` | < 500ms |
| `uni gdocs get` | < 300ms |
| `uni gdocs create` | < 1000ms |
| `uni gslides list` | < 500ms |
| `uni gslides get` | < 300ms |
| `uni gforms list` | < 500ms |
| `uni gforms get` | < 300ms |
| `uni gkeep list` | < 500ms |
| `uni gkeep add` | < 500ms |

---

## Why These Commands?

**gsheets** - Terminal spreadsheet editing without opening browser
**gdocs** - Quick doc creation and editing from CLI
**gslides** - Rapid deck creation for presentations
**gforms** - Form responses from scripts/automation
**gkeep** - Quick note capture (like Apple Notes)

These complete the GSuite ecosystem integration.

---

## Related Services

All GSuite services share common infrastructure:
- `service-gcal` - Google Calendar
- `service-gmail` - Gmail
- `service-gdrive` - Google Drive
- `service-gtasks` - Google Tasks
- `service-gcontacts` - Google Contacts
- `service-gmeet` - Google Meet

---

## Future Enhancements

- Batch operations for gsheets
- Rich text editing for gdocs
- Template support for gslides
- Form response analytics
- Keep ↔ Tasks sync
