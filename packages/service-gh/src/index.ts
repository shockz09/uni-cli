/**
 * GitHub Service - PR, issue, and repository management
 *
 * Commands:
 *   pr     - Manage pull requests
 *   issue  - Manage issues
 *   repo   - Manage repositories
 *
 * Wraps the gh CLI for authentication and API access.
 */

import type { UniService } from '@uni/shared';
import { c } from '@uni/shared';
import { prCommand } from './commands/pr';
import { issueCommand } from './commands/issue';
import { repoCommand } from './commands/repo';
import { gh } from './gh-wrapper';

const ghService: UniService = {
  name: 'gh',
  description: 'GitHub management - PRs, issues, and repositories',
  version: '0.1.0',

  commands: [prCommand, issueCommand, repoCommand],

  auth: {
    type: 'oauth',
    flow: 'browser',
  },

  async setup() {
    const available = await gh.isAvailable();
    if (!available) {
      console.error(c.yellow('Warning: gh CLI not authenticated. Run "gh auth login" first.'));
    }
  },
};

export default ghService;
