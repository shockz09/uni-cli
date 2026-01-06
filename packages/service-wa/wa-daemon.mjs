#!/usr/bin/env node
/**
 * WhatsApp Daemon - persistent connection for fast commands
 * Runs with Node.js, listens on Unix socket for commands
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';
import * as readline from 'readline';

const HOME = process.env.HOME || '~';
const UNI_DIR = path.join(HOME, '.uni');
const AUTH_DIR = path.join(UNI_DIR, 'tokens', 'whatsapp');
const SOCKET_PATH = path.join(UNI_DIR, 'wa.sock');
const PID_FILE = path.join(UNI_DIR, 'wa.pid');
const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

const logger = pino({ level: 'silent' });

let sock = null;
let idleTimer = null;
let server = null;
let isConnected = false;
let isConnecting = false;

// Reset idle timer on activity
function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    console.log('[daemon] Idle timeout, shutting down');
    shutdown();
  }, IDLE_TIMEOUT);
}

// Clean shutdown
async function shutdown() {
  console.log('[daemon] Shutting down...');
  if (idleTimer) clearTimeout(idleTimer);
  if (sock) {
    try { await sock.end(); } catch {}
  }
  if (server) {
    server.close();
  }
  try { fs.unlinkSync(SOCKET_PATH); } catch {}
  try { fs.unlinkSync(PID_FILE); } catch {}
  process.exit(0);
}

// Handle signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Parse JID
function parseJid(chat, myJid) {
  if (chat === 'me') return myJid;
  if (chat.includes('@')) return chat;
  return `${chat.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
}

// Connect to WhatsApp
async function connect() {
  if (isConnecting) return;
  isConnecting = true;

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger,
    browser: Browsers.windows('Chrome'),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      isConnected = false;
      const reason = lastDisconnect?.error?.output?.statusCode;
      console.log('[daemon] Connection closed, reason:', reason);

      if (reason === DisconnectReason.loggedOut) {
        console.log('[daemon] Logged out, shutting down');
        shutdown();
      } else if (reason === DisconnectReason.connectionReplaced) {
        // Another connection replaced us - don't reconnect (would cause loop)
        console.log('[daemon] Connection replaced, shutting down');
        shutdown();
      } else if (reason === DisconnectReason.timedOut || reason === DisconnectReason.connectionClosed) {
        // Network issues - reconnect
        console.log('[daemon] Reconnecting in 5s...');
        setTimeout(() => {
          isConnecting = false;
          connect();
        }, 5000);
      } else {
        // Unknown reason - don't reconnect
        console.log('[daemon] Unknown disconnect, shutting down');
        shutdown();
      }
    } else if (connection === 'open') {
      isConnected = true;
      isConnecting = false;
      console.log('[daemon] Connected to WhatsApp');
    }
  });
}

// Handle commands
async function handleCommand(cmd) {
  resetIdleTimer();

  if (!isConnected) {
    return { error: 'Not connected to WhatsApp' };
  }

  const myJid = sock.user?.id?.replace(/:.*@/, '@');

  try {
    switch (cmd.action) {
      case 'ping':
        return { ok: true, connected: isConnected };

      case 'status':
        return {
          ok: true,
          connected: isConnected,
          user: sock.user?.id,
          uptime: process.uptime()
        };

      case 'send': {
        const jid = parseJid(cmd.chat, myJid);
        const opts = {};
        if (cmd.replyId) {
          opts.quoted = { key: { remoteJid: jid, id: cmd.replyId }, message: {} };
        }

        let result;
        if (cmd.file && fs.existsSync(cmd.file)) {
          const buffer = fs.readFileSync(cmd.file);
          const ext = path.extname(cmd.file).toLowerCase();
          const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
          const isVideo = ['.mp4', '.mov', '.avi'].includes(ext);

          if (isImage) {
            result = await sock.sendMessage(jid, { image: buffer, caption: cmd.message || '' }, opts);
          } else if (isVideo) {
            result = await sock.sendMessage(jid, { video: buffer, caption: cmd.message || '' }, opts);
          } else {
            result = await sock.sendMessage(jid, { document: buffer, fileName: path.basename(cmd.file), caption: cmd.message || '' }, opts);
          }
        } else {
          result = await sock.sendMessage(jid, { text: cmd.message }, opts);
        }
        return { ok: true, id: result?.key?.id };
      }

      case 'edit': {
        const jid = parseJid(cmd.chat, myJid);
        const key = { remoteJid: jid, id: cmd.messageId, fromMe: true };
        await sock.sendMessage(jid, { text: cmd.newText, edit: key });
        return { ok: true };
      }

      case 'delete': {
        const jid = parseJid(cmd.chat, myJid);
        await sock.sendMessage(jid, {
          delete: { remoteJid: jid, id: cmd.messageId, fromMe: true },
        });
        return { ok: true };
      }

      case 'react': {
        const jid = parseJid(cmd.chat, myJid);
        await sock.sendMessage(jid, {
          react: { text: cmd.emoji || '', key: { remoteJid: jid, id: cmd.messageId, fromMe: true } },
        });
        return { ok: true };
      }

      case 'chats': {
        const chats = await sock.groupFetchAllParticipating();
        const groups = Object.values(chats).slice(0, cmd.limit || 20);
        return {
          ok: true,
          chats: groups.map(g => ({ id: g.id, name: g.subject }))
        };
      }

      case 'stop':
        setTimeout(shutdown, 100);
        return { ok: true, message: 'Daemon stopping' };

      default:
        return { error: `Unknown action: ${cmd.action}` };
    }
  } catch (err) {
    return { error: err.message };
  }
}

// Start Unix socket server
function startServer() {
  // Remove stale socket
  try { fs.unlinkSync(SOCKET_PATH); } catch {}

  server = net.createServer((client) => {
    let buffer = '';

    client.on('data', async (data) => {
      buffer += data.toString();

      // Handle newline-delimited JSON
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const cmd = JSON.parse(line);
          const result = await handleCommand(cmd);
          client.write(JSON.stringify(result) + '\n');
        } catch (err) {
          client.write(JSON.stringify({ error: 'Invalid JSON' }) + '\n');
        }
      }
    });

    client.on('error', () => {});
  });

  server.listen(SOCKET_PATH, () => {
    fs.chmodSync(SOCKET_PATH, 0o600);
    console.log('[daemon] Listening on', SOCKET_PATH);
  });

  // Write PID file
  fs.writeFileSync(PID_FILE, process.pid.toString());
}

// Auth flow (special case - runs interactively)
async function runAuth() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = (p) => new Promise((r) => rl.question(p, (a) => r(a.trim())));

  console.log('WhatsApp Authentication\n');
  const phone = await question('Phone number (with country code): ');
  rl.close();

  if (!phone || phone.length < 10) {
    console.log('Invalid phone number');
    process.exit(1);
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const authSock = makeWASocket({
    version,
    logger,
    browser: Browsers.windows('Chrome'),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
  });

  authSock.ev.on('creds.update', saveCreds);

  let done = false;
  authSock.ev.on('connection.update', async (u) => {
    if (u.connection === 'connecting' && !done) {
      done = true;
      await new Promise(r => setTimeout(r, 2000));
      const code = await authSock.requestPairingCode(phone);
      console.log(`\nPairing code: ${code}\n`);
      console.log('Open WhatsApp > Settings > Linked Devices > Link a Device\n');
    }
    if (u.connection === 'open') {
      console.log('Connected!');
      await authSock.end();
      process.exit(0);
    }
  });
}

// Main
const [,, cmd] = process.argv;

if (cmd === 'auth') {
  runAuth();
} else if (cmd === 'start' || !cmd) {
  // Check if already running
  if (fs.existsSync(PID_FILE)) {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8'));
    try {
      process.kill(pid, 0); // Check if process exists
      console.log('[daemon] Already running with PID', pid);
      process.exit(0);
    } catch {
      // Process doesn't exist, remove stale files
      try { fs.unlinkSync(PID_FILE); } catch {}
      try { fs.unlinkSync(SOCKET_PATH); } catch {}
    }
  }

  console.log('[daemon] Starting...');
  startServer();
  connect();
  resetIdleTimer();
} else {
  console.log('Usage: wa-daemon.mjs [start|auth]');
  process.exit(1);
}
