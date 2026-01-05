/**
 * uni telegram react - React to a message
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { createClient, isAuthenticated } from '../client';
import { Api } from 'telegram';

export const reactCommand: Command = {
  name: 'react',
  description: 'React to a message with an emoji',
  args: [
    {
      name: 'chat',
      description: 'Chat identifier (@username, phone, ID, or title)',
      required: true,
    },
    {
      name: 'messageId',
      description: 'Message ID to react to',
      required: true,
    },
    {
      name: 'emoji',
      description: 'Emoji reaction (e.g., 👍, ❤️, 🔥)',
      required: true,
    },
  ],
  options: [
    {
      name: 'big',
      short: 'b',
      type: 'boolean',
      description: 'Show bigger reaction animation',
      default: false,
    },
  ],
  examples: [
    'uni telegram react me 12345 "👍"',
    'uni telegram react @username 67890 "❤️"',
    'uni telegram react me 12345 "🔥" --big',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    const chat = args.chat as string;
    const messageId = parseInt(args.messageId as string, 10);
    const emoji = args.emoji as string;
    const big = flags.big as boolean;

    if (isNaN(messageId)) {
      output.error('Invalid message ID');
      return;
    }

    if (!isAuthenticated()) {
      output.error('Not authenticated. Run `uni telegram auth` first.');
      return;
    }

    const spinner = output.spinner('Sending reaction...');

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

      await client.invoke(
        new Api.messages.SendReaction({
          peer: entity,
          msgId: messageId,
          big,
          reaction: [new Api.ReactionEmoji({ emoticon: emoji })],
        })
      );

      await client.disconnect();

      spinner.success('Reaction sent');

      if (globalFlags.json) {
        output.json({ success: true, messageId, emoji, big });
        return;
      }

      console.log('');
      console.log(c.green(`✓ Reacted with ${emoji}`));
      console.log(c.dim(`  Message ID: ${messageId}`));
      console.log('');
    } catch (error) {
      spinner.fail('Failed to send reaction');
      throw error;
    }
  },
};
