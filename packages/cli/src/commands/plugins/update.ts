/**
 * uni plugins update - Update installed plugins
 */

import type { Command } from '@uni/shared';
import {
  checkForUpdates,
  getInstalledPlugins,
  loadRegistry,
  installFromNpm,
  installFromGitHub,
} from '../../core/plugins.js';
import { c } from '@uni/shared';
import { registry as serviceRegistry } from '../../core/registry.js';

export const updateCommand: Command = {
  name: 'update',
  description: 'Update installed plugins',
  args: [
    {
      name: 'name',
      description: 'Plugin name to update (optional, updates all if not specified)',
      required: false,
    },
  ],
  options: [],
  examples: [
    'uni plugins update',
    'uni plugins update gkeep',
  ],

  async run({ args }) {
    const targetPlugin = args[0];
    const plugins = getInstalledPlugins();

    if (plugins.length === 0) {
      console.log(c.dim('No plugins installed'));
      return;
    }

    if (targetPlugin) {
      // Update specific plugin
      const plugin = plugins.find(p => p.name === targetPlugin);
      if (!plugin) {
        console.error(c.red(`Error: Plugin '${targetPlugin}' is not installed`));
        process.exit(1);
      }

      await updateSinglePlugin(plugin.name, plugin.info.source);
    } else {
      // Check for updates first
      console.log('Checking for updates...');
      const updates = await checkForUpdates();

      if (Object.keys(updates).length === 0) {
        console.log(c.green('\u2713 All plugins are up to date'));
        return;
      }

      console.log('');
      console.log(c.bold('Available Updates'));
      console.log('');

      for (const [name, newVersion] of Object.entries(updates)) {
        const plugin = plugins.find(p => p.name === name);
        if (plugin) {
          console.log(`  ${c.cyan(name)} ${c.dim(plugin.info.version)} → ${c.green(newVersion)}`);
        }
      }

      console.log('');
      console.log('Updating...');
      console.log('');

      // Update all plugins with available updates
      for (const name of Object.keys(updates)) {
        const plugin = plugins.find(p => p.name === name);
        if (plugin) {
          await updateSinglePlugin(name, plugin.info.source);
        }
      }
    }

    // Invalidate service registry
    serviceRegistry.invalidate();
  },
};

async function updateSinglePlugin(name: string, source: string): Promise<void> {
  try {
    if (source.startsWith('npm:')) {
      const packageName = source.replace('npm:', '');
      console.log(`Updating ${c.cyan(name)}...`);
      await installFromNpm(packageName, name);
      console.log(c.green(`\u2713 Updated ${name}`));
    } else if (source.startsWith('github:')) {
      const repoPath = source;
      console.log(`Updating ${c.cyan(name)} from GitHub...`);
      await installFromGitHub(repoPath, name);
      console.log(c.green(`\u2713 Updated ${name}`));
    } else if (source.startsWith('local:')) {
      console.log(c.yellow(`${name} is a local plugin - rebuild manually`));
    } else {
      console.log(c.yellow(`Unknown source for ${name}: ${source}`));
    }
  } catch (error) {
    console.error(c.red(`Failed to update ${name}: ${error instanceof Error ? error.message : error}`));
  }
}
