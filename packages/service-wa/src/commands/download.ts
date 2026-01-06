/**
 * uni wa download - Download media from a message
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { createClient, isAuthenticated, parseChat, hasMedia, getMediaType } from '../client';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import * as fs from 'fs';
import * as path from 'path';

export const downloadCommand: Command = {
  name: 'download',
  description: 'Download media from a message',
  args: [
    {
      name: 'chat',
      description: 'Chat (phone number, group ID, or "me")',
      required: true,
    },
    {
      name: 'messageId',
      description: 'Message ID with media',
      required: true,
    },
  ],
  options: [
    {
      name: 'output',
      short: 'o',
      type: 'string',
      description: 'Output file path (default: current directory)',
    },
  ],
  examples: [
    'uni wa download me ABC123',
    'uni wa download 919876543210 XYZ789 -o ~/Downloads/photo.jpg',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags } = ctx;
    const chatInput = args.chat as string;
    const messageId = args.messageId as string;
    const outputPath = flags.output as string | undefined;

    if (!isAuthenticated()) {
      output.error('Not authenticated. Run "uni wa auth" first.');
      return;
    }

    const spinner = output.spinner('Downloading...');

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

      // Wait for message history to find the message
      let message: any = null;
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 10000);

        sock.ev.on('messaging-history.set', ({ messages }) => {
          const found = messages.find((m: any) => m.key?.id === messageId);
          if (found) {
            message = found;
          }
        });

        setTimeout(() => {
          clearTimeout(timeout);
          resolve();
        }, 3000);
      });

      if (!message) {
        spinner.fail('Message not found');
        await sock.end();
        return;
      }

      if (!hasMedia(message)) {
        spinner.fail('Message has no media');
        await sock.end();
        return;
      }

      // Download media
      const buffer = await downloadMediaMessage(
        message,
        'buffer',
        {},
        {
          logger: undefined as any,
          reuploadRequest: sock.updateMediaMessage,
        }
      );

      // Determine file extension
      const mediaType = getMediaType(message);
      const content = message.message;
      let ext = '.bin';
      let fileName = `wa-${messageId}`;

      if (content?.imageMessage) {
        ext = '.jpg';
      } else if (content?.videoMessage) {
        ext = '.mp4';
      } else if (content?.audioMessage) {
        ext = content.audioMessage.ptt ? '.ogg' : '.mp3';
      } else if (content?.documentMessage) {
        fileName = content.documentMessage.fileName || fileName;
        ext = path.extname(fileName) || '.bin';
        fileName = path.basename(fileName, ext);
      } else if (content?.stickerMessage) {
        ext = '.webp';
      }

      // Write to file
      const finalPath = outputPath || `${fileName}${ext}`;
      const resolvedPath = path.resolve(finalPath);
      fs.writeFileSync(resolvedPath, buffer as Buffer);

      spinner.success(`Downloaded to ${resolvedPath}`);
      await sock.end();
    } catch (error) {
      spinner.fail('Download failed');
      throw error;
    }
  },
};
