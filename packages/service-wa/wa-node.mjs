#!/usr/bin/env node
/**
 * WhatsApp CLI - runs with Node.js to avoid Bun WebSocket issues
 * Usage: node wa-node.mjs <command> [args...]
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
import * as readline from 'readline';

const AUTH_DIR = path.join(process.env.HOME, '.uni', 'tokens', 'whatsapp');
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

const logger = pino({ level: 'silent' });

// Suppress noisy session dumps from Baileys
const originalWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk, ...args) => {
  if (typeof chunk === 'string' && chunk.includes('Closing session')) return true;
  if (typeof chunk === 'string' && chunk.includes('SessionEntry')) return true;
  if (typeof chunk === 'string' && chunk.includes('_chains')) return true;
  if (typeof chunk === 'string' && chunk.includes('chainKey')) return true;
  if (typeof chunk === 'string' && chunk.includes('Buffer')) return true;
  if (typeof chunk === 'string' && chunk.includes('registrationId')) return true;
  if (typeof chunk === 'string' && chunk.includes('ephemeralKeyPair')) return true;
  if (typeof chunk === 'string' && chunk.includes('rootKey')) return true;
  if (typeof chunk === 'string' && chunk.includes('indexInfo')) return true;
  if (typeof chunk === 'string' && chunk.includes('pendingPreKey')) return true;
  if (typeof chunk === 'string' && chunk.trim().startsWith('{') && chunk.includes('chainType')) return true;
  if (typeof chunk === 'string' && chunk.trim().startsWith('}')) return true;
  return originalWrite(chunk, ...args);
};

// Parse args
const [,, command, ...args] = process.argv;

async function createClient() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
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

  return new Promise((resolve) => {
    sock.ev.on('connection.update', async (update) => {
      if (update.connection === 'open') {
        // Wait a bit for connection to stabilize
        await new Promise(r => setTimeout(r, 1000));
        resolve(sock);
      }
      if (update.connection === 'close') resolve(null);
    });
  });
}

function parseJid(chat, myJid) {
  if (chat === 'me') return myJid;
  if (chat.includes('@')) return chat;
  return `${chat.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
}

// Commands
async function cmdSend() {
  const [chat, message, fileFlag, filePath, replyFlag, replyId] = args;
  if (!chat || (!message && !filePath)) {
    console.log('Usage: send <chat> <message> [-f file] [-r replyId]');
    process.exit(1);
  }

  const sock = await createClient();
  if (!sock) { console.log('Failed to connect'); process.exit(1); }

  const myJid = sock.user?.id?.replace(/:.*@/, '@');
  const jid = parseJid(chat, myJid);

  const opts = {};
  if (replyId) {
    opts.quoted = { key: { remoteJid: jid, id: replyId }, message: {} };
  }

  let result;
  if (filePath && fs.existsSync(filePath)) {
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    const isVideo = ['.mp4', '.mov', '.avi'].includes(ext);

    if (isImage) {
      result = await sock.sendMessage(jid, { image: buffer, caption: message || '' }, opts);
    } else if (isVideo) {
      result = await sock.sendMessage(jid, { video: buffer, caption: message || '' }, opts);
    } else {
      result = await sock.sendMessage(jid, { document: buffer, fileName: path.basename(filePath), caption: message || '' }, opts);
    }
  } else {
    result = await sock.sendMessage(jid, { text: message }, opts);
  }

  console.log('Sent! ID:', result?.key?.id);
  // Wait for message to be delivered before closing
  await new Promise(r => setTimeout(r, 2000));
  await sock.end();
  process.exit(0);
}

async function cmdChats() {
  const sock = await createClient();
  if (!sock) { console.log('Failed to connect'); process.exit(1); }

  // Wait for chats
  await new Promise(r => setTimeout(r, 3000));

  const chats = await sock.groupFetchAllParticipating();
  const groups = Object.values(chats);

  console.log(`\nChats (${groups.length} groups):\n`);
  for (const g of groups.slice(0, 20)) {
    console.log(`  ${g.subject}`);
    console.log(`    ${g.id}\n`);
  }

  await sock.end();
  process.exit(0);
}

async function cmdRead() {
  const [chat, limitArg] = args;
  if (!chat) {
    console.log('Usage: read <chat> [limit]');
    process.exit(1);
  }

  const limit = parseInt(limitArg) || 10;
  const sock = await createClient();
  if (!sock) { console.log('Failed to connect'); process.exit(1); }

  const myJid = sock.user?.id?.replace(/:.*@/, '@');
  const jid = parseJid(chat, myJid);

  // Collect messages from history sync
  const messages = [];
  sock.ev.on('messaging-history.set', ({ messages: msgs }) => {
    messages.push(...msgs.filter(m => m.key?.remoteJid === jid));
  });

  await new Promise(r => setTimeout(r, 5000));

  console.log(`\nMessages (${Math.min(messages.length, limit)}):\n`);
  for (const msg of messages.slice(0, limit)) {
    const text = msg.message?.conversation ||
                 msg.message?.extendedTextMessage?.text ||
                 '[media]';
    const from = msg.key?.fromMe ? 'You' : 'Them';
    console.log(`  ${from}: ${text}`);
    console.log(`    ID: ${msg.key?.id}\n`);
  }

  await sock.end();
  process.exit(0);
}

async function cmdAuth() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = (p) => new Promise((r) => rl.question(p, (a) => r(a.trim())));

  console.log('WhatsApp Authentication\n');
  const phone = await question('Phone number (with country code): ');
  rl.close();

  if (!phone || phone.length < 10) { console.log('Invalid'); process.exit(1); }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    browser: Browsers.windows('Chrome'),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
  });

  sock.ev.on('creds.update', saveCreds);

  let done = false;
  sock.ev.on('connection.update', async (u) => {
    if (u.connection === 'connecting' && !done) {
      done = true;
      await new Promise(r => setTimeout(r, 2000));
      const code = await sock.requestPairingCode(phone);
      console.log(`\nPairing code: ${code}\n`);
      console.log('Open WhatsApp > Settings > Linked Devices > Link a Device\n');
    }
    if (u.connection === 'open') {
      console.log('Connected!');
      await sock.end();
      process.exit(0);
    }
  });
}

async function cmdEdit() {
  const [chat, msgId, newText] = args;
  if (!chat || !msgId || !newText) {
    console.log('Usage: edit <chat> <msgId> <newText>');
    process.exit(1);
  }

  const sock = await createClient();
  if (!sock) { console.log('Failed to connect'); process.exit(1); }

  const myJid = sock.user?.id?.replace(/:.*@/, '@');
  const jid = parseJid(chat, myJid);

  const key = { remoteJid: jid, id: msgId, fromMe: true };
  await sock.sendMessage(jid, { text: newText, edit: key });
  console.log('Edited!');

  await new Promise(r => setTimeout(r, 2000));
  await sock.end();
  process.exit(0);
}

async function cmdDelete() {
  const [chat, msgId] = args;
  if (!chat || !msgId) {
    console.log('Usage: delete <chat> <msgId>');
    process.exit(1);
  }

  const sock = await createClient();
  if (!sock) { console.log('Failed to connect'); process.exit(1); }

  const myJid = sock.user?.id?.replace(/:.*@/, '@');
  const jid = parseJid(chat, myJid);

  await sock.sendMessage(jid, {
    delete: { remoteJid: jid, id: msgId, fromMe: true },
  });

  console.log('Deleted!');
  await new Promise(r => setTimeout(r, 2000));
  await sock.end();
  process.exit(0);
}

async function cmdReact() {
  const [chat, msgId, emoji] = args;
  if (!chat || !msgId) {
    console.log('Usage: react <chat> <msgId> [emoji]');
    process.exit(1);
  }

  const sock = await createClient();
  if (!sock) { console.log('Failed to connect'); process.exit(1); }

  const myJid = sock.user?.id?.replace(/:.*@/, '@');
  const jid = parseJid(chat, myJid);

  await sock.sendMessage(jid, {
    react: { text: emoji || '', key: { remoteJid: jid, id: msgId, fromMe: true } },
  });

  console.log(emoji ? `Reacted with ${emoji}` : 'Removed reaction');
  await new Promise(r => setTimeout(r, 2000));
  await sock.end();
  process.exit(0);
}

async function cmdForward() {
  const [fromChat, toChat, msgId] = args;
  if (!fromChat || !toChat || !msgId) {
    console.log('Usage: forward <fromChat> <toChat> <msgId>');
    process.exit(1);
  }

  const sock = await createClient();
  if (!sock) { console.log('Failed to connect'); process.exit(1); }

  const myJid = sock.user?.id?.replace(/:.*@/, '@');
  const fromJid = parseJid(fromChat, myJid);
  const toJid = parseJid(toChat, myJid);

  // Collect messages to find the one to forward
  let message = null;
  sock.ev.on('messaging-history.set', ({ messages }) => {
    const found = messages.find(m => m.key?.id === msgId);
    if (found) message = found;
  });

  await new Promise(r => setTimeout(r, 5000));

  if (!message) {
    console.log('Message not found');
    await sock.end();
    process.exit(1);
  }

  await sock.sendMessage(toJid, { forward: message });
  console.log('Forwarded!');

  await new Promise(r => setTimeout(r, 2000));
  await sock.end();
  process.exit(0);
}

// Router
switch (command) {
  case 'auth': await cmdAuth(); break;
  case 'send': await cmdSend(); break;
  case 'chats': await cmdChats(); break;
  case 'read': await cmdRead(); break;
  case 'edit': await cmdEdit(); break;
  case 'delete': await cmdDelete(); break;
  case 'react': await cmdReact(); break;
  case 'forward': await cmdForward(); break;
  default:
    console.log('Commands: auth, send, chats, read, edit, delete, react, forward');
    process.exit(1);
}
