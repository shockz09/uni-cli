/**
 * uni telegram download - Download media from a message
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { createClient, isAuthenticated } from '../client';
import * as fs from 'fs';
import * as path from 'path';

export const downloadCommand: Command = {
  name: 'download',
  description: 'Download media from a message',
  args: [
    {
      name: 'chat',
      description: 'Chat identifier',
      required: true,
    },
    {
      name: 'message_id',
      description: 'Message ID containing media',
      required: true,
    },
  ],
  options: [
    {
      name: 'output',
      short: 'o',
      type: 'string',
      description: 'Output directory (default: current dir)',
      default: '.',
    },
  ],
  examples: [
    'uni telegram download @username 12345',
    'uni telegram download "Family Group" 67890 -o ./downloads',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    const chat = args.chat as string;
    const messageId = parseInt(args.message_id as string, 10);
    const outputDir = (flags.output as string) || '.';

    if (isNaN(messageId)) {
      output.error('Invalid message ID');
      return;
    }

    if (!isAuthenticated()) {
      output.error('Not authenticated. Run `uni telegram auth` first.');
      return;
    }

    const spinner = output.spinner(`Downloading media from message ${messageId}...`);

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

      // Get the specific message
      const messages = await client.getMessages(entity, { ids: [messageId] });

      if (!messages || messages.length === 0 || !messages[0]) {
        await client.disconnect();
        spinner.fail('Message not found');
        return;
      }

      const message = messages[0];

      if (!message.media) {
        await client.disconnect();
        spinner.fail('No media in this message');
        return;
      }

      // Download media
      const buffer = await client.downloadMedia(message, {});

      await client.disconnect();

      if (!buffer || (Buffer.isBuffer(buffer) && buffer.length === 0)) {
        spinner.fail('Failed to download media');
        return;
      }

      // Determine filename
      let filename = `telegram_${messageId}`;
      const mediaDoc = message.media as { document?: { mimeType?: string; attributes?: Array<{ fileName?: string }> } };

      if (mediaDoc.document?.attributes) {
        for (const attr of mediaDoc.document.attributes) {
          if (attr.fileName) {
            filename = attr.fileName;
            break;
          }
        }
      }

      // Add extension based on mime type if no extension
      if (!path.extname(filename) && mediaDoc.document?.mimeType) {
        const ext = mediaDoc.document.mimeType.split('/')[1];
        if (ext) {
          filename += `.${ext}`;
        }
      }

      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputPath = path.join(outputDir, filename);
      fs.writeFileSync(outputPath, buffer as Buffer);

      spinner.success('Media downloaded');

      if (globalFlags.json) {
        output.json({
          success: true,
          path: outputPath,
          size: (buffer as Buffer).length,
        });
        return;
      }

      console.log('');
      console.log(c.green('✓ Downloaded successfully'));
      console.log(`  Path: ${outputPath}`);
      console.log(`  Size: ${formatBytes((buffer as Buffer).length)}`);
      console.log('');
    } catch (error) {
      spinner.fail('Download failed');
      throw error;
    }
  },
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
