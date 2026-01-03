# Phase 17: Shared Command Patterns

> Unify duplicated command patterns across services into shared factories and helpers.

## Problem

After Phase 16 unified OAuth logic, there's still significant duplication in command files:

| Pattern | Files | Lines | Issue |
|---------|-------|-------|-------|
| Auth commands | 11 | 960 | Nearly identical across all Google services |
| ANSI color codes | - | 166 usages | Raw escape codes everywhere |
| Command boilerplate | Many | - | Repetitive structure |

### Auth Command Duplication

All 11 Google services have nearly identical `auth.ts` files:

```typescript
// packages/service-gcal/src/commands/auth.ts (101 lines)
// packages/service-gmail/src/commands/auth.ts (100 lines)
// packages/service-gdrive/src/commands/auth.ts (87 lines)
// ... 8 more files
// Total: 960 lines of mostly copy-pasted code
```

Each auth command:
- Has same options: `--status`, `--logout`
- Has same aliases: `login`
- Checks `hasCredentials()` and `isAuthenticated()`
- Calls `authenticate()` on success
- Only differs in: service name, import path

### ANSI Color Code Chaos

166 instances of raw ANSI codes like:
```typescript
console.log(`\x1b[36m${title}\x1b[0m`);      // cyan
console.log(`\x1b[90m${subtitle}\x1b[0m`);   // dim
console.log(`\x1b[1m${heading}\x1b[0m`);     // bold
```

Hard to read, easy to make mistakes, no consistency.

## Solution

### 1. Auth Command Factory

Create a factory function that generates auth commands for any Google service:

```typescript
// packages/shared/src/google-auth-command.ts

import type { Command, CommandContext } from './types';
import type { GoogleAuthClient } from './google-auth';

export interface GoogleAuthCommandOptions {
  serviceName: string;        // 'Calendar', 'Gmail', etc.
  serviceKey: string;         // 'gcal', 'gmail', etc.
  client: GoogleAuthClient;   // The API client instance
}

export function createGoogleAuthCommand(options: GoogleAuthCommandOptions): Command {
  const { serviceName, serviceKey, client } = options;

  return {
    name: 'auth',
    description: `Authenticate with Google ${serviceName}`,
    aliases: ['login'],
    options: [
      {
        name: 'status',
        short: 's',
        type: 'boolean',
        description: 'Check authentication status',
        default: false,
      },
      {
        name: 'logout',
        type: 'boolean',
        description: 'Remove authentication token',
        default: false,
      },
    ],
    examples: [
      `uni ${serviceKey} auth`,
      `uni ${serviceKey} auth --status`,
      `uni ${serviceKey} auth --logout`,
    ],

    async handler(ctx: CommandContext): Promise<void> {
      const { output, flags, globalFlags } = ctx;

      // Handle logout
      if (flags.logout) {
        client.logout();
        output.success(`Logged out from Google ${serviceName}`);
        return;
      }

      // Handle status check
      if (flags.status) {
        if (globalFlags.json) {
          output.json({
            hasCredentials: client.hasCredentials(),
            isAuthenticated: client.isAuthenticated(),
          });
          return;
        }

        if (!client.hasCredentials()) {
          output.warn('Credentials not configured');
          return;
        }

        if (client.isAuthenticated()) {
          output.success(`Authenticated with Google ${serviceName}`);
        } else {
          output.warn(`Not authenticated. Run "uni ${serviceKey} auth" to login.`);
        }
        return;
      }

      // Handle auth flow
      if (!client.hasCredentials()) {
        output.error(`Google ${serviceName} credentials not configured.`);
        return;
      }

      output.info('Starting authentication flow...');

      try {
        await client.authenticate();
        output.success(`Successfully authenticated with Google ${serviceName}!`);
      } catch (error) {
        output.error('Authentication failed');
        throw error;
      }
    },
  };
}
```

Then each service becomes one line:

```typescript
// packages/service-gcal/src/commands/auth.ts
import { createGoogleAuthCommand } from '@uni/shared';
import { gcal } from '../api';

export const authCommand = createGoogleAuthCommand({
  serviceName: 'Calendar',
  serviceKey: 'gcal',
  client: gcal,
});
```

### 2. Color Helpers

Simple color utility for consistent, readable output:

```typescript
// packages/shared/src/colors.ts

export const colors = {
  // Text colors
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  magenta: (s: string) => `\x1b[35m${s}\x1b[0m`,

  // Styles
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[90m${s}\x1b[0m`,
  italic: (s: string) => `\x1b[3m${s}\x1b[0m`,
  underline: (s: string) => `\x1b[4m${s}\x1b[0m`,

  // Semantic
  success: (s: string) => `\x1b[32m${s}\x1b[0m`,
  error: (s: string) => `\x1b[31m${s}\x1b[0m`,
  warn: (s: string) => `\x1b[33m${s}\x1b[0m`,
  info: (s: string) => `\x1b[36m${s}\x1b[0m`,
};

// Short alias for convenience
export const c = colors;
```

Usage:
```typescript
import { c } from '@uni/shared';

console.log(c.cyan(title));
console.log(c.dim(timestamp));
console.log(c.bold('Important'));
```

## Implementation Steps

### Step 1: Add color helpers to shared
- [ ] Create `packages/shared/src/colors.ts`
- [ ] Export from `packages/shared/src/index.ts`

### Step 2: Add auth command factory to shared
- [ ] Create `packages/shared/src/google-auth-command.ts`
- [ ] Export from `packages/shared/src/index.ts`

### Step 3: Refactor all Google auth commands
- [ ] gcal
- [ ] gmail
- [ ] gdrive
- [ ] gtasks
- [ ] gcontacts
- [ ] gmeet
- [ ] gsheets
- [ ] gdocs
- [ ] gslides
- [ ] gforms
- [ ] gkeep

### Step 4: Replace ANSI codes with color helpers (optional)
- [ ] Grep for `\x1b\[` patterns
- [ ] Replace with `c.cyan()`, `c.dim()`, etc.

### Step 5: Build and test
- [ ] Build all packages
- [ ] Test auth flow for a few services

## Files Changed

### New Files
- `packages/shared/src/colors.ts`
- `packages/shared/src/google-auth-command.ts`

### Modified Files
- `packages/shared/src/index.ts` (add exports)
- `packages/service-gcal/src/commands/auth.ts` (refactor)
- `packages/service-gmail/src/commands/auth.ts` (refactor)
- `packages/service-gdrive/src/commands/auth.ts` (refactor)
- `packages/service-gtasks/src/commands/auth.ts` (refactor)
- `packages/service-gcontacts/src/commands/auth.ts` (refactor)
- `packages/service-gmeet/src/commands/auth.ts` (refactor)
- `packages/service-gsheets/src/commands/auth.ts` (refactor)
- `packages/service-gdocs/src/commands/auth.ts` (refactor)
- `packages/service-gslides/src/commands/auth.ts` (refactor)
- `packages/service-gforms/src/commands/auth.ts` (refactor)
- `packages/service-gkeep/src/commands/auth.ts` (refactor)

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Auth command lines | 960 | ~120 |
| Lines per auth file | ~90 | ~10 |
| ANSI escape codes | 166 raw | 0 (use helpers) |
| Bug fix locations | 11 | 1 |

## Future Improvements (Out of Scope)

- Factory for list commands
- Factory for delete commands
- Shared table formatting helpers
- Shared date/time formatting
