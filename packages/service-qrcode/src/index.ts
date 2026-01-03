/**
 * QR Code Service - generate QR codes from text/URLs
 */

import type { UniService } from '@uni/shared';
import { qrcodeCommand } from './commands/qrcode';

const qrcodeService: UniService = {
  name: 'qrcode',
  description: 'QR code generator',
  version: '0.1.0',

  commands: [qrcodeCommand],

  // No auth needed - local generation
};

export default qrcodeService;
