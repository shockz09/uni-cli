/**
 * uni wa edit - Edit a sent message (runs via Node.js)
 */

import type { Command, CommandContext } from '@uni/shared';
import { spawn } from 'child_process';
import * as path from 'path';
import * as os from 'os';

export const editCommand: Command = {
  name: 'edit',
  description: 'Edit a sent message',
  args: [
    { name: 'chat', description: 'Chat (phone number or "me")', required: true },
    { name: 'messageId', description: 'Message ID to edit', required: true },
    { name: 'newText', description: 'New message text', required: true },
  ],
  examples: [
    'uni wa edit me ABC123 "Fixed typo"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args } = ctx;
    const script = path.join(os.homedir(), 'projects', 'uni-cli', 'packages', 'service-wa', 'wa-node.mjs');

    const child = spawn('node', [script, 'edit', args.chat as string, args.messageId as string, args.newText as string], { stdio: 'inherit' });
    await new Promise<void>(r => child.on('close', r));
  },
};
