/**
 * Hacker News Service - HN stories and search
 */

import type { UniService } from '@uni/shared';
import { topCommand } from './commands/top';
import { newCommand } from './commands/new';
import { bestCommand } from './commands/best';
import { askCommand } from './commands/ask';
import { showCommand } from './commands/show';
import { searchCommand } from './commands/search';
import { storyCommand } from './commands/story';

const hnService: UniService = {
  name: 'hn',
  description: 'Hacker News stories and search (free)',
  version: '0.1.0',

  commands: [topCommand, newCommand, bestCommand, askCommand, showCommand, searchCommand, storyCommand],

  // No auth needed - HN API is free
};

export default hnService;
