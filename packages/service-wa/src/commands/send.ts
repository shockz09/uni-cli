/**
 * uni wa send - Send a message via daemon
 */

import type { Command, CommandContext } from '@uni/shared';
import { execDaemon } from '../daemon-client';

export const sendCommand: Command = {
  name: 'send',
  description: 'Send a message',
  args: [
    { name: 'chat', description: 'Chat (phone number or "me")', required: true },
    { name: 'message', description: 'Message text', required: false },
  ],
  options: [
    { name: 'file', short: 'f', type: 'string', description: 'Attach file' },
    { name: 'reply', short: 'r', type: 'string', description: 'Reply to message ID' },
  ],
  examples: [
    'uni wa send me "Hello!"',
    'uni wa send 919876543210 "Hi"',
    'uni wa send me -f photo.jpg "Check this"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, flags, output } = ctx;
    const chat = args.chat as string;
    const message = args.message as string || '';
    const file = flags.file as string | undefined;
    const replyId = flags.reply as string | undefined;

    if (!message && !file) {
      output.error('Provide a message or file');
      return;
    }

    const result = await execDaemon({
      action: 'send',
      chat,
      message,
      file,
      replyId,
    });

    if (result.error) {
      output.error(result.error);
      return;
    }

    output.success(`Sent! ID: ${result.id}`);
  },
};
