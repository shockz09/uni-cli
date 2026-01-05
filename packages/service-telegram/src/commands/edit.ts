/**
 * uni telegram edit - Edit a message
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { createClient, isAuthenticated } from '../client';

export const editCommand: Command = {
  name: 'edit',
  description: 'Edit a sent message',
  args: [
    {
      name: 'chat',
      description: 'Chat identifier (@username, phone, ID, or title)',
      required: true,
    },
    {
      name: 'messageId',
      description: 'Message ID to edit',
      required: true,
    },
    {
      name: 'text',
      description: 'New message text',
      required: true,
    },
  ],
  examples: [
    'uni telegram edit me 12345 "Fixed typo"',
    'uni telegram edit @username 67890 "Updated message"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;
    const chat = args.chat as string;
    const messageId = parseInt(args.messageId as string, 10);
    const text = args.text as string;

    if (isNaN(messageId)) {
      output.error('Invalid message ID');
      return;
    }

    if (!isAuthenticated()) {
      output.error('Not authenticated. Run `uni telegram auth` first.');
      return;
    }

    const spinner = output.spinner('Editing message...');

    try {
      const client = await createClient();
      if (!client) {
        spinner.fail('Failed to connect');
        return;
      }

      // Get entity
      let entity;
      try {
        entity = await client.getEntity(chat);
      } catch {
        const dialogs = await client.getDialogs({ limit: 100 });
        const found = dialogs.find(
          (d) =>
            d.title?.toLowerCase() === chat.toLowerCase() ||
            d.name?.toLowerCase() === chat.toLowerCase()
        );
        if (found) {
          entity = found.entity;
        } else {
          await client.disconnect();
          spinner.fail('Chat not found');
          output.error(`Could not find chat: ${chat}`);
          return;
        }
      }

      await client.editMessage(entity, { message: messageId, text });
      await client.disconnect();

      spinner.success('Message edited');

      if (globalFlags.json) {
        output.json({ success: true, messageId, newText: text });
        return;
      }

      console.log('');
      console.log(c.green('✓ Message edited successfully'));
      console.log(c.dim(`  Message ID: ${messageId}`));
      console.log('');
    } catch (error) {
      spinner.fail('Failed to edit message');
      throw error;
    }
  },
};
