/**
 * Exa Service - Web search, code context, and research
 *
 * Commands:
 *   search   - Search the web
 *   code     - Get code/documentation context
 *   research - Deep research on a topic
 *   company  - Research a company
 *   linkedin - Search LinkedIn profiles
 */

import type { UniService } from '@uni/shared';
import { searchCommand } from './commands/search';
import { codeCommand } from './commands/code';
import { researchCommand } from './commands/research';
import { companyCommand } from './commands/company';
import { similarCommand } from './commands/similar';
import { crawlCommand } from './commands/crawl';
import { newsCommand } from './commands/news';
import { linkedinCommand } from './commands/linkedin';

const exaService: UniService = {
  name: 'exa',
  description: 'Web search, code context, and research powered by Exa AI',
  version: '0.1.0',

  commands: [
    searchCommand,
    codeCommand,
    researchCommand,
    companyCommand,
    linkedinCommand,
    similarCommand,
    crawlCommand,
    newsCommand,
  ],

  auth: {
    type: 'apikey',
    envVar: 'EXA_API_KEY',
    flow: 'manual',
  },

  async setup() {
    // Exa has a free tier - API key is optional but recommended for higher limits
  },
};

export default exaService;
