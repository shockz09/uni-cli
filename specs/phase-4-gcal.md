# Phase 4: Google Calendar Service

> Status: ✅ COMPLETED

## Overview
Google Calendar service using Google Calendar API with OAuth authentication.

## Completed

### Commands Implemented

#### `uni gcal list`
- List events for today (default)
- `--date tomorrow` or `--date 2025-01-15`
- `--days 7` for multi-day view
- Groups events by date

#### `uni gcal add`
- Create events with natural time parsing
- `--time 10am`, `--time 2:30pm`, `--time 14:00`
- `--duration 30m`, `--duration 1h30m`
- `--date tomorrow`, `--location "Room A"`

#### `uni gcal next`
- Show next upcoming event(s)
- `--count 3` for multiple events
- Shows time until event

#### `uni gcal auth`
- OAuth flow via browser
- `--status` to check auth state
- Tokens stored in `~/.uni/tokens/gcal.json`

### Files Created
- `packages/service-gcal/package.json`
- `packages/service-gcal/src/index.ts`
- `packages/service-gcal/src/api.ts`
- `packages/service-gcal/src/commands/list.ts`
- `packages/service-gcal/src/commands/add.ts`
- `packages/service-gcal/src/commands/next.ts`
- `packages/service-gcal/src/commands/auth.ts`

### Auth
Requires Google OAuth credentials:
```bash
export GOOGLE_CLIENT_ID="..."
export GOOGLE_CLIENT_SECRET="..."
```

Create at: https://console.cloud.google.com/apis/credentials

## Usage Examples
```bash
uni gcal list --days 7
uni gcal add "Meeting" --time 2pm --duration 1h
uni gcal next --count 3
uni gcal auth
```
