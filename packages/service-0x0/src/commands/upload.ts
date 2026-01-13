/**
 * uni 0x0 upload - Upload a file
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { uploadFile } from '../api';

export const uploadCommand: Command = {
  name: 'upload',
  description: 'Upload a file to 0x0.st',
  aliases: ['up', 'share'],
  args: [
    { name: 'file', description: 'File path to upload', required: true },
  ],
  examples: [
    'uni 0x0 upload ./image.png',
    'uni 0x0 share ./document.pdf',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    const filePath = args.file as string;

    const spinner = output.spinner('Uploading to 0x0.st...');
    try {
      const result = await uploadFile(filePath);

      // Set pipe output
      output.pipe(result.url);

      spinner.success('Uploaded');

      if (globalFlags.json) {
        output.json(result);
        return;
      }

      if (!output.isPiped()) {
        console.log('');
        console.log(`${c.cyan('URL:')} ${result.url}`);
        console.log(c.dim('Expiration based on file size (smaller = longer)'));
        console.log('');
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      spinner.fail(msg);
    }
  },
};
