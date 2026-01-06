# Linear Service - Developer Knowledge

## Architecture

- **Package**: `packages/service-linear/`
- **Auth**: OAuth via `@uni/shared` OAuthClient
- **API**: GraphQL

## Key Implementation Details

### OAuth Setup
```javascript
export const linearOAuth = new OAuthClient({
  name: 'linear',
  authUrl: 'https://linear.app/oauth/authorize',
  tokenUrl: 'https://api.linear.app/oauth/token',
  scopes: ['read', 'write'],
  defaultClientId: 'a2c18107bd856c2dbb9da1845c7af278',
  defaultClientSecret: '18265e82181b6416deaf584e71ddb26b',
  supportsRefresh: false,  // Linear tokens don't expire... supposedly
});
```

### Token Expiry Handling
Despite `supportsRefresh: false`, tokens DO become invalid:

```javascript
if (response.status === 401) {
  linearOAuth.logout();  // Clear invalid token
  throw new Error('Linear token expired or invalid. Run "uni linear auth" to re-authenticate.');
}
```

**Auto-logout on 401** - clears token so `auth --status` shows correct state.

### GraphQL Queries
All API calls use GraphQL:

```javascript
const data = await this.query<{ issues: { nodes: Issue[] } }>(`
  query Issues($first: Int, $filter: IssueFilter) {
    issues(first: $first, filter: $filter, orderBy: updatedAt) {
      nodes {
        id identifier title description priority
        state { name color }
        assignee { name email }
        team { name key }
        url
      }
    }
  }
`, { first: limit, filter });
```

## Gotchas & Lessons Learned

1. **Tokens DO expire** - Despite docs saying they don't. We auto-logout on 401.

2. **setup() was spammy** - Had duplicate "Not authenticated" messages (3x!). Removed from setup(), each command checks auth.

3. **Search is deprecated** - Linear's search APIs are deprecated. We fetch issues and filter locally by title/description.

4. **Issue identifier vs ID** - `identifier` is human-readable (e.g., `ENG-123`), `id` is UUID. Both work for lookups.

## File Structure
```
src/
├── api.ts          # GraphQL client, OAuthClient, 401 handling
├── index.ts        # Service definition (no setup warnings!)
└── commands/
    ├── auth.ts     # OAuth flow
    ├── issues.ts   # List, create, update, close issues
    ├── projects.ts # List projects
    ├── teams.ts    # List teams
    └── comments.ts # Issue comments
```

## Testing Commands
```bash
uni linear auth --status       # Check auth (single message now!)
uni linear issues list         # List issues
uni linear issues list --open  # Open only
uni linear teams               # List teams
```

## Error Messages

Before fix:
```
Not authenticated.
Run "uni linear auth" to authenticate.
○ Not authenticated. Run "uni linear auth" to authenticate.
```

After fix:
```
○ Not authenticated. Run "uni linear auth" to authenticate.
```

Single, clear message.
