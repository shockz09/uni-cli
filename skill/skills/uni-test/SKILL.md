# Uni-CLI Bug Hunt Skill

This skill hunts for bugs and missing features in uni-cli. Only report problems.

## Usage

```
/uni-test
```

## Mission

Find 1-3 issues maximum. If everything works, say "FULLY SATISFIED - no bugs found".

## What To Check

### Critical Checks (always do)
1. **IDs in list output** - Do these show IDs?
   - `uni gmail list --limit 1` → should show `[ID]`
   - `uni gtasks list` → should show `[ID]`
   - `uni todoist tasks --limit 1` → should show `[ID]`

2. **Telegram delete features**
   - Range delete: `uni telegram delete me 10600-10610` (try a range)
   - Text delete: `uni telegram delete me "test message"` (try by text)

3. **Linear error message**
   - `uni linear teams` → should say "Not authenticated. Run 'uni linear auth'"

### If Issues Found

Run targeted commands to reproduce, then send to Telegram:

```
<service-name> feedback:

Context: [Brief - what you were testing]

1. [Issue 1 - specific command + error + expected vs actual]
2. [Issue 2 if any]
...
```

### If No Issues Found

Say nothing. Don't send any message. Just report "FULLY SATISFIED" in your thoughts and move on.

## Don't

- Don't test things that work
- Don't list working features
- Don't spend time confirming
- Only report actual problems

## Quick Run

```bash
# The 3 critical checks
uni gmail list --limit 1
uni gtasks list
uni todoist tasks --limit 1
```

If all show IDs → you're done, report "FULLY SATISFIED"

## Telegram Format

Only send feedback if bugs found. Keep it short:

```
<service-name> feedback:

Context: [Brief]

1. [Issue - command + error + expected vs actual]
```
