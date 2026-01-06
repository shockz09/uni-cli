# Google Services - Shared Knowledge

## Architecture

All Google services share:
- **Auth**: `GoogleAuthClient` from `@uni/shared`
- **OAuth Port**: 8085 (single port for all)
- **Token Storage**: `~/.uni/tokens/<service>.json`
- **Scopes**: Service-specific

## GoogleAuthClient (shared/src/google-auth.ts)

```javascript
export class GoogleAuthClient {
  protected scopes: string[];
  protected serviceName: string;

  // Shared OAuth flow
  async authenticate(): Promise<void>

  // Token management
  isAuthenticated(): boolean
  getAccessToken(): Promise<string>
  logout(): void
}
```

Each service extends this:
```javascript
class GmailClient extends GoogleAuthClient {
  constructor() {
    super({
      serviceName: 'gmail',
      scopes: ['https://www.googleapis.com/auth/gmail.modify'],
    });
  }
}
```

## Google Services List

| Service | Package | Scopes |
|---------|---------|--------|
| gcal | service-gcal | calendar |
| gmail | service-gmail | gmail.modify |
| gdrive | service-gdrive | drive |
| gsheets | service-gsheets | spreadsheets |
| gdocs | service-gdocs | documents |
| gslides | service-gslides | presentations |
| gforms | service-gforms | forms |
| gmeet | service-gmeet | calendar (creates meet links) |
| gtasks | service-gtasks | tasks |
| gcontacts | service-gcontacts | contacts |

## Auth Command Factory

All Google auth commands are generated:
```javascript
import { createGoogleAuthCommand } from '@uni/shared';

export const authCommand = createGoogleAuthCommand('gcal', 'Google Calendar');
```

Provides:
- `uni <service> auth` - Start OAuth
- `uni <service> auth --status` - Check auth
- `uni <service> auth --logout` - Clear tokens

## Gotchas & Lessons Learned

1. **Single OAuth port** - All services use port 8085. Can't auth multiple services simultaneously.

2. **Token refresh** - Google tokens expire after 1 hour. GoogleAuthClient auto-refreshes.

3. **Scope changes require re-auth** - If scopes change, user must re-authenticate.

4. **Default credentials embedded** - Each service has default client ID/secret for zero-config. Users can override with env vars.

## Testing Auth
```bash
uni gcal auth --status    # Check
uni gcal auth            # Authenticate
uni gcal auth --logout   # Clear
```

## Credential Resolution

Priority order:
1. Environment variables (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
2. Config file (`~/.uni/config.toml`)
3. Embedded defaults (works out of box)
