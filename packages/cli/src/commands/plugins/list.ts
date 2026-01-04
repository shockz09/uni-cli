/**
 * uni plugins list - List installed plugins
 */

import type { Command } from '@uni/shared';
import { getInstalledPlugins, getAvailableUpdates } from '../../core/plugins.js';
import { c } from '@uni/shared';

export const listCommand: Command = {
  name: 'list',
  description: 'List installed plugins',
  args: [],
  options: [],
  examples: ['uni plugins list'],

  async run() {
    const plugins = getInstalledPlugins();
    const updates = getAvailableUpdates();

    if (plugins.length === 0) {
      console.log(c.dim('No plugins installed'));
      console.log('');
      console.log(`Run ${c.cyan('uni plugins available')} to see official plugins`);
      console.log(`Run ${c.cyan('uni plugins install <name>')} to install a plugin`);
      return;
    }

    console.log(c.bold('Installed Plugins'));
    console.log('');

    for (const { name, info } of plugins) {
      const updateAvailable = updates[name];
      const sourceType = info.source.startsWith('npm:')
        ? '[npm]'
        : info.source.startsWith('github:')
        ? '[github]'
        : info.source.startsWith('local:')
        ? '[local]'
        : '[unknown]';

      let line = `  ${c.cyan(name.padEnd(12))} ${c.dim(info.version.padEnd(10))} ${c.dim(sourceType)}`;

      if (updateAvailable) {
        line += ` ${c.yellow(`(${updateAvailable} available)`)}`;
      }

      console.log(line);
    }

    console.log('');
    console.log(c.dim(`${plugins.length} plugin${plugins.length === 1 ? '' : 's'} installed`));
  },
};
