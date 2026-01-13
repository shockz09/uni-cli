/**
 * 0x0.st Service - The null pointer
 *
 * Commands:
 *   upload - Upload a file
 *   paste - Paste text content
 *
 * No auth required!
 * Docs: https://0x0.st/
 */

import type { UniService } from '@uni/shared';

import { uploadCommand } from './commands/upload';
import { pasteCommand } from './commands/paste';

const zeroService: UniService = {
  name: '0x0',
  description: '0x0.st - The null pointer',
  version: '0.1.0',

  commands: [uploadCommand, pasteCommand],

  auth: {
    type: 'none',
    flow: 'none',
  },
};

export default zeroService;
