/**
 * uni plugins uninstall - Remove a plugin
 */

import type { Command } from '@uni/shared';
import { uninstallPlugin, isInstalled } from '../../core/plugins.js';
import { c } from '@uni/shared';
import { registry } from '../../core/registry.js';

export const uninstallCommand: Command = {
  name: 'uninstall',
  description: 'Remove a plugin',
  args: [
    {
      name: 'name',
      description: 'Plugin name to remove',
      required: true,
    },
  ],
  options: [],
  examples: [
    'uni plugins uninstall gkeep',
    'uni plugins uninstall linear',
  ],

  async run({ args }) {
    const name = args[0];

    if (!name) {
      console.error(c.red('Error: Plugin name required'));
      console.log('');
      console.log(`Usage: ${c.cyan('uni plugins uninstall <name>')}`);
      process.exit(1);
    }

    if (!isInstalled(name)) {
      console.error(c.red(`Error: Plugin '${name}' is not installed`));
      process.exit(1);
    }

    try {
      uninstallPlugin(name);
      console.log(c.green(`\u2713 Uninstalled ${name}`));

      // Invalidate registry
      registry.invalidate();
    } catch (error) {
      console.error(c.red(`Error: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  },
};
