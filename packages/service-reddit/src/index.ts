/**
 * Reddit Service - subreddit posts and search
 */

import type { UniService } from '@uni/shared';
import { hotCommand } from './commands/hot';
import { newCommand } from './commands/new';
import { topCommand } from './commands/top';
import { searchCommand } from './commands/search';
import { postCommand } from './commands/post';

const redditService: UniService = {
  name: 'reddit',
  description: 'Reddit posts and search (free)',
  version: '0.1.0',

  commands: [hotCommand, newCommand, topCommand, searchCommand, postCommand],

  // No auth needed - using JSON API
};

export default redditService;
