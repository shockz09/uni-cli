/**
 * WhatsApp client wrapper using Baileys v7
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
  proto,
} from '@whiskeysockets/baileys';
import type { WASocket } from '@whiskeysockets/baileys';
import pino from 'pino';
import * as fs from 'fs';
import * as path from 'path';

const UNI_DIR = path.join(process.env.HOME || '~', '.uni');
const AUTH_DIR = path.join(UNI_DIR, 'tokens', 'whatsapp');
const logger = pino({ level: 'silent' });

export interface WAConfig {
  authDir: string;
}

// Check if authenticated (creds.json exists)
export function isAuthenticated(): boolean {
  const credsFile = path.join(AUTH_DIR, 'creds.json');
  return fs.existsSync(credsFile);
}

// Delete session
export function deleteSession(): boolean {
  try {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true });
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

// Create and connect client
export async function createClient(): Promise<WASocket | null> {
  if (!isAuthenticated()) {
    return null;
  }

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

  // Wait for connection
  return new Promise((resolve) => {
    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'close') {
        const reason = (lastDisconnect?.error as any)?.output?.statusCode;
        if (reason === DisconnectReason.loggedOut) {
          deleteSession();
          resolve(null);
        } else {
          resolve(null);
        }
      } else if (connection === 'open') {
        resolve(sock);
      }
    });
  });
}

// Format JID for display
export function formatJid(jid: string): string {
  if (!jid) return 'Unknown';
  if (jid.endsWith('@s.whatsapp.net')) {
    return '+' + jid.replace('@s.whatsapp.net', '');
  }
  if (jid.endsWith('@g.us')) {
    return jid.replace('@g.us', ' (Group)');
  }
  return jid;
}

// Parse chat identifier to JID
export function parseChat(chat: string): string {
  if (chat.toLowerCase() === 'me') {
    return 'me';
  }
  if (chat.includes('@')) {
    return chat;
  }
  const cleaned = chat.replace(/[^0-9]/g, '');
  return `${cleaned}@s.whatsapp.net`;
}

// Get message text content
export function getMessageText(msg: proto.IWebMessageInfo): string | null {
  const content = msg.message;
  if (!content) return null;

  if (content.conversation) return content.conversation;
  if (content.extendedTextMessage?.text) return content.extendedTextMessage.text;
  if (content.imageMessage?.caption) return `[Image] ${content.imageMessage.caption}`;
  if (content.videoMessage?.caption) return `[Video] ${content.videoMessage.caption}`;
  if (content.documentMessage?.fileName) return `[Document] ${content.documentMessage.fileName}`;
  if (content.audioMessage) return '[Audio]';
  if (content.stickerMessage) return '[Sticker]';
  if (content.contactMessage?.displayName) return `[Contact] ${content.contactMessage.displayName}`;
  if (content.locationMessage) return '[Location]';
  if (content.imageMessage) return '[Image]';
  if (content.videoMessage) return '[Video]';
  if (content.documentMessage) return '[Document]';

  return null;
}

// Check if message has media
export function hasMedia(msg: proto.IWebMessageInfo): boolean {
  const content = msg.message;
  if (!content) return false;

  return !!(
    content.imageMessage ||
    content.videoMessage ||
    content.audioMessage ||
    content.documentMessage ||
    content.stickerMessage
  );
}

// Get media type
export function getMediaType(msg: proto.IWebMessageInfo): string | null {
  const content = msg.message;
  if (!content) return null;

  if (content.imageMessage) return 'image';
  if (content.videoMessage) return 'video';
  if (content.audioMessage) return 'audio';
  if (content.documentMessage) return 'document';
  if (content.stickerMessage) return 'sticker';

  return null;
}

export type { WASocket };
export { proto };
