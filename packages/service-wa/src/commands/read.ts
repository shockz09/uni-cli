/**
 * uni wa read - Read messages from a chat
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { createClient, isAuthenticated, parseChat, formatJid, getMessageText } from '../client';

export const readCommand: Command = {
  name: 'read',
  description: 'Read messages from a chat',
  args: [
    {
      name: 'chat',
      description: 'Chat (phone number, group ID, or "me")',
      required: true,
    },
  ],
  options: [
    {
      name: 'limit',
      short: 'n',
      type: 'number',
      description: 'Number of messages (default: 10)',
      default: 10,
    },
  ],
  examples: [
    'uni wa read me',
    'uni wa read 919876543210',
    'uni wa read me -n 20',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    const chatInput = args.chat as string;
    const limit = (flags.limit as number) || 10;

    if (!isAuthenticated()) {
      output.error('Not authenticated. Run "uni wa auth" first.');
      return;
    }

    const spinner = output.spinner('Loading messages...');

    try {
      const sock = await createClient();
      if (!sock) {
        spinner.fail('Failed to connect');
        return;
      }

      // Resolve "me" to own JID
      let jid = parseChat(chatInput);
      if (jid === 'me') {
        const user = sock.user;
        if (user?.id) {
          jid = user.id.replace(/:.*@/, '@');
        } else {
          spinner.fail('Could not determine your number');
          await sock.end();
          return;
        }
      }

      // Wait for message history to sync
      const allMessages: any[] = [];
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 10000);

        sock.ev.on('messaging-history.set', ({ messages }) => {
          allMessages.push(...messages);
        });

        // Give some time for messages to sync
        setTimeout(() => {
          clearTimeout(timeout);
          resolve();
        }, 3000);
      });

      await sock.end();

      // Filter messages for this chat
      const messages = allMessages
        .filter((msg: any) => {
          const msgJid = msg.key?.remoteJid || '';
          return msgJid === jid || msgJid.includes(jid.replace('@s.whatsapp.net', ''));
        })
        .slice(0, limit);

      if (!messages || messages.length === 0) {
        spinner.success('No messages found');
        return;
      }

      spinner.success(`Found ${messages.length} message(s)`);

      if (globalFlags.json) {
        output.json(messages.map((msg: any) => ({
          id: msg.key?.id,
          fromMe: msg.key?.fromMe,
          timestamp: msg.messageTimestamp
            ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
            : null,
          text: getMessageText(msg),
          sender: msg.key?.participant || msg.key?.remoteJid,
        })));
        return;
      }

      console.log('');
      for (const msg of messages.reverse()) {
        const fromMe = msg.key?.fromMe;
        const timestamp = msg.messageTimestamp
          ? new Date(Number(msg.messageTimestamp) * 1000).toLocaleString()
          : '';
        const text = getMessageText(msg) || '[Unknown message type]';
        const id = msg.key?.id || '';

        const sender = fromMe
          ? c.cyan('You')
          : c.green(formatJid(msg.key?.participant || msg.key?.remoteJid || ''));

        console.log(`${sender}  ${c.dim(timestamp)}`);
        console.log(`  ${text}`);
        console.log(`  ${c.dim(`ID: ${id}`)}`);
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to load messages');
      throw error;
    }
  },
};
