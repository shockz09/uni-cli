/**
 * uni plugins search - Search for plugins
 */

import type { Command } from '@uni/shared';
import { searchNpm, fetchOfficialRegistry, isInstalled } from '../../core/plugins.js';
import { c } from '@uni/shared';

export const searchCommand: Command = {
  name: 'search',
  description: 'Search for plugins',
  args: [
    {
      name: 'query',
      description: 'Search query',
      required: true,
    },
  ],
  options: [],
  examples: [
    'uni plugins search google',
    'uni plugins search linear',
  ],

  async run({ args }) {
    const query = args[0];

    if (!query) {
      console.error(c.red('Error: Search query required'));
      console.log('');
      console.log(`Usage: ${c.cyan('uni plugins search <query>')}`);
      process.exit(1);
    }

    console.log(`Searching for "${c.cyan(query)}"...`);
    console.log('');

    // Search official registry first
    const official = await fetchOfficialRegistry();
    const officialMatches = official?.plugins.filter(
      p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase()) ||
        p.tags?.some(t => t.toLowerCase().includes(query.toLowerCase()))
    ) || [];

    // Search npm
    const npmResults = await searchNpm(query);

    // Filter out official plugins from npm results
    const officialNames = new Set(officialMatches.map(p => p.package));
    const communityResults = npmResults.filter(p => !officialNames.has(p.name));

    if (officialMatches.length === 0 && communityResults.length === 0) {
      console.log(c.yellow('No plugins found'));
      console.log('');
      console.log('Try:');
      console.log(`  ${c.cyan('uni plugins available')} - see all official plugins`);
      console.log(`  ${c.cyan('uni plugins install github:user/repo')} - install from GitHub`);
      return;
    }

    // Show official matches
    if (officialMatches.length > 0) {
      console.log(c.bold('Official Plugins'));
      console.log('');

      for (const plugin of officialMatches) {
        const installed = isInstalled(plugin.name);
        const status = installed ? c.green(' [installed]') : '';

        console.log(`  ${c.cyan(plugin.name.padEnd(15))} ${plugin.description}${status}`);
      }

      console.log('');
    }

    // Show community matches
    if (communityResults.length > 0) {
      console.log(c.bold('Community Plugins (npm)'));
      console.log('');

      for (const pkg of communityResults.slice(0, 10)) {
        // Extract plugin name from package name
        let displayName = pkg.name;
        if (displayName.startsWith('@uni/plugin-')) {
          displayName = displayName.replace('@uni/plugin-', '');
        } else if (displayName.startsWith('uni-plugin-')) {
          displayName = displayName.replace('uni-plugin-', '');
        }

        console.log(`  ${c.cyan(displayName.padEnd(15))} ${pkg.description.substring(0, 50)}`);
        console.log(`  ${c.dim(pkg.name)}`);
        console.log('');
      }
    }

    console.log(`Use ${c.cyan("'uni plugins install <name>'")} to install`);
  },
};
