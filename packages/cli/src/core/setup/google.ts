/**
 * Google Self-Host Setup Wizard
 *
 * Guides user through creating their own Google Cloud OAuth credentials.
 */

import * as readline from 'node:readline';
import * as c from '../../utils/colors';
import { config } from '../config';

// ============================================================
// Helper Functions
// ============================================================

async function question(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function pressEnter(rl: readline.Interface): Promise<void> {
  await question(rl, c.dim('  Press Enter when done... '));
}

function openUrl(url: string): void {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  try {
    Bun.spawn([cmd, url], { stdout: 'ignore', stderr: 'ignore' });
  } catch {
    // Ignore errors if browser can't be opened
  }
}

// ============================================================
// Google Setup Wizard
// ============================================================

/**
 * Run Google self-host setup wizard
 */
export async function setupGoogle(rl: readline.Interface): Promise<void> {
  const line = '═'.repeat(46);

  console.log(`\n${c.bold(line)}`);
  console.log(c.bold(' Google Setup (Self-Hosted)'));
  console.log(`${c.bold(line)}\n`);

  console.log(c.dim(' This will set up Google Calendar, Gmail, and Drive.'));
  console.log('');

  // Step 1: Create Google Cloud Project
  console.log(c.bold('Step 1/5: Create Google Cloud Project'));
  console.log(c.dim('─'.repeat(37)));
  console.log(`${c.cyan('→')} Opening: ${c.dim('console.cloud.google.com/projectcreate')}`);
  console.log('');
  console.log('  • Click "Create Project"');
  console.log('  • Name: uni-cli (or anything)');
  console.log('  • Click "Create"');
  console.log('');

  openUrl('https://console.cloud.google.com/projectcreate');
  await pressEnter(rl);
  console.log('');

  // Step 2: Enable APIs
  console.log(c.bold('Step 2/5: Enable APIs'));
  console.log(c.dim('─'.repeat(21)));
  console.log(`${c.cyan('→')} Opening: ${c.dim('console.cloud.google.com/apis/library')}`);
  console.log('');
  console.log('  Enable these APIs (click each, then "Enable"):');
  console.log(`  • ${c.yellow('Google Calendar API')}`);
  console.log(`  • ${c.yellow('Gmail API')}`);
  console.log(`  • ${c.yellow('Google Drive API')}`);
  console.log('');

  openUrl('https://console.cloud.google.com/apis/library');
  await pressEnter(rl);
  console.log('');

  // Step 3: OAuth Consent Screen
  console.log(c.bold('Step 3/5: OAuth Consent Screen'));
  console.log(c.dim('─'.repeat(30)));
  console.log(`${c.cyan('→')} Opening: ${c.dim('console.cloud.google.com/apis/credentials/consent')}`);
  console.log('');
  console.log('  • User Type: External → Create');
  console.log('  • App name: uni-cli');
  console.log('  • User support email: your email');
  console.log('  • Developer contact: your email');
  console.log('  • Click "Save and Continue"');
  console.log('  • Scopes: Skip (Save and Continue)');
  console.log('  • Test users: Add your email');
  console.log('  • Click "Save and Continue"');
  console.log('');

  openUrl('https://console.cloud.google.com/apis/credentials/consent');
  await pressEnter(rl);
  console.log('');

  // Step 4: Create Credentials
  console.log(c.bold('Step 4/5: Create Credentials'));
  console.log(c.dim('─'.repeat(28)));
  console.log(`${c.cyan('→')} Opening: ${c.dim('console.cloud.google.com/apis/credentials')}`);
  console.log('');
  console.log('  • Click "Create Credentials"');
  console.log('  • Choose "OAuth client ID"');
  console.log('  • Application type: Desktop app');
  console.log('  • Name: uni-cli');
  console.log('  • Click "Create"');
  console.log('');

  openUrl('https://console.cloud.google.com/apis/credentials');

  // Wait a moment for user to complete
  await question(rl, c.dim('  Press Enter after creating credentials... '));
  console.log('');

  // Get credentials from user
  const clientId = await question(rl, `  ${c.cyan('Paste Client ID:')} `);
  const clientSecret = await question(rl, `  ${c.cyan('Paste Client Secret:')} `);

  if (!clientId.trim() || !clientSecret.trim()) {
    console.log('');
    console.log(c.yellow('  Credentials not provided. Setup cancelled.'));
    return;
  }

  // Save credentials
  await config.set('google.clientId', clientId.trim());
  await config.set('google.clientSecret', clientSecret.trim());

  console.log('');
  console.log(c.green('  ✓ Saved to ~/.uni/config.toml'));
  console.log('');

  // Step 5: Authenticate
  console.log(c.bold('Step 5/5: Authenticate'));
  console.log(c.dim('─'.repeat(22)));
  console.log('');
  console.log(c.green('  ✓ Google services ready! (self-hosted)'));
  console.log('');
  console.log('  You can now authenticate:');
  console.log(`    ${c.cyan('uni gcal auth')}`);
  console.log(`    ${c.cyan('uni gmail auth')}`);
  console.log(`    ${c.cyan('uni gdrive auth')}`);
  console.log('');
}
