# Phase 16: Google Auth Refactor

> Unify duplicated OAuth code across 11 Google services into a shared module.

## Problem

Currently, all 11 Google services (`gcal`, `gmail`, `gdrive`, `gtasks`, `gcontacts`, `gmeet`, `gsheets`, `gdocs`, `gslides`, `gforms`, `gkeep`) have **~200 lines of identical code** copy-pasted in each `api.ts`:

| Duplicated Code | Lines | Count | Total Waste |
|-----------------|-------|-------|-------------|
| `TokenData` interface | 5 | 11 | 55 |
| `loadTokens()` | 10 | 11 | 110 |
| `saveTokens()` | 8 | 11 | 88 |
| `getAccessToken()` | 12 | 11 | 132 |
| `refreshToken()` | 25 | 11 | 275 |
| `getAuthUrl()` | 12 | 11 | 132 |
| `exchangeCode()` | 30 | 11 | 330 |
| `authenticate()` | 60 | 11 | 660 |
| `request<T>()` | 20 | 11 | 220 |
| `hasCredentials()` | 3 | 11 | 33 |
| `isAuthenticated()` | 3 | 11 | 33 |
| constructor | 6 | 11 | 66 |
| **Total** | **~194** | **11** | **~2134 lines** |

### Issues with Current Approach

1. **Bug fixes must be applied 11 times** (e.g., the timeout cleanup fix)
2. **Each service uses a different port** (8085-8096) for no reason
3. **Inconsistent error messages** across services
4. **No shared token management** - could share a single OAuth session
5. **Hard to add new Google services** - must copy-paste 200 lines

## Solution

### 1. Create `GoogleAuthClient` base class in `@uni/shared`

```typescript
// packages/shared/src/google-auth.ts

export interface GoogleAuthConfig {
  serviceName: string;      // 'gcal', 'gmail', etc.
  scopes: string[];         // OAuth scopes required
  apiBase: string;          // 'https://www.googleapis.com/calendar/v3'
}

export abstract class GoogleAuthClient {
  protected config: GoogleAuthConfig;
  private tokens: TokenData | null = null;

  constructor(config: GoogleAuthConfig) {
    this.config = config;
    this.loadTokens();
  }

  // === Shared Methods (move from individual services) ===

  hasCredentials(): boolean { ... }
  isAuthenticated(): boolean { ... }

  protected loadTokens(): void { ... }
  protected saveTokens(tokens: TokenData): void { ... }
  protected async getAccessToken(): Promise<string> { ... }
  protected async refreshToken(): Promise<void> { ... }

  getAuthUrl(redirectUri: string): string { ... }
  async exchangeCode(code: string, redirectUri: string): Promise<void> { ... }
  async authenticate(): Promise<void> { ... }

  // Generic authenticated request
  protected async request<T>(endpoint: string, options?: RequestInit): Promise<T> { ... }

  // Logout
  logout(): void { ... }
}
```

### 2. Refactor each service to extend base class

```typescript
// packages/service-gcal/src/api.ts

import { GoogleAuthClient } from '@uni/shared';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events'
];

export class GoogleCalendarClient extends GoogleAuthClient {
  constructor() {
    super({
      serviceName: 'gcal',
      scopes: SCOPES,
      apiBase: 'https://www.googleapis.com/calendar/v3',
    });
  }

  // === Service-specific methods only ===

  async listEvents(options: ListEventsOptions): Promise<CalendarEvent[]> { ... }
  async createEvent(event: CreateEventInput): Promise<CalendarEvent> { ... }
  async updateEvent(id: string, updates: UpdateEventInput): Promise<CalendarEvent> { ... }
  async deleteEvent(id: string): Promise<void> { ... }
}

export const gcal = new GoogleCalendarClient();
```

### 3. Single OAuth Port

Use a single port (8085) for all Google services instead of 11 different ports.

### 4. Token Path Convention

```
~/.uni/tokens/{serviceName}.json
```

Automatically derived from `serviceName` in config.

## Implementation Steps

### Step 1: Create base class in shared
- [ ] Create `packages/shared/src/google-auth.ts`
- [ ] Export `GoogleAuthClient` class
- [ ] Export `GoogleAuthConfig` interface
- [ ] Export `TokenData` interface
- [ ] Add to `packages/shared/src/index.ts` exports

### Step 2: Refactor services (one by one)
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

### Step 3: Test & verify
- [ ] Build all services
- [ ] Test auth flow for each service
- [ ] Test logout for each service
- [ ] Verify token refresh works

### Step 4: Cleanup
- [ ] Remove any remaining duplicate code
- [ ] Update docs if needed

## Files Changed

### New Files
- `packages/shared/src/google-auth.ts`

### Modified Files
- `packages/shared/src/index.ts` (add export)
- `packages/service-gcal/src/api.ts` (refactor)
- `packages/service-gmail/src/api.ts` (refactor)
- `packages/service-gdrive/src/api.ts` (refactor)
- `packages/service-gtasks/src/api.ts` (refactor)
- `packages/service-gcontacts/src/api.ts` (refactor)
- `packages/service-gmeet/src/api.ts` (refactor)
- `packages/service-gsheets/src/api.ts` (refactor)
- `packages/service-gdocs/src/api.ts` (refactor)
- `packages/service-gslides/src/api.ts` (refactor)
- `packages/service-gforms/src/api.ts` (refactor)
- `packages/service-gkeep/src/api.ts` (refactor)

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Duplicated OAuth code | ~2134 lines | 0 lines |
| Base class | N/A | ~200 lines |
| Per-service OAuth code | ~194 lines | ~10 lines |
| Ports used | 11 (8085-8096) | 1 (8085) |
| Bug fix locations | 11 files | 1 file |

## Risks

1. **Breaking existing tokens** - Tokens should still work since file paths remain the same
2. **Different scopes per service** - Handled by config, each service still has own token
3. **Service-specific quirks** - Some services may have unique needs (handled via method override)

## Future Improvements (Out of Scope)

- Unified Google auth (single token with all scopes)
- Token sharing between services
- Background token refresh
