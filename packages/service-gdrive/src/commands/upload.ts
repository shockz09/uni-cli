/**
 * uni gdrive upload - Upload a file to Google Drive
 */

import * as fs from 'node:fs';
import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gdrive } from '../api';

export const uploadCommand: Command = {
  name: 'upload',
  description: 'Upload a file to Google Drive',
  aliases: ['up', 'put'],
  args: [
    {
      name: 'file',
      description: 'Local file path to upload',
      required: true,
    },
  ],
  options: [
    {
      name: 'name',
      short: 'n',
      type: 'string',
      description: 'Name in Drive (defaults to filename)',
    },
    {
      name: 'folder',
      short: 'f',
      type: 'string',
      description: 'Destination folder ID',
    },
  ],
  examples: [
    'uni gdrive upload ./report.pdf',
    'uni gdrive upload ./photo.jpg --name "Vacation Photo"',
    'uni gdrive upload ./data.csv --folder 1abc123',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, flags, output, globalFlags } = ctx;

    if (!gdrive.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdrive auth" first.');
      return;
    }

    const filePath = args.file as string;

    if (!fs.existsSync(filePath)) {
      output.error(`File not found: ${filePath}`);
      return;
    }

    const spinner = output.spinner('Uploading...');

    try {
      const file = await gdrive.uploadFile(filePath, {
        name: flags.name as string | undefined,
        folderId: flags.folder as string | undefined,
      });

      spinner.success('Uploaded');

      if (globalFlags.json) {
        output.json(file);
        return;
      }

      console.log('');
      console.log(`${gdrive.getMimeIcon(file.mimeType)} ${c.bold(file.name)}`);
      if (file.webViewLink) {
        console.log(`   ${c.dim(file.webViewLink)}`);
      }
      console.log('');
    } catch (error) {
      spinner.fail('Upload failed');
      throw error;
    }
  },
};
