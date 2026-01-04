/**
 * uni plugins install - Install a plugin from npm or GitHub
 */

import type { Command } from '@uni/shared';
import {
  installFromNpm,
  installFromGitHub,
  resolvePackageName,
  isInstalled,
} from '../../core/plugins.js';
import { c } from '@uni/shared';
import { registry } from '../../core/registry.js';

export const installCommand: Command = {
  name: 'install',
  description: 'Install a plugin',
  args: [
    {
      name: 'name',
      description: 'Plugin name, npm package, or github:user/repo',
      required: true,
    },
  ],
  options: [
    {
      name: 'force',
      short: 'f',
      description: 'Reinstall even if already installed',
      type: 'boolean',
    },
  ],
  examples: [
    'uni plugins install gkeep',
    'uni plugins install @uni/plugin-linear',
    'uni plugins install github:someone/uni-plugin-cool',
    'uni plugins install gkeep --force',
  ],

  async run({ args, flags }) {
    const name = args[0];
    const force = flags.force as boolean;

    if (!name) {
      console.error(c.red('Error: Plugin name required'));
      console.log('');
      console.log(`Usage: ${c.cyan('uni plugins install <name>')}`);
      process.exit(1);
    }

    // Check if installing from GitHub
    if (name.startsWith('github:')) {
      const repoPath = name;
      // Extract plugin name from repo (last part of path)
      const parts = name.replace('github:', '').split('/');
      const repoName = parts[parts.length - 1];
      const pluginName = repoName.replace(/^uni-plugin-/, '').replace(/^plugin-/, '');

      if (!force && isInstalled(pluginName)) {
        console.log(c.yellow(`Plugin '${pluginName}' is already installed`));
        console.log(`Use ${c.cyan('--force')} to reinstall`);
        return;
      }

      console.log(`Installing ${c.cyan(pluginName)} from GitHub...`);

      try {
        await installFromGitHub(repoPath, pluginName);
        console.log(c.green(`\u2713 Installed ${pluginName}`));

        // Invalidate registry so the new plugin is discovered
        registry.invalidate();
      } catch (error) {
        console.error(c.red(`Error: ${error instanceof Error ? error.message : error}`));
        process.exit(1);
      }
      return;
    }

    // Resolve plugin name to npm package
    console.log(`Resolving ${c.cyan(name)}...`);

    const resolved = await resolvePackageName(name);

    if (!resolved) {
      console.error(c.red(`Error: Plugin '${name}' not found`));
      console.log('');
      console.log('Try:');
      console.log(`  ${c.cyan('uni plugins available')} - see official plugins`);
      console.log(`  ${c.cyan('uni plugins search <query>')} - search npm for plugins`);
      process.exit(1);
    }

    const { packageName, pluginName } = resolved;

    if (!force && isInstalled(pluginName)) {
      console.log(c.yellow(`Plugin '${pluginName}' is already installed`));
      console.log(`Use ${c.cyan('--force')} to reinstall`);
      return;
    }

    console.log(`Installing ${c.cyan(pluginName)} from ${c.dim(packageName)}...`);

    try {
      await installFromNpm(packageName, pluginName);
      console.log(c.green(`\u2713 Installed ${pluginName}`));

      // Invalidate registry so the new plugin is discovered
      registry.invalidate();
    } catch (error) {
      console.error(c.red(`Error: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  },
};
