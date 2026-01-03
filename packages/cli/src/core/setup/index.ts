/**
 * Setup Wizard (uni setup)
 *
 * Interactive setup for configuring uni-cli services.
 * Three modes:
 * 1. Easy Mode - Use uni-cli's default OAuth credentials
 * 2. Self-Host Mode - Guided wizard to create your own credentials
 * 3. Import Mode - Import shared credentials from URL/file
 */

import * as readline from 'node:readline';
import * as c from '../../utils/colors';
import { runDoctor } from '../doctor';
import {
  getGoogleCredentials,
  getSlackCredentials,
  getNotionCredentials,
  importSharedCredentials,
  saveSharedCredentials,
} from '../credentials';
import { setupGoogle } from './google';
import { setupSlack } from './slack';
import { setupNotion } from './notion';

// ============================================================
// Readline Helper
// ============================================================

function createReadline(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function question(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function confirm(rl: readline.Interface, message: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? '[Y/n]' : '[y/N]';
  const answer = await question(rl, `${message} ${c.dim(hint)} `);
  const trimmed = answer.trim().toLowerCase();

  if (trimmed === '') return defaultYes;
  return trimmed === 'y' || trimmed === 'yes';
}

// ============================================================
// Main Setup Wizard
// ============================================================

/**
 * Run interactive setup wizard
 */
export async function runSetupWizard(): Promise<void> {
  const line = '═'.repeat(46);

  console.log(`\n${c.bold(line)}`);
  console.log(c.bold(' uni CLI Setup'));
  console.log(`${c.bold(line)}\n`);

  // Get current status
  const report = await runDoctor();

  // Show current service status
  console.log(c.bold(' Current Status:'));
  console.log('');

  for (const svc of report.services) {
    const icon = svc.status === 'ready' ? c.green('✓') : c.dim('○');
    const status = svc.status === 'ready'
      ? c.green('Ready')
      : svc.status === 'not_authenticated'
        ? c.yellow('Not authenticated')
        : c.dim('Not configured');

    console.log(`   ${icon} ${c.cyan(svc.name.padEnd(10))} ${status}`);
  }

  console.log('');

  // Find services that need setup
  const needsSetup = report.services.filter(
    s => s.status !== 'ready' && !['exa', 'gh'].includes(s.name)
  );

  if (needsSetup.length === 0) {
    console.log(c.green(' All services are configured!'));
    console.log('');
    return;
  }

  const rl = createReadline();

  try {
    console.log(c.bold(' How do you want to configure?'));
    console.log('');
    console.log(`   ${c.cyan('1)')} Easy Mode - Use uni-cli's OAuth ${c.dim('(recommended)')}`);
    console.log(`   ${c.cyan('2)')} Self-Host - Create your own credentials`);
    console.log(`   ${c.cyan('3)')} Import - Use shared credentials file`);
    console.log('');

    const choice = await question(rl, ` Choice ${c.dim('[1/2/3]')}: `);
    console.log('');

    switch (choice.trim()) {
      case '1':
      case '':
        await runEasyMode(rl, needsSetup);
        break;
      case '2':
        await runSelfHostMode(rl, needsSetup);
        break;
      case '3':
        await runImportMode(rl);
        break;
      default:
        console.log(c.yellow('Invalid choice'));
    }
  } finally {
    rl.close();
  }
}

/**
 * Easy mode - use default credentials
 */
async function runEasyMode(
  rl: readline.Interface,
  needsSetup: Array<{ name: string }>
): Promise<void> {
  console.log(c.bold(' Easy Mode'));
  console.log(c.dim(' Using uni-cli\'s default OAuth credentials'));
  console.log('');

  // Group services by provider
  const googleServices = needsSetup.filter(s => ['gcal', 'gmail', 'gdrive'].includes(s.name));
  const slackService = needsSetup.find(s => s.name === 'slack');
  const notionService = needsSetup.find(s => s.name === 'notion');

  // Google services
  if (googleServices.length > 0) {
    const googleCreds = getGoogleCredentials();

    if (googleCreds.clientId) {
      console.log(c.green(' ✓ Google credentials available'));
      console.log('');
      console.log(c.bold(' To authenticate Google services, run:'));
      for (const svc of googleServices) {
        console.log(`   ${c.cyan(`uni ${svc.name} auth`)}`);
      }
      console.log('');
    } else {
      console.log(c.yellow(' ⚠ Google credentials not configured'));
      console.log(c.dim('   Default credentials will be available soon.'));
      console.log(c.dim('   For now, use self-host mode or import credentials.'));
      console.log('');
    }
  }

  // Slack
  if (slackService) {
    const slackCreds = getSlackCredentials();

    if (slackCreds.botToken || slackCreds.clientId) {
      console.log(c.green(' ✓ Slack credentials available'));
      console.log(`   Run: ${c.cyan('uni slack auth')}`);
    } else {
      console.log(c.yellow(' ⚠ Slack requires a bot token'));
      console.log(c.dim('   Run: uni setup slack --self-host'));
    }
    console.log('');
  }

  // Notion
  if (notionService) {
    const notionCreds = getNotionCredentials();

    if (notionCreds.token || notionCreds.clientId) {
      console.log(c.green(' ✓ Notion credentials available'));
    } else {
      console.log(c.yellow(' ⚠ Notion requires an integration token'));
      console.log(c.dim('   Run: uni setup notion --self-host'));
    }
    console.log('');
  }
}

/**
 * Self-host mode - guided setup for each service
 */
async function runSelfHostMode(
  rl: readline.Interface,
  needsSetup: Array<{ name: string }>
): Promise<void> {
  console.log(c.bold(' Self-Host Mode'));
  console.log(c.dim(' Create your own credentials with guided wizards'));
  console.log('');

  // Group services
  const hasGoogle = needsSetup.some(s => ['gcal', 'gmail', 'gdrive'].includes(s.name));
  const hasSlack = needsSetup.some(s => s.name === 'slack');
  const hasNotion = needsSetup.some(s => s.name === 'notion');

  console.log(c.bold(' Which service would you like to set up?'));
  console.log('');

  const options: Array<{ key: string; label: string; action: () => Promise<void> }> = [];

  if (hasGoogle) {
    options.push({
      key: String(options.length + 1),
      label: 'Google (gcal, gmail, gdrive)',
      action: () => setupGoogle(rl),
    });
  }

  if (hasSlack) {
    options.push({
      key: String(options.length + 1),
      label: 'Slack',
      action: () => setupSlack(rl),
    });
  }

  if (hasNotion) {
    options.push({
      key: String(options.length + 1),
      label: 'Notion',
      action: () => setupNotion(rl),
    });
  }

  for (const opt of options) {
    console.log(`   ${c.cyan(opt.key + ')')} ${opt.label}`);
  }
  console.log(`   ${c.cyan('a)')} All`);
  console.log(`   ${c.cyan('q)')} Quit`);
  console.log('');

  const choice = await question(rl, ` Choice: `);
  console.log('');

  if (choice.toLowerCase() === 'q') {
    return;
  }

  if (choice.toLowerCase() === 'a') {
    for (const opt of options) {
      await opt.action();
      console.log('');
    }
    return;
  }

  const selected = options.find(o => o.key === choice.trim());
  if (selected) {
    await selected.action();
  } else {
    console.log(c.yellow('Invalid choice'));
  }
}

/**
 * Import mode - import from URL/file
 */
async function runImportMode(rl: readline.Interface): Promise<void> {
  console.log(c.bold(' Import Mode'));
  console.log(c.dim(' Import credentials from a shared file or URL'));
  console.log('');

  console.log(c.dim(' Examples:'));
  console.log(c.dim('   https://example.com/uni-credentials.json'));
  console.log(c.dim('   ./team-credentials.json'));
  console.log(c.dim('   gist:abc123'));
  console.log('');

  const source = await question(rl, ` Source: `);

  if (!source.trim()) {
    console.log(c.yellow('No source provided'));
    return;
  }

  console.log('');
  console.log(c.dim(' Fetching credentials...'));

  try {
    const creds = await importSharedCredentials(source.trim());

    console.log('');
    const line = '═'.repeat(46);
    console.log(c.bold(line));
    console.log(c.bold(` Importing credentials${creds.name ? ` from: ${creds.name}` : ''}`));
    console.log(c.bold(line));
    console.log('');

    console.log(c.bold(' This will configure:'));
    if (creds.google) console.log(`   • Google (gcal, gmail, gdrive)`);
    if (creds.slack) console.log(`   • Slack`);
    if (creds.notion) console.log(`   • Notion`);
    console.log('');

    console.log(c.dim(` Source: ${source}`));
    console.log('');

    const confirmed = await confirm(rl, ' Continue?', true);

    if (!confirmed) {
      console.log(c.dim(' Cancelled'));
      return;
    }

    await saveSharedCredentials(creds);

    console.log('');
    console.log(c.green(' ✓ Credentials saved'));
    console.log('');
    console.log(c.bold(' Now authenticate each service:'));
    if (creds.google) {
      console.log(`   ${c.cyan('uni gcal auth')}`);
      console.log(`   ${c.cyan('uni gmail auth')}`);
      console.log(`   ${c.cyan('uni gdrive auth')}`);
    }
    if (creds.slack) console.log(`   ${c.cyan('uni slack auth')}`);
    if (creds.notion) console.log(`   ${c.cyan('uni notion auth')}`);
    console.log('');
  } catch (error) {
    console.log(c.red(` Error: ${error instanceof Error ? error.message : String(error)}`));
  }
}

// ============================================================
// Single Service Setup
// ============================================================

export type ServiceType = 'google' | 'gcal' | 'gmail' | 'gdrive' | 'slack' | 'notion';

/**
 * Setup a specific service
 */
export async function setupService(
  service: ServiceType,
  options: { selfHost?: boolean } = {}
): Promise<void> {
  const rl = createReadline();

  try {
    // Normalize service name
    const normalizedService = ['gcal', 'gmail', 'gdrive'].includes(service) ? 'google' : service;

    if (options.selfHost) {
      // Run self-host wizard
      switch (normalizedService) {
        case 'google':
          await setupGoogle(rl);
          break;
        case 'slack':
          await setupSlack(rl);
          break;
        case 'notion':
          await setupNotion(rl);
          break;
        default:
          console.log(c.yellow(`Self-host setup not available for: ${service}`));
      }
    } else {
      // Easy mode - just show auth instructions
      console.log('');

      switch (normalizedService) {
        case 'google': {
          const creds = getGoogleCredentials();
          if (creds.clientId) {
            console.log(c.green(' ✓ Google credentials available'));
            console.log('');
            console.log(c.bold(' To authenticate, run:'));
            if (service === 'google' || service === 'gcal') {
              console.log(`   ${c.cyan('uni gcal auth')}`);
            }
            if (service === 'google' || service === 'gmail') {
              console.log(`   ${c.cyan('uni gmail auth')}`);
            }
            if (service === 'google' || service === 'gdrive') {
              console.log(`   ${c.cyan('uni gdrive auth')}`);
            }
          } else {
            console.log(c.yellow(' Google credentials not configured'));
            console.log('');
            console.log(' Run with --self-host to set up your own:');
            console.log(`   ${c.cyan('uni setup google --self-host')}`);
          }
          break;
        }

        case 'slack': {
          const creds = getSlackCredentials();
          if (creds.botToken || creds.clientId) {
            console.log(c.green(' ✓ Slack credentials available'));
          } else {
            console.log(c.yellow(' Slack requires a bot token'));
            console.log('');
            console.log(' Run with --self-host to set up:');
            console.log(`   ${c.cyan('uni setup slack --self-host')}`);
          }
          break;
        }

        case 'notion': {
          const creds = getNotionCredentials();
          if (creds.token || creds.clientId) {
            console.log(c.green(' ✓ Notion credentials available'));
          } else {
            console.log(c.yellow(' Notion requires an integration token'));
            console.log('');
            console.log(' Run with --self-host to set up:');
            console.log(`   ${c.cyan('uni setup notion --self-host')}`);
          }
          break;
        }

        default:
          console.log(c.yellow(`Unknown service: ${service}`));
      }

      console.log('');
    }
  } finally {
    rl.close();
  }
}

/**
 * Import credentials from source
 */
export async function setupFromSource(source: string): Promise<void> {
  const rl = createReadline();

  try {
    await runImportMode(rl);
  } finally {
    rl.close();
  }
}
