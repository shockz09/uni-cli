/**
 * uni telegram send - Send a message
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { createClient, isAuthenticated } from '../client';

export const sendCommand: Command = {
  name: 'send',
  description: 'Send a message to a chat',
  args: [
    {
      name: 'chat',
      description: 'Chat identifier (@username, phone, ID, or title)',
      required: true,
    },
    {
      name: 'message',
      description: 'Message text to send',
      required: true,
    },
  ],
  examples: [
    'uni telegram send @username "Hello!"',
    'uni telegram send +1234567890 "Hi there"',
    'uni telegram send "Family Group" "Dinner at 7?"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;
    const chat = args.chat as string;
    const message = args.message as string;

    if (!isAuthenticated()) {
      output.error('Not authenticated. Run `uni telegram auth` first.');
      return;
    }

    const spinner = output.spinner(`Sending message to ${chat}...`);

    try {
      const client = await createClient();
      if (!client) {
        spinner.fail('Failed to connect');
        output.error('Could not connect to Telegram. Try `uni telegram auth` again.');
        return;
      }

      // Get entity
      let entity;
      try {
        entity = await client.getEntity(chat);
      } catch {
        // Try to find by title in dialogs
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

      const result = await client.sendMessage(entity, { message });

      await client.disconnect();

      spinner.success('Message sent');

      if (globalFlags.json) {
        output.json({
          success: true,
          messageId: result.id,
          chat,
          text: message,
        });
        return;
      }

      console.log('');
      console.log(c.green('✓ Message sent successfully'));
      console.log(c.dim(`  Message ID: ${result.id}`));
      console.log('');
    } catch (error) {
      spinner.fail('Failed to send message');
      throw error;
    }
  },
};
