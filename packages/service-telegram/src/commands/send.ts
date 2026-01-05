/**
 * uni telegram send - Send a message
 */

import * as fs from 'fs';
import * as path from 'path';
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
      description: 'Message text (or caption when sending file)',
      required: false,
    },
  ],
  options: [
    {
      name: 'file',
      short: 'f',
      type: 'string',
      description: 'File path to send (image, video, document)',
    },
    {
      name: 'reply',
      short: 'r',
      type: 'string',
      description: 'Message ID to reply to',
    },
  ],
  examples: [
    'uni telegram send @username "Hello!"',
    'uni telegram send +1234567890 "Hi there"',
    'uni telegram send "Family Group" "Dinner at 7?"',
    'uni telegram send me --file photo.jpg',
    'uni telegram send me "Check this out" -f ./screenshot.png',
    'uni telegram send me "Reply text" --reply 12345',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    const chat = args.chat as string;
    const message = args.message as string | undefined;
    const filePath = flags.file as string | undefined;
    const replyTo = flags.reply ? parseInt(flags.reply as string, 10) : undefined;

    // Must have either message or file
    if (!message && !filePath) {
      output.error('Must provide either a message or --file');
      return;
    }

    // Validate file exists
    if (filePath) {
      const resolvedPath = path.resolve(filePath);
      if (!fs.existsSync(resolvedPath)) {
        output.error(`File not found: ${filePath}`);
        return;
      }
    }

    if (!isAuthenticated()) {
      output.error('Not authenticated. Run `uni telegram auth` first.');
      return;
    }

    const spinnerText = filePath ? `Sending file to ${chat}...` : `Sending message to ${chat}...`;
    const spinner = output.spinner(spinnerText);

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

      let result;
      let fileName: string | undefined;

      if (filePath) {
        // Send file with optional caption
        const resolvedPath = path.resolve(filePath);
        fileName = path.basename(resolvedPath);
        result = await client.sendFile(entity, {
          file: resolvedPath,
          caption: message,
          replyTo,
        });
      } else {
        // Send text message
        result = await client.sendMessage(entity, { message: message!, replyTo });
      }

      await client.disconnect();

      const successMsg = filePath ? 'File sent' : 'Message sent';
      spinner.success(successMsg);

      if (globalFlags.json) {
        output.json({
          success: true,
          messageId: result.id,
          chat,
          text: message,
          file: fileName,
        });
        return;
      }

      console.log('');
      if (filePath) {
        console.log(c.green('✓ File sent successfully'));
        console.log(c.dim(`  File: ${fileName}`));
        if (message) {
          console.log(c.dim(`  Caption: ${message}`));
        }
      } else {
        console.log(c.green('✓ Message sent successfully'));
      }
      console.log(c.dim(`  Message ID: ${result.id}`));
      console.log('');

      // gramjs upload workers don't clean up properly, force exit after file send
      if (filePath) {
        setTimeout(() => process.exit(0), 100);
      }
    } catch (error) {
      spinner.fail('Failed to send');
      throw error;
    }
  },
};
