#!/usr/bin/env node
/**
 * WhatsApp auth script - run with Node.js (not Bun)
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} from '@whiskeysockets/baileys';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import pino from 'pino';

const AUTH_DIR = path.join(process.env.HOME, '.uni', 'tokens', 'whatsapp');
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

const logger = pino({ level: 'silent' });

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (p) => new Promise((r) => rl.question(p, (a) => r(a.trim())));

let phoneNumber = '';
let pairingCodeShown = false;
let reconnectCount = 0;

async function connect() {
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

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'connecting' && !pairingCodeShown && phoneNumber) {
      pairingCodeShown = true;
      try {
        await new Promise(r => setTimeout(r, 2000));
        const code = await sock.requestPairingCode(phoneNumber);
        console.log(`\nPairing code: ${code}\n`);
        console.log('Open WhatsApp > Settings > Linked Devices > Link a Device');
        console.log('Enter the code above.\n');
      } catch (err) {
        console.error('Failed:', err.message);
        process.exit(1);
      }
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;

      if (reason === DisconnectReason.loggedOut) {
        console.log('Logged out');
        process.exit(1);
      }

      reconnectCount++;
      if (reconnectCount > 5) {
        console.log('Too many retries.');
        process.exit(1);
      }

      setTimeout(connect, 3000);
    }

    if (connection === 'open') {
      console.log('\nConnected!');
      console.log(`Session saved to ${AUTH_DIR}`);
      await sock.end();
      process.exit(0);
    }
  });
}

async function main() {
  console.log('WhatsApp Authentication\n');
  phoneNumber = await question('Phone number (with country code): ');
  rl.close();

  if (!phoneNumber || phoneNumber.length < 10) {
    console.log('Invalid');
    process.exit(1);
  }

  console.log('\nConnecting...');
  await connect();
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
