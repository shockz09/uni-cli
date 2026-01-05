/**
 * uni telegram forward - Forward a message
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { createClient, isAuthenticated } from '../client';

export const forwardCommand: Command = {
  name: 'forward',
  description: 'Forward a message to another chat',
  args: [
    {
      name: 'from',
      description: 'Source chat identifier',
      required: true,
    },
    {
      name: 'messageId',
      description: 'Message ID to forward',
      required: true,
    },
    {
      name: 'to',
      description: 'Destination chat identifier',
      required: true,
    },
  ],
  examples: [
    'uni telegram forward @source 12345 @dest',
    'uni telegram forward "Work Group" 67890 me',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;
    const from = args.from as string;
    const messageId = parseInt(args.messageId as string, 10);
    const to = args.to as string;

    if (isNaN(messageId)) {
      output.error('Invalid message ID');
      return;
    }

    if (!isAuthenticated()) {
      output.error('Not authenticated. Run `uni telegram auth` first.');
      return;
    }

    const spinner = output.spinner(`Forwarding message to ${to}...`);

    try {
      const client = await createClient();
      if (!client) {
        spinner.fail('Failed to connect');
        return;
      }

      // Helper to get entity
      const getEntity = async (chat: string) => {
        try {
          return await client.getEntity(chat);
        } catch {
          const dialogs = await client.getDialogs({ limit: 100 });
          const found = dialogs.find(
            (d) =>
              d.title?.toLowerCase() === chat.toLowerCase() ||
              d.name?.toLowerCase() === chat.toLowerCase()
          );
          return found?.entity;
        }
      };

      const fromEntity = await getEntity(from);
      if (!fromEntity) {
        await client.disconnect();
        spinner.fail('Source chat not found');
        output.error(`Could not find chat: ${from}`);
        return;
      }

      const toEntity = await getEntity(to);
      if (!toEntity) {
        await client.disconnect();
        spinner.fail('Destination chat not found');
        output.error(`Could not find chat: ${to}`);
        return;
      }

      const result = await client.forwardMessages(toEntity, {
        messages: [messageId],
        fromPeer: fromEntity,
      });

      await client.disconnect();

      const newMsgId = Array.isArray(result) ? result[0]?.id : result?.id;
      spinner.success('Message forwarded');

      if (globalFlags.json) {
        output.json({ success: true, from, to, originalId: messageId, newId: newMsgId });
        return;
      }

      console.log('');
      console.log(c.green('✓ Message forwarded successfully'));
      console.log(c.dim(`  From: ${from} (ID: ${messageId})`));
      console.log(c.dim(`  To: ${to}${newMsgId ? ` (ID: ${newMsgId})` : ''}`));
      console.log('');
    } catch (error) {
      spinner.fail('Failed to forward message');
      throw error;
    }
  },
};
