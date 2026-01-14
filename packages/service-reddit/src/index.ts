/**
 * Reddit Service - subreddit posts and search
 */

import type { UniService } from '@uni/shared';
import { hotCommand } from './commands/hot';
import { newCommand } from './commands/new';
import { topCommand } from './commands/top';
import { searchCommand } from './commands/search';
import { postCommand } from './commands/post';
import { userCommand } from './commands/user';
import { subredditCommand } from './commands/subreddit';
import { commentsCommand } from './commands/comments';
import { risingCommand } from './commands/rising';

const redditService: UniService = {
  name: 'reddit',
  description: 'Reddit posts and search (free)',
  version: '0.1.0',

  commands: [
    hotCommand,
    newCommand,
    topCommand,
    searchCommand,
    postCommand,
    userCommand,
    subredditCommand,
    commentsCommand,
    risingCommand,
  ],

  // No auth needed - using JSON API
};

export default redditService;
