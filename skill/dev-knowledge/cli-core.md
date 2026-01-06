# CLI Core - Developer Knowledge

## Architecture

- **Package**: `packages/cli/`
- **Entry**: `src/main.ts`
- **Parser**: Custom argument parser in `src/core/parser.ts`

## Output System (`src/core/output.ts`)

### Spinner Behavior - CRITICAL FOR AGENTS

**The #1 issue we fixed for agent compatibility:**

```javascript
spinner(msg: string): Spinner {
  // Non-TTY: no animation but STILL SHOW success/fail messages
  if (!isTTY() || forceJson || quiet) {
    return {
      update: () => {},
      success: (successMsg?: string) => {
        if (!quiet) {
          console.log(`✓ ${successMsg || msg}`);
        }
      },
      fail: (failMsg?: string) => {
        console.error(`✖ ${failMsg || msg}`);
      },
      stop: () => {},
    };
  }
  // TTY: animated spinner...
}
```

**Before fix:** Spinner success/fail were NO-OPS in non-TTY mode. Agents saw nothing.

**After fix:** Messages print even when piped/non-interactive.

### Output Methods

```javascript
output.success(msg)   // ✓ green
output.error(msg)     // ✖ red (always shows, even quiet)
output.warn(msg)      // ⚠ yellow
output.info(msg)      // ℹ blue
output.text(msg)      // plain (respects quiet)
output.json(data)     // JSON output
output.table(data)    // formatted table
output.list(items)    // bulleted list
```

### Global Flags
- `--json` - JSON output mode
- `--quiet` - Suppress non-essential output
- `--verbose` - Show debug messages

## Service Discovery

Services are auto-discovered:
1. Built-in: `packages/service-*/`
2. npm: `@uni/service-*` packages
3. Local: `~/.uni/plugins/`

Priority: local > npm > builtin (user can override)

## Command Registration

```javascript
const service: UniService = {
  name: 'myservice',
  description: 'My service',
  commands: [cmd1, cmd2, cmd3],

  async setup() {
    // Called before any command runs
    // DON'T put auth warnings here for OAuth services!
  }
};
```

## Gotchas & Lessons Learned

1. **setup() auth warnings cause duplicates** - OAuth services were printing "Not authenticated" in setup() AND in command handlers. Removed from setup().

2. **Spinner no-ops broke agents** - Original code made spinner.fail() a no-op in non-TTY. Fixed to always print.

3. **Don't use readline for confirmation** - Interactive prompts block agents. Removed from gtasks lists delete.

4. **IDs should be visible** - Agents need IDs to reference items. Show `[id]` in human output.

5. **Search all by default** - Limiting search (like gmail category:primary) hurts agents. Be inclusive.

## File Structure
```
src/
├── main.ts           # Entry point
├── core/
│   ├── parser.ts     # Argument parsing
│   ├── registry.ts   # Service/command registry
│   ├── output.ts     # Output formatting (SPINNER FIX HERE)
│   └── config.ts     # Config management
└── utils/
    └── colors.ts     # ANSI color helpers
```

## Testing CLI Changes
```bash
# Build
bun run build

# Test non-TTY (simulates agent)
uni gtasks done "nonexistent" 2>&1  # Should show error

# Test with script (forces non-TTY)
echo "test" | uni gmail list
```
