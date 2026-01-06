# WhatsApp Service - Developer Knowledge

## Architecture

- **Package**: `packages/service-wa/`
- **Library**: Baileys (`@whiskeysockets/baileys`)
- **Architecture**: Daemon + CLI client
- **Auth**: Phone pairing code (not QR)

## Daemon Architecture

Unlike other services, WhatsApp uses a **persistent daemon**:

```
┌─────────────┐     Unix Socket      ┌─────────────┐
│   CLI       │ ◄──────────────────► │   Daemon    │
│ (wa-client) │    ~/.uni/wa.sock    │ (wa-daemon) │
└─────────────┘                      └─────────────┘
                                           │
                                           ▼
                                     ┌───────────┐
                                     │ WhatsApp  │
                                     │  Servers  │
                                     └───────────┘
```

**Why daemon?**
- WhatsApp connection takes 3-5 seconds to establish
- Daemon keeps connection alive
- CLI commands are instant via Unix socket
- Daemon auto-shuts down after 30 min idle

### Daemon Files
- `~/.uni/wa.sock` - Unix socket for IPC
- `~/.uni/wa.pid` - Daemon process ID
- `~/.uni/wa-store.json` - Message cache (last 500 per chat)
- `~/.uni/tokens/whatsapp/` - Auth credentials

## Key Implementation Details

### Message Store
```javascript
// Daemon keeps last 500 messages per JID
sock.ev.on('messages.upsert', ({ messages }) => {
  for (const msg of messages) {
    const jid = msg.key.remoteJid;
    if (!messageStore[jid]) messageStore[jid] = [];
    messageStore[jid].push(msg);
    if (messageStore[jid].length > 500) {
      messageStore[jid] = messageStore[jid].slice(-500);
    }
  }
});
```

### JID Parsing
```javascript
function parseJid(chat, myJid) {
  if (chat === 'me') return myJid;  // Saved messages
  if (chat.includes('@')) return chat;  // Already JID
  return `${chat.replace(/[^0-9]/g, '')}@s.whatsapp.net`;  // Phone number
}
```

### Message IDs
- Baileys IDs are long hex strings: `3EB0DEE8170D81D8A4BEDE`
- Stored in `msg.key.id`
- Needed for delete, edit, react

## Gotchas & Lessons Learned

1. **Auth is FRAGILE** - Pairing code auth fails randomly. Sometimes need to:
   - Clear `~/.uni/tokens/whatsapp/`
   - Unlink all devices on phone
   - Wait and retry

2. **Don't clear wa-store.json** - Loses message IDs needed for operations.

3. **Browser fingerprint matters** - Using `Browsers.windows('Chrome')`. Changing this can break auth.

4. **syncFullHistory: true** - Needed to get message history on connect.

5. **Connection replaced = shutdown** - If another client connects, daemon shuts down to avoid loops.

6. **Messages only from daemon runtime** - `wa read` only shows messages received while daemon was running. Historical fetch is limited.

## File Structure
```
├── wa-daemon.mjs   # Node.js daemon (Baileys)
├── src/
│   ├── client.ts   # Unix socket client
│   ├── index.ts    # Service definition
│   └── commands/
│       ├── auth.ts     # Pairing code flow
│       ├── send.ts     # Send messages/media
│       ├── read.ts     # Read from store
│       ├── edit.ts     # Edit message
│       ├── delete.ts   # Delete message
│       ├── react.ts    # Add reaction
│       ├── forward.ts  # Forward message
│       └── chats.ts    # List groups
```

## Testing Commands
```bash
# Start daemon (auto-starts on first command)
uni wa send me "test"

# Check daemon status
uni wa status

# Read messages (from store)
uni wa read me -n 10

# Stop daemon
uni wa stop
```

## Auth Troubleshooting

If auth fails with "couldn't link device":

1. On phone: WhatsApp > Linked Devices > Unlink all
2. `rm -rf ~/.uni/tokens/whatsapp/`
3. `rm ~/.uni/wa-store.json`
4. Wait 10 minutes
5. `uni wa auth`

Sometimes just waiting 24 hours fixes it.

## Known Limitations

- `fetchMessageHistory()` requires a message cursor
- Max 50 messages per history fetch
- History sync only on first device link
- Media sending requires file path (no URLs)
