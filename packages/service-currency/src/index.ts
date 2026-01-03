/**
 * Currency Service - free currency conversion via Frankfurter
 */

import type { UniService } from '@uni/shared';
import { currencyCommand } from './commands/currency';

const currencyService: UniService = {
  name: 'currency',
  description: 'Currency converter (ECB rates)',
  version: '0.1.0',

  commands: [currencyCommand],

  // No auth needed - Frankfurter is free
};

export default currencyService;
