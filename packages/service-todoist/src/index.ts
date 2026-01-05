/**
 * Todoist Service - Tasks, projects, labels, and comments
 *
 * Commands:
 *   tasks     - List, add, complete, update, delete tasks
 *   projects  - List, create, delete projects
 *   labels    - List, create, delete labels
 *   comments  - List and add comments
 *
 * Requires: TODOIST_TOKEN environment variable
 * Get your token from: https://todoist.com/app/settings/integrations/developer
 */

import type { UniService } from '@uni/shared';
import { c } from '@uni/shared';
import { tasksCommand } from './commands/tasks';
import { projectsCommand } from './commands/projects';
import { labelsCommand } from './commands/labels';
import { commentsCommand } from './commands/comments';
import { todoist } from './api';

const todoistService: UniService = {
  name: 'todoist',
  description: 'Todoist - tasks, projects, labels, and comments',
  version: '0.1.0',

  commands: [tasksCommand, projectsCommand, labelsCommand, commentsCommand],

  auth: {
    type: 'token',
    envVar: 'TODOIST_TOKEN',
    flow: 'manual',
  },

  async setup() {
    if (!todoist.hasToken()) {
      console.error(c.yellow('Warning: TODOIST_TOKEN not set.'));
      console.error(c.dim('Get your token from https://todoist.com/app/settings/integrations/developer'));
    }
  },
};

export default todoistService;
