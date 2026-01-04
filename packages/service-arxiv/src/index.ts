/**
 * arXiv Service - academic paper search
 */

import type { UniService } from '@uni/shared';
import { searchCommand } from './commands/search';
import { paperCommand } from './commands/paper';
import { recentCommand } from './commands/recent';

const arxivService: UniService = {
  name: 'arxiv',
  description: 'arXiv paper search (free)',
  version: '0.1.0',

  commands: [searchCommand, paperCommand, recentCommand],

  // No auth needed - arXiv API is free
};

export default arxivService;
