/**
 * uni wa auth - Authenticate with WhatsApp via pairing code
 * Uses Node.js subprocess because Bun's WebSocket doesn't work with Baileys
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { isAuthenticated } from '../client';
import { spawn, spawnSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const AUTH_SCRIPT = `
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const AUTH_DIR = path.join(process.env.HOME, '.uni', 'tokens', 'whatsapp');
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (p) => new Promise((r) => rl.question(p, (a) => r(a.trim())));

async function main() {
  console.log('WhatsApp Authentication\\n');
  const phone = await question('Phone number (with country code): ');
  rl.close();
  if (!phone || phone.length < 10) { console.log('Invalid'); process.exit(1); }
  console.log('\\nConnecting...');

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const sock = makeWASocket({ auth: state, printQRInTerminal: false, syncFullHistory: false });
  sock.ev.on('creds.update', saveCreds);

  let done = false;
  sock.ev.on('connection.update', async (u) => {
    if (u.connection === 'connecting' && !done) {
      done = true;
      await new Promise(r => setTimeout(r, 2000));
      try {
        const code = await sock.requestPairingCode(phone);
        console.log('\\nPairing code: ' + code);
        console.log('\\nOpen WhatsApp > Settings > Linked Devices > Link a Device');
        console.log('Enter the code when prompted.\\n');
      } catch(e) { console.error('Failed:', e.message); process.exit(1); }
    }
    if (u.connection === 'close') {
      const creds = path.join(AUTH_DIR, 'creds.json');
      if (fs.existsSync(creds)) {
        const c = JSON.parse(fs.readFileSync(creds, 'utf-8'));
        if (c.me?.id) { console.log('\\nAuthenticated!'); process.exit(0); }
      }
    }
    if (u.connection === 'open') { console.log('\\nConnected!'); await sock.end(); process.exit(0); }
  });
}
main().catch(e => { console.error(e.message); process.exit(1); });
`;

export const authCommand: Command = {
  name: 'auth',
  description: 'Authenticate with WhatsApp (pairing code)',
  examples: ['uni wa auth'],

  async handler(ctx: CommandContext): Promise<void> {
    const { output } = ctx;

    if (isAuthenticated()) {
      console.log(c.cyan('Already authenticated with WhatsApp.'));
      console.log(c.dim('Use `uni wa logout` to clear session.'));
      return;
    }

    // Check node is available
    const nodeCheck = spawnSync('node', ['--version']);
    if (nodeCheck.status !== 0) {
      output.error('Node.js is required for WhatsApp auth. Please install Node.js.');
      return;
    }

    // Find uni-cli directory (where baileys is installed)
    const uniCliDir = path.join(os.homedir(), 'projects', 'uni-cli');
    const serviceWaDir = path.join(uniCliDir, 'packages', 'service-wa');

    if (!fs.existsSync(serviceWaDir)) {
      output.error('uni-cli not found at ~/projects/uni-cli. WhatsApp auth requires the dev environment.');
      return;
    }

    // Use the existing auth-node.mjs in the service-wa directory
    const scriptPath = path.join(serviceWaDir, 'auth-node.mjs');

    if (!fs.existsSync(scriptPath)) {
      output.error('Auth script not found. Run from uni-cli directory.');
      return;
    }

    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: serviceWaDir,
    });

    await new Promise<void>((resolve) => {
      child.on('close', () => resolve());
    });
  },
};
