/**
 * uni wa download - Download media (placeholder)
 */

import type { Command, CommandContext } from '@uni/shared';

export const downloadCommand: Command = {
  name: 'download',
  description: 'Download media from a message',
  args: [
    { name: 'chat', description: 'Chat (phone number or "me")', required: true },
    { name: 'messageId', description: 'Message ID with media', required: true },
  ],
  options: [
    { name: 'output', short: 'o', type: 'string', description: 'Output file path' },
  ],
  examples: [
    'uni wa download me ABC123',
    'uni wa download 919876543210 XYZ789 -o ~/Downloads/photo.jpg',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    console.log('Download not yet implemented');
  },
};
