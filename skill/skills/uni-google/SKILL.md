---
name: uni-google
description: |
  Google Suite via uni CLI. Use when user mentions: calendar, events, schedule, meetings, Gmail, email, Drive, files, Sheets, spreadsheet, Docs, documents, Slides, presentations, Forms, surveys, Meet, video call, Tasks, todos, Contacts.
  Trigger words: calendar, gcal, gmail, email, drive, sheets, docs, slides, forms, meet, tasks, contacts, google.
  Services: gcal, gmail, gdrive, gsheets, gdocs, gslides, gforms, gmeet, gtasks, gcontacts.
allowed-tools: Bash(uni:*), Bash(~/.local/bin/uni:*)
---

# Google Suite (uni)

All Google services use OAuth. Run `uni <service> auth` to authenticate.

## Calendar (gcal)

```bash
uni gcal list                           # Today's events
uni gcal list --date tomorrow           # Tomorrow
uni gcal list --days 7                  # Next 7 days
uni gcal add "Meeting" --time 10am --duration 30m
uni gcal add "Lunch" --time 12:30pm --date tomorrow
uni gcal next                           # Next event
uni gcal update "Meeting" --title "Team Sync"
uni gcal delete "Cancelled Meeting"
```

## Tasks (gtasks)

```bash
uni gtasks list                         # Default list
uni gtasks list --completed             # Include completed
uni gtasks add "Buy groceries"
uni gtasks add "Report" --due tomorrow
uni gtasks done "Buy groceries"         # Mark done
uni gtasks delete "Old task"
uni gtasks lists                        # All task lists
```

## Gmail

```bash
uni gmail list                          # Recent emails
uni gmail list --unread                 # Unread only
uni gmail search "flight booking"       # Search
uni gmail read <id-or-query>            # Read email
uni gmail send -t to@email.com -s "Subject" -b "Body"
uni gmail send -t to@email.com -s "Report" --attach file.pdf
uni gmail delete "Newsletter"           # Trash
```

## Drive (gdrive)

```bash
uni gdrive list                         # List files
uni gdrive search "report"              # Search
uni gdrive upload ./file.pdf            # Upload
uni gdrive download <id-or-name>        # Download
uni gdrive share <id> user@email.com    # Share
uni gdrive delete <id>                  # Delete
```

## Sheets (gsheets)

```bash
uni gsheets list                        # List spreadsheets
uni gsheets get <id>                    # Get data
uni gsheets get <id> --range "A1:C10"   # Specific range
uni gsheets create "Budget 2025"        # Create
uni gsheets set <id> A1 "Hello"         # Set cell
uni gsheets append <id> "A:A" "New row" # Append
uni gsheets share <id> user@email.com
```

## Docs (gdocs)

```bash
uni gdocs list                          # List docs
uni gdocs get <id>                      # Get content
uni gdocs get <id> --text               # Plain text
uni gdocs create "Meeting Notes"        # Create
uni gdocs append <id> "New paragraph"   # Append
uni gdocs export <id> pdf               # Export (pdf/docx/md)
uni gdocs share <id> user@email.com
```

## Slides (gslides)

```bash
uni gslides list                        # List presentations
uni gslides get <id>                    # Get info
uni gslides create "Q1 Review"          # Create
uni gslides add-slide <id>              # Add slide
uni gslides add-text <id> "Hello"       # Add text
uni gslides export <id> pdf             # Export (pdf/pptx)
uni gslides share <id> user@email.com
```

## Forms (gforms)

```bash
uni gforms list                         # List forms
uni gforms get <id>                     # Get questions
uni gforms create "Survey"              # Create
uni gforms add-question <id> "Name" text
uni gforms add-question <id> "Rating" scale --low 1 --high 5
uni gforms responses <id>               # View responses
uni gforms share <id> user@email.com
```

## Meet (gmeet)

```bash
uni gmeet create                        # Instant meeting
uni gmeet create --title "Standup"      # Named
uni gmeet schedule "Sync" --date tomorrow --time 10am
uni gmeet list                          # Upcoming meetings
uni gmeet delete "Team Sync"            # Cancel
```

## Contacts (gcontacts)

```bash
uni gcontacts list                      # List contacts
uni gcontacts search "John"             # Search
uni gcontacts get "John Doe"            # Details
uni gcontacts add "John" --email j@example.com
uni gcontacts delete "Old Contact"
```
