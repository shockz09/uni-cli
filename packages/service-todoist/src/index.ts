/**
 * Todoist Service - Tasks, projects, labels, and comments
 *
 * Commands:
 *   auth      - Authenticate with Todoist (OAuth)
 *   tasks     - List, add, complete, update, delete tasks
 *   projects  - List, create, delete projects
 *   labels    - List, create, delete labels
 *   comments  - List and add comments
 *
 * Run `uni todoist auth` to authenticate.
 */

import type { UniService } from '@uni/shared';
import { c } from '@uni/shared';
import { authCommand } from './commands/auth';
import { tasksCommand } from './commands/tasks';
import { projectsCommand } from './commands/projects';
import { labelsCommand } from './commands/labels';
import { commentsCommand } from './commands/comments';
import { todoistOAuth } from './api';

const todoistService: UniService = {
  name: 'todoist',
  description: 'Todoist - tasks, projects, labels, and comments',
  version: '0.1.0',

  commands: [authCommand, tasksCommand, projectsCommand, labelsCommand, commentsCommand],

  auth: {
    type: 'oauth',
    flow: 'browser',
  },

  async setup() {
    if (!todoistOAuth.isAuthenticated()) {
      console.error(c.yellow('Not authenticated.'));
      console.error(c.dim('Run "uni todoist auth" to authenticate.'));
    }
  },
};

export default todoistService;
