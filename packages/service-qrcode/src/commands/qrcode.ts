/**
 * uni qrcode - Generate QR codes
 */

import type { Command, CommandContext } from '@uni/shared';
import { toTerminal, toFile, toDataURL, wifiContent } from '../api';
import { existsSync } from 'fs';
import { resolve } from 'path';

export const qrcodeCommand: Command = {
  name: '',  // Default command - runs when no subcommand given
  description: 'Generate QR codes',
  args: [
    {
      name: 'content',
      description: 'Text, URL, or data to encode',
      required: false,
    },
  ],
  options: [
    {
      name: 'output',
      short: 'o',
      type: 'string',
      description: 'Output file path (PNG)',
    },
    {
      name: 'size',
      short: 's',
      type: 'number',
      description: 'QR code size in pixels (default: 256)',
      default: 256,
    },
    {
      name: 'foreground',
      type: 'string',
      description: 'Foreground color (hex, default: #000000)',
      default: '#000000',
    },
    {
      name: 'background',
      type: 'string',
      description: 'Background color (hex, default: #ffffff)',
      default: '#ffffff',
    },
    {
      name: 'terminal',
      short: 't',
      type: 'boolean',
      description: 'Display in terminal (ASCII art)',
    },
    {
      name: 'wifi',
      short: 'w',
      type: 'string',
      description: 'Generate WiFi QR: "SSID:password"',
    },
  ],
  examples: [
    'uni qrcode "https://example.com"',
    'uni qrcode "Hello World" --terminal',
    'uni qrcode "https://example.com" --output qr.png',
    'uni qrcode "https://example.com" --size 512',
    'uni qrcode --wifi "MyNetwork:password123"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    let content = args.content as string | undefined;

    // Handle WiFi QR code
    if (flags.wifi) {
      const wifiStr = flags.wifi as string;
      const parts = wifiStr.split(':');
      if (parts.length < 2) {
        output.error('WiFi format: "SSID:password"');
        return;
      }
      const ssid = parts[0];
      const password = parts.slice(1).join(':'); // Handle passwords with colons
      content = wifiContent(ssid, password);
    }

    if (!content) {
      output.error('Content required. Example: uni qrcode "https://example.com"');
      return;
    }

    const size = flags.size as number || 256;
    const foreground = flags.foreground as string || '#000000';
    const background = flags.background as string || '#ffffff';
    const outputPath = flags.output as string | undefined;
    const showTerminal = flags.terminal as boolean;

    try {
      // Terminal output
      if (showTerminal || (!outputPath && !globalFlags.json)) {
        const terminalQR = await toTerminal(content);
        console.log('');
        console.log(terminalQR);

        if (!outputPath) {
          return;
        }
      }

      // File output
      if (outputPath) {
        const fullPath = resolve(outputPath);
        await toFile(content, fullPath, { size, foreground, background });

        if (globalFlags.json) {
          output.json({
            content,
            file: fullPath,
            size,
            foreground,
            background,
          });
          return;
        }

        output.success(`Generated: ${outputPath} (${size}x${size})`);
        return;
      }

      // JSON output (data URL)
      if (globalFlags.json) {
        const dataUrl = await toDataURL(content, { size, foreground, background });
        output.json({
          content,
          size,
          foreground,
          background,
          dataUrl,
        });
        return;
      }
    } catch (error) {
      output.error('Failed to generate QR code');
      throw error;
    }
  },
};
