/**
 * uni plugins link - Link a local plugin for development
 */

import type { Command } from '@uni/shared';
import { linkPlugin } from '../../core/plugins.js';
import { c } from '@uni/shared';
import { registry } from '../../core/registry.js';
import * as path from 'node:path';

export const linkCommand: Command = {
  name: 'link',
  description: 'Link a local plugin for development',
  args: [
    {
      name: 'path',
      description: 'Path to plugin directory',
      required: true,
    },
  ],
  options: [
    {
      name: 'name',
      short: 'n',
      description: 'Plugin name (defaults to directory name)',
      type: 'string',
    },
  ],
  examples: [
    'uni plugins link ./my-plugin',
    'uni plugins link ../uni-plugin-foo --name foo',
  ],

  async run({ args, flags }) {
    const pluginPath = args[0];

    if (!pluginPath) {
      console.error(c.red('Error: Plugin path required'));
      console.log('');
      console.log(`Usage: ${c.cyan('uni plugins link <path>')}`);
      process.exit(1);
    }

    // Determine plugin name
    let pluginName = flags.name as string;
    if (!pluginName) {
      pluginName = path.basename(path.resolve(pluginPath));
      // Clean up common prefixes
      pluginName = pluginName
        .replace(/^uni-plugin-/, '')
        .replace(/^plugin-/, '')
        .replace(/^@uni\/plugin-/, '');
    }

    console.log(`Linking ${c.cyan(pluginName)} from ${c.dim(pluginPath)}...`);

    try {
      linkPlugin(pluginPath, pluginName);
      console.log(c.green(`\u2713 Linked ${pluginName}`));
      console.log('');
      console.log(c.dim('Note: Plugin must be built (dist/index.js) for changes to take effect'));

      // Invalidate registry
      registry.invalidate();
    } catch (error) {
      console.error(c.red(`Error: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  },
};
