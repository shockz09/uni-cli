/**
 * Linear Service - Issues, projects, and teams
 *
 * Commands:
 *   issues    - List, create, update, close, search issues
 *   projects  - List projects
 *   teams     - List teams
 *   comments  - List and add comments
 *
 * Requires: LINEAR_API_KEY environment variable
 * Get your key from: https://linear.app/settings/api
 */

import type { UniService } from '@uni/shared';
import { c } from '@uni/shared';
import { issuesCommand } from './commands/issues';
import { projectsCommand } from './commands/projects';
import { teamsCommand } from './commands/teams';
import { commentsCommand } from './commands/comments';
import { linear } from './api';

const linearService: UniService = {
  name: 'linear',
  description: 'Linear - issues, projects, and teams',
  version: '0.1.0',

  commands: [issuesCommand, projectsCommand, teamsCommand, commentsCommand],

  auth: {
    type: 'token',
    envVar: 'LINEAR_API_KEY',
    flow: 'manual',
  },

  async setup() {
    if (!linear.hasToken()) {
      console.error(c.yellow('Warning: LINEAR_API_KEY not set.'));
      console.error(c.dim('Get your key from https://linear.app/settings/api'));
    }
  },
};

export default linearService;
