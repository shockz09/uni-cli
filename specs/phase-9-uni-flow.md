# Phase 9: uni flow - Multi-Command Execution

> Status: ✅ COMPLETE

## Overview
Simple multi-command execution. Run multiple uni commands at once, save as reusable macros. No fancy workflow engine - just practical shortcuts.

---

## Commands

### `uni run` - Quick Multi-Command
Run multiple commands without saving.

```bash
uni run "gh pr list" "gcal list"
uni run "exa search 'AI'" "gh issue list"

# Parallel execution (for independent commands)
uni run -p "gh pr list" "gcal list" "slack status"
```

Options:
- `-p, --parallel` - Run in parallel (faster)
- `-n, --dry-run` - Show what would run
- `--json` - Output as JSON

Output:
```
⟳ Running 2 commands...

─ gh pr list
  #123 Fix login bug
  #124 Add dark mode

─ gcal list
  10:00 AM  Team standup
  2:00 PM   1:1 with Sarah

✓ Done (1.2s)
```

---

### `uni flow` - Saved Macros

#### `uni flow add <name> <commands...>`
Save a macro.

```bash
uni flow add standup "gcal list" "gh pr list --mine"
uni flow add checks "gh pr view $1" "gh pr checks $1"
```

#### `uni flow list`
List saved macros.

```bash
uni flow list

# Output:
#   standup   gcal list → gh pr list --mine
#   checks    gh pr view $1 → gh pr checks $1
```

#### `uni flow remove <name>`
Delete a macro.

```bash
uni flow remove standup
```

#### `uni flow run <name> [args...]`
Run a saved macro.

```bash
uni flow run standup
uni flow run checks 123    # $1 = 123
```

#### Shorthand
Flows can be run directly if no service name conflict:

```bash
uni standup          # Same as: uni flow run standup
uni checks 123       # Same as: uni flow run checks 123
```

---

## Arguments

Flows support positional arguments:

```bash
# Define with $1, $2, etc.
uni flow add pr "gh pr view $1" "gh pr diff $1"

# Use
uni pr 123
# → gh pr view 123
# → gh pr diff 123
```

---

## Storage

```toml
# ~/.uni/config.toml

[flows]
standup = ["gcal list", "gh pr list --mine"]
checks = ["gh pr view $1", "gh pr checks $1"]
morning = ["gcal list", "gh pr list", "slack status"]
```

---

## Examples

### Morning Routine
```bash
uni flow add morning "gcal list" "gh pr list --mine" "exa search 'tech news'"
uni morning
```

### PR Review
```bash
uni flow add pr "gh pr view $1" "gh pr diff $1" "gh pr checks $1"
uni pr 456
```

### Quick Status
```bash
uni run "gh pr list --mine" "gcal next" "slack status"
```

---

## Implementation

### Files to Create

```
packages/cli/src/
├── core/
│   └── flow.ts           # Flow manager (save, load, run)
```

### Config Updates

Add to config parser:
- `[flows]` section with name = ["cmd1", "cmd2"] format

### CLI Updates

- Add `uni run` command
- Add `uni flow` command (add, list, remove, run)
- Check for flow names before "unknown service" error

---

## What We're NOT Doing

- ❌ Complex TOML workflow files
- ❌ Interactive prompts
- ❌ Confirmation gates
- ❌ Pre/post hooks
- ❌ Error handling config
- ❌ Flow composition
- ❌ Scheduling
- ❌ Watch mode

Keep it simple. For complex workflows, use `just`, `make`, or shell scripts.

---

## Testing Checklist
- [x] `uni run "cmd1" "cmd2"` executes both
- [x] `uni run -p` runs in parallel
- [x] `uni run --dry-run` shows without executing
- [x] `uni flow add` saves to config
- [x] `uni flow list` shows all flows
- [x] `uni flow remove` deletes flow
- [x] `uni flow run` executes flow
- [x] Arguments ($1, $2) work
- [x] Shorthand `uni <flowname>` works
- [x] No conflict with service names
