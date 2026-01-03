/**
 * uni gdrive download - Download a file from Google Drive
 */

import * as path from 'node:path';
import type { Command, CommandContext } from '@uni/shared';
import { gdrive } from '../api';

export const downloadCommand: Command = {
  name: 'download',
  description: 'Download a file from Google Drive',
  aliases: ['down', 'get'],
  args: [
    {
      name: 'file',
      description: 'File ID or search query',
      required: true,
    },
  ],
  options: [
    {
      name: 'output',
      short: 'o',
      type: 'string',
      description: 'Output path (defaults to current dir)',
    },
  ],
  examples: [
    'uni gdrive download 1abc123def',
    'uni gdrive download "report.pdf"',
    'uni gdrive download 1abc123 --output ./downloads/',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, flags, output, globalFlags } = ctx;

    if (!gdrive.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdrive auth" first.');
      return;
    }

    const fileQuery = args.file as string;
    let fileId: string;
    let fileName: string;

    // Check if it's an ID or search query
    if (fileQuery.length > 20 && !fileQuery.includes(' ')) {
      fileId = fileQuery;
      const file = await gdrive.getFile(fileId);
      fileName = file.name;
    } else {
      const results = await gdrive.search(fileQuery, 1);
      if (!results.length) {
        output.error(`No file found matching "${fileQuery}"`);
        return;
      }
      fileId = results[0].id;
      fileName = results[0].name;
    }

    const outputPath = flags.output
      ? path.join(flags.output as string, fileName)
      : fileName;

    const spinner = output.spinner(`Downloading ${fileName}...`);

    try {
      await gdrive.downloadFile(fileId, outputPath);
      spinner.success(`Downloaded: ${outputPath}`);

      if (globalFlags.json) {
        output.json({ id: fileId, name: fileName, path: outputPath });
      }
    } catch (error) {
      spinner.fail('Download failed');
      throw error;
    }
  },
};
