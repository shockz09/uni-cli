/**
 * Linear Service - Issues, projects, and teams
 *
 * Commands:
 *   auth      - Authenticate with Linear (OAuth)
 *   issues    - List, create, update, close, search issues
 *   projects  - List projects
 *   teams     - List teams
 *   comments  - List and add comments
 *
 * Run `uni linear auth` to authenticate.
 */

import type { UniService } from '@uni/shared';
import { c } from '@uni/shared';
import { authCommand } from './commands/auth';
import { issuesCommand } from './commands/issues';
import { projectsCommand } from './commands/projects';
import { teamsCommand } from './commands/teams';
import { commentsCommand } from './commands/comments';
import { cyclesCommand } from './commands/cycles';
import { labelsCommand } from './commands/labels';
import { attachmentsCommand } from './commands/attachments';
import { linearOAuth } from './api';

const linearService: UniService = {
  name: 'linear',
  description: 'Linear - issues, projects, and teams',
  version: '0.1.0',

  commands: [
    authCommand,
    issuesCommand,
    projectsCommand,
    teamsCommand,
    commentsCommand,
    cyclesCommand,
    labelsCommand,
    attachmentsCommand,
  ],

  auth: {
    type: 'oauth',
    flow: 'browser',
  },

  async setup() {
    // Auth check done in each command handler
  },
};

export default linearService;
