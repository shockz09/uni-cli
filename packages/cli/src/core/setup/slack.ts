/**
 * Slack Self-Host Setup Wizard
 *
 * Guides user through creating their own Slack App and Bot Token.
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
// Slack Setup Wizard
// ============================================================

/**
 * Run Slack self-host setup wizard
 */
export async function setupSlack(rl: readline.Interface): Promise<void> {
  const line = '═'.repeat(46);

  console.log(`\n${c.bold(line)}`);
  console.log(c.bold(' Slack Setup (Self-Hosted)'));
  console.log(`${c.bold(line)}\n`);

  // Step 1: Create Slack App
  console.log(c.bold('Step 1/4: Create Slack App'));
  console.log(c.dim('─'.repeat(26)));
  console.log(`${c.cyan('→')} Opening: ${c.dim('api.slack.com/apps?new_app=1')}`);
  console.log('');
  console.log('  • Click "Create New App"');
  console.log('  • Choose "From scratch"');
  console.log('  • App Name: uni-cli');
  console.log('  • Pick your workspace');
  console.log('  • Click "Create App"');
  console.log('');

  openUrl('https://api.slack.com/apps?new_app=1');
  await pressEnter(rl);
  console.log('');

  // Step 2: Add Bot Permissions
  console.log(c.bold('Step 2/4: Add Bot Permissions'));
  console.log(c.dim('─'.repeat(29)));
  console.log(`${c.cyan('→')} Go to: ${c.dim('OAuth & Permissions')} in your app settings`);
  console.log('');
  console.log('  Add these Bot Token Scopes:');
  console.log(`  • ${c.yellow('channels:read')}`);
  console.log(`  • ${c.yellow('channels:history')}`);
  console.log(`  • ${c.yellow('chat:write')}`);
  console.log(`  • ${c.yellow('users:read')}`);
  console.log('');

  openUrl('https://api.slack.com/apps');
  await pressEnter(rl);
  console.log('');

  // Step 3: Install to Workspace
  console.log(c.bold('Step 3/4: Install to Workspace'));
  console.log(c.dim('─'.repeat(30)));
  console.log('');
  console.log('  • Click "Install to Workspace"');
  console.log('  • Click "Allow"');
  console.log('');

  await pressEnter(rl);
  console.log('');

  // Step 4: Copy Bot Token
  console.log(c.bold('Step 4/4: Copy Bot Token'));
  console.log(c.dim('─'.repeat(24)));
  console.log('');
  console.log('  • Go to "OAuth & Permissions"');
  console.log('  • Copy "Bot User OAuth Token" (starts with xoxb-)');
  console.log('');

  const botToken = await question(rl, `  ${c.cyan('Paste Bot Token:')} `);

  if (!botToken.trim()) {
    console.log('');
    console.log(c.yellow('  Token not provided. Setup cancelled.'));
    return;
  }

  if (!botToken.trim().startsWith('xoxb-')) {
    console.log('');
    console.log(c.yellow('  Warning: Token should start with "xoxb-"'));
  }

  // Save token
  await config.set('slack.botToken', botToken.trim());

  console.log('');
  console.log(c.green('  ✓ Saved to ~/.uni/config.toml'));
  console.log(c.green('  ✓ Slack ready! (self-hosted)'));
  console.log('');
  console.log('  You can now use:');
  console.log(`    ${c.cyan('uni slack channels')}`);
  console.log(`    ${c.cyan('uni slack messages <channel>')}`);
  console.log(`    ${c.cyan('uni slack send <channel> "message"')}`);
  console.log('');
}
