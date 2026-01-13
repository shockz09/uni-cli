/**
 * uni 0x0 paste - Paste text content
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { uploadText } from '../api';

export const pasteCommand: Command = {
  name: 'paste',
  description: 'Paste text content to 0x0.st',
  args: [
    { name: 'text', description: 'Text to paste', required: true },
  ],
  options: [
    { name: 'name', short: 'n', type: 'string', description: 'Filename (default: paste.txt)' },
  ],
  examples: [
    'uni 0x0 paste "Hello world"',
    'uni 0x0 paste "console.log(1)" -n code.js',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    const text = args.text as string;

    const spinner = output.spinner('Uploading...');
    try {
      const result = await uploadText(text, flags.name as string | undefined);

      // Set pipe output - will auto-suppress other output when piped
      output.pipe(result.url);

      spinner.success('Pasted');

      if (globalFlags.json) {
        output.json(result);
        return;
      }

      if (!output.isPiped()) {
        console.log('');
        console.log(`${c.cyan('URL:')} ${result.url}`);
        console.log('');
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      spinner.fail(msg);
    }
  },
};
