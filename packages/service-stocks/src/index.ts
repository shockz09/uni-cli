/**
 * Stocks Service
 *
 * Real-time stock/crypto prices via Yahoo Finance.
 * No API key required.
 */

import type { UniService } from '@uni/shared';
import { quoteCommand } from './commands/quote';
import { infoCommand } from './commands/info';
import { historyCommand } from './commands/history';
import { listCommand } from './commands/list';
import { searchCommand } from './commands/search';
import { compareCommand } from './commands/compare';

const stocksService: UniService = {
  name: 'stocks',
  description: 'Real-time stock & crypto prices (Yahoo Finance)',
  version: '0.1.0',
  commands: [quoteCommand, infoCommand, historyCommand, listCommand, searchCommand, compareCommand],
};

export default stocksService;
