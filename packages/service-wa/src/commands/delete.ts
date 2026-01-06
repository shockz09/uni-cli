/**
 * uni wa delete - Delete a message (runs via Node.js)
 */

import type { Command, CommandContext } from '@uni/shared';
import { spawn } from 'child_process';
import * as path from 'path';
import * as os from 'os';

export const deleteCommand: Command = {
  name: 'delete',
  description: 'Delete a message',
  args: [
    { name: 'chat', description: 'Chat (phone number or "me")', required: true },
    { name: 'messageId', description: 'Message ID to delete', required: true },
  ],
  examples: [
    'uni wa delete me ABC123',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args } = ctx;
    const script = path.join(os.homedir(), 'projects', 'uni-cli', 'packages', 'service-wa', 'wa-node.mjs');

    const child = spawn('node', [script, 'delete', args.chat as string, args.messageId as string], { stdio: 'inherit' });
    await new Promise<void>(r => child.on('close', r));
  },
};
