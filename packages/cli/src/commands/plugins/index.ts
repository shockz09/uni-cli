/**
 * Plugins Service - Plugin management for uni-cli
 */

import type { UniService } from '@uni/shared';
import { listCommand } from './list.js';
import { installCommand } from './install.js';
import { uninstallCommand } from './uninstall.js';
import { availableCommand } from './available.js';
import { searchCommand } from './search.js';
import { updateCommand } from './update.js';
import { linkCommand } from './link.js';

const pluginsService: UniService = {
  name: 'plugins',
  description: 'Plugin management',
  version: '1.0.0',
  commands: [
    listCommand,
    installCommand,
    uninstallCommand,
    availableCommand,
    searchCommand,
    updateCommand,
    linkCommand,
  ],
};

export default pluginsService;
