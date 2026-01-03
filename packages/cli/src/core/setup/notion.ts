/**
 * Notion Self-Host Setup Wizard
 *
 * Guides user through creating their own Notion Integration.
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
// Notion Setup Wizard
// ============================================================

/**
 * Run Notion self-host setup wizard
 */
export async function setupNotion(rl: readline.Interface): Promise<void> {
  const line = '═'.repeat(46);

  console.log(`\n${c.bold(line)}`);
  console.log(c.bold(' Notion Setup (Self-Hosted)'));
  console.log(`${c.bold(line)}\n`);

  // Step 1: Create Integration
  console.log(c.bold('Step 1/3: Create Integration'));
  console.log(c.dim('─'.repeat(28)));
  console.log(`${c.cyan('→')} Opening: ${c.dim('notion.so/my-integrations')}`);
  console.log('');
  console.log('  • Click "New integration"');
  console.log('  • Name: uni-cli');
  console.log('  • Select your workspace');
  console.log('  • Click "Submit"');
  console.log('');

  openUrl('https://www.notion.so/my-integrations');
  await pressEnter(rl);
  console.log('');

  // Step 2: Copy Token
  console.log(c.bold('Step 2/3: Copy Token'));
  console.log(c.dim('─'.repeat(20)));
  console.log('');
  console.log('  • Click "Show" next to Internal Integration Token');
  console.log('  • Copy the token (starts with secret_)');
  console.log('');

  const token = await question(rl, `  ${c.cyan('Paste Token:')} `);

  if (!token.trim()) {
    console.log('');
    console.log(c.yellow('  Token not provided. Setup cancelled.'));
    return;
  }

  if (!token.trim().startsWith('secret_')) {
    console.log('');
    console.log(c.yellow('  Warning: Token should start with "secret_"'));
  }

  // Save token
  await config.set('notion.token', token.trim());

  console.log('');
  console.log(c.green('  ✓ Saved to ~/.uni/config.toml'));
  console.log('');

  // Step 3: Connect to Pages
  console.log(c.bold('Step 3/3: Connect to Pages'));
  console.log(c.dim('─'.repeat(26)));
  console.log('');
  console.log('  To access a page or database:');
  console.log('  • Open the page in Notion');
  console.log('  • Click ••• (top right)');
  console.log('  • Click "Connect to" → "uni-cli"');
  console.log('');
  console.log(c.green('  ✓ Notion ready! (self-hosted)'));
  console.log('');
  console.log('  You can now use:');
  console.log(`    ${c.cyan('uni notion search "query"')}`);
  console.log(`    ${c.cyan('uni notion pages <page-id>')}`);
  console.log(`    ${c.cyan('uni notion databases')}`);
  console.log('');
}
