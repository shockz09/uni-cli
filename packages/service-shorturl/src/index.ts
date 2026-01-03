/**
 * Short URL Service - shorten URLs via is.gd
 */

import type { UniService } from '@uni/shared';
import { shorturlCommand } from './commands/shorturl';

const shorturlService: UniService = {
  name: 'shorturl',
  description: 'URL shortener (is.gd)',
  version: '0.1.0',

  commands: [shorturlCommand],

  // No auth needed - is.gd is free
};

export default shorturlService;
