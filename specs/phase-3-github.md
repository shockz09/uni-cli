# Phase 3: GitHub Service

> Status: ✅ COMPLETED

## Overview
GitHub service wrapping the `gh` CLI for PR, issue, and repo management.

## Completed

### Commands Implemented

#### `uni gh pr`
- `list` - List pull requests with state/author filters
- `view <number>` - View PR details
- `create` - Create PR with title/body/draft options
- `merge <number>` - Merge PR with method selection

#### `uni gh issue`
- `list` - List issues with state/label/assignee filters
- `view <number>` - View issue details
- `create` - Create issue with title/body/labels
- `close <number>` - Close issue

#### `uni gh repo`
- `view [repo]` - View repository info
- `clone <repo>` - Clone repository
- `list` - List user's repositories
- `create <name>` - Create new repository

### Files Created
- `packages/service-gh/package.json`
- `packages/service-gh/src/index.ts`
- `packages/service-gh/src/gh-wrapper.ts`
- `packages/service-gh/src/commands/pr.ts`
- `packages/service-gh/src/commands/issue.ts`
- `packages/service-gh/src/commands/repo.ts`

### Auth
Uses `gh` CLI authentication. User must run `gh auth login` first.

## Usage Examples
```bash
uni gh pr list --state open
uni gh pr view 123
uni gh pr create --title "Feature" --draft
uni gh issue list --label bug
uni gh repo view owner/repo
uni gh repo clone owner/repo
```
