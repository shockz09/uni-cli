/**
 * Wikipedia Service - article lookup and search
 */

import type { UniService } from '@uni/shared';
import { summaryCommand } from './commands/summary';
import { searchCommand } from './commands/search';
import { randomCommand } from './commands/random';
import { fullCommand } from './commands/full';
import { relatedCommand } from './commands/related';
import { languagesCommand } from './commands/languages';

const wikiService: UniService = {
  name: 'wiki',
  description: 'Wikipedia articles and search (free)',
  version: '0.1.0',

  commands: [summaryCommand, searchCommand, randomCommand, fullCommand, relatedCommand, languagesCommand],

  // No auth needed - Wikipedia API is free
};

export default wikiService;
