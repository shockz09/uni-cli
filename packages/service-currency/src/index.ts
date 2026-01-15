/**
 * Currency Service - free currency conversion via Frankfurter
 */

import type { UniService } from '@uni/shared';
import { currencyCommand } from './commands/currency';
import { ratesCommand } from './commands/rates';
import { historyCommand } from './commands/history';

const currencyService: UniService = {
  name: 'currency',
  description: 'Currency converter (ECB rates)',
  version: '0.1.0',

  commands: [currencyCommand, ratesCommand, historyCommand],

  // No auth needed - Frankfurter is free
};

export default currencyService;
