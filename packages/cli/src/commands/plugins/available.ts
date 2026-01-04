/**
 * uni plugins available - List official plugins from registry
 */

import type { Command } from '@uni/shared';
import { fetchOfficialRegistry, isInstalled } from '../../core/plugins.js';
import { c } from '@uni/shared';

export const availableCommand: Command = {
  name: 'available',
  description: 'List official plugins from registry',
  args: [],
  options: [],
  examples: ['uni plugins available'],

  async run() {
    console.log('Fetching official plugin registry...');

    const registry = await fetchOfficialRegistry();

    if (!registry || registry.plugins.length === 0) {
      console.log(c.yellow('Could not fetch official registry or no plugins available'));
      console.log('');
      console.log('You can still install community plugins:');
      console.log(`  ${c.cyan('uni plugins search <query>')} - search npm`);
      console.log(`  ${c.cyan('uni plugins install github:user/repo')} - from GitHub`);
      return;
    }

    console.log('');
    console.log(c.bold('Official Plugins'));
    console.log('');

    // Header
    console.log(
      `  ${c.dim('Name'.padEnd(12))} ${c.dim('Description'.padEnd(35))} ${c.dim('Status')}`
    );
    console.log(c.dim('  ' + '-'.repeat(60)));

    for (const plugin of registry.plugins) {
      const installed = isInstalled(plugin.name);
      const status = installed ? c.green('installed') : c.dim('available');

      console.log(
        `  ${c.cyan(plugin.name.padEnd(12))} ${plugin.description.substring(0, 35).padEnd(35)} ${status}`
      );
    }

    console.log('');
    console.log(`Use ${c.cyan("'uni plugins install <name>'")} to install`);
  },
};
