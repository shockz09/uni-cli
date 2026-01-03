# Phase 7: Config, Aliases & History

> Status: ✅ COMPLETE

## Overview
Quality of life features: persistent config, user-defined aliases, and command history.

---

## 7.1 Config File (`~/.uni/config.toml`)

### Goals
- Persistent configuration for defaults
- Per-service settings
- Global preferences

### Config Structure
```toml
# ~/.uni/config.toml

[global]
default_output = "human"  # human | json
color = true
editor = "code"

[services.gcal]
default_calendar = "primary"
timezone = "Asia/Kolkata"

[services.slack]
default_channel = "general"
workspace = "myteam"

[services.gh]
default_repo = "owner/repo"

[services.exa]
default_num_results = 10
```

### Implementation
1. Create `packages/cli/src/core/config.ts` improvements:
   - Load from `~/.uni/config.toml`
   - Merge with defaults
   - Allow env vars to override

2. Add `uni config` subcommands:
   - `uni config show` - Display current config
   - `uni config set <key> <value>` - Set a value
   - `uni config get <key>` - Get a value
   - `uni config edit` - Open in editor
   - `uni config path` - Show config file path

3. Update services to read from config:
   - Default values from config
   - Fallback to current behavior

### Files to Create/Modify
- `packages/cli/src/core/config.ts` - Enhance config loader
- `packages/cli/src/commands/config.ts` - Config management commands

---

## 7.2 Aliases

### Goals
- User-defined shortcuts for common commands
- Stored in config or separate file
- Tab completion for aliases

### Usage
```bash
# Create alias
uni alias add prs "gh pr list --state open"
uni alias add inbox "gmail list --unread"
uni alias add today "gcal list"

# Use alias
uni prs              # Runs: uni gh pr list --state open
uni inbox            # Runs: uni gmail list --unread

# Manage aliases
uni alias list       # Show all aliases
uni alias remove prs # Remove alias
```

### Storage
```toml
# In ~/.uni/config.toml
[aliases]
prs = "gh pr list --state open"
inbox = "gmail list --unread"
today = "gcal list"
standup = "gcal add 'Daily Standup' --time 10am --duration 15m"
```

### Implementation
1. Create `packages/cli/src/commands/alias.ts`:
   - `add`, `list`, `remove` subcommands

2. Update CLI parser:
   - Check if first arg is an alias
   - Expand and re-parse if so

3. Update completions to include aliases

### Files to Create/Modify
- `packages/cli/src/commands/alias.ts` - Alias management
- `packages/cli/src/core/cli.ts` - Alias expansion
- `packages/cli/src/core/completions.ts` - Include aliases

---

## 7.3 History

### Goals
- Track command history
- Searchable history
- Re-run past commands

### Usage
```bash
# View history
uni history              # Last 20 commands
uni history --limit 50   # Last 50
uni history --search "pr" # Filter

# Re-run
uni history run 5        # Run command #5 from history
uni !5                   # Shorthand (like bash)

# Clear
uni history clear
```

### Storage
```json
// ~/.uni/history.json
{
  "commands": [
    { "id": 1, "cmd": "exa search 'React 19'", "time": "2025-01-03T10:00:00Z", "exit": 0 },
    { "id": 2, "cmd": "gh pr list", "time": "2025-01-03T10:01:00Z", "exit": 0 }
  ]
}
```

### Implementation
1. Create `packages/cli/src/core/history.ts`:
   - `addCommand()` - Log after execution
   - `getHistory()` - Retrieve with filters
   - `clearHistory()` - Wipe history

2. Create `packages/cli/src/commands/history.ts`:
   - List, search, run, clear subcommands

3. Update CLI to log commands after execution

### Files to Create/Modify
- `packages/cli/src/core/history.ts` - History manager
- `packages/cli/src/commands/history.ts` - History commands
- `packages/cli/src/core/cli.ts` - Log commands after run

---

## Testing Checklist
- [x] Config loads from ~/.uni/config.toml
- [x] `uni config set/get` works
- [x] Aliases expand correctly
- [x] Alias tab completion works
- [x] History records commands
- [x] History search filters correctly
- [x] `uni history run` re-executes

---

## Dependencies
- `@iarna/toml` or similar for TOML parsing (or use Bun's built-in)
