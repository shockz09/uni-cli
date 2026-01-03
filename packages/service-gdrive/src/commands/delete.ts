/**
 * uni gdrive delete - Delete files from Drive
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gdrive } from '../api';

export const deleteCommand: Command = {
  name: 'delete',
  description: 'Delete files from Drive',
  aliases: ['rm', 'remove'],
  args: [
    {
      name: 'query',
      description: 'File name or search query',
      required: true,
    },
  ],
  options: [
    {
      name: 'id',
      type: 'string',
      description: 'Delete by file ID directly',
    },
    {
      name: 'force',
      short: 'f',
      type: 'boolean',
      description: 'Skip confirmation',
      default: false,
    },
  ],
  examples: [
    'uni gdrive delete "old document"',
    'uni gdrive delete --id 1abc123xyz',
    'uni gdrive delete "gk quiz" --force',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gdrive.hasCredentials()) {
      output.error('Google credentials not configured.');
      return;
    }

    if (!gdrive.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdrive auth" first.');
      return;
    }

    // Direct ID delete
    if (flags.id) {
      const spinner = output.spinner('Deleting file...');
      try {
        await gdrive.deleteFile(flags.id as string);
        spinner.success('File deleted');
        if (globalFlags.json) {
          output.json({ deleted: flags.id });
        }
      } catch (error) {
        spinner.fail('Failed to delete');
        throw error;
      }
      return;
    }

    // Search and delete
    const query = args.query as string;
    const spinner = output.spinner(`Searching for "${query}"...`);

    try {
      const files = await gdrive.search(query, 50);

      if (files.length === 0) {
        spinner.fail('No files found matching query');
        return;
      }

      spinner.success(`Found ${files.length} file(s)`);

      if (globalFlags.json) {
        output.json({ found: files.length, files: files.map(f => ({ id: f.id, name: f.name })) });
      }

      console.log('');
      for (const file of files) {
        console.log(`  ${gdrive.getMimeIcon(file.mimeType)} ${file.name}`);
        console.log(`    ${c.dim(`ID: ${file.id}`)}`);
      }
      console.log('');

      // Confirm unless --force
      if (!flags.force) {
        const readline = await import('node:readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise<string>((resolve) => {
          rl.question(c.yellow(`Delete ${files.length} file(s)? [y/N] `), resolve);
        });
        rl.close();

        if (answer.toLowerCase() !== 'y') {
          output.info('Cancelled');
          return;
        }
      }

      // Delete files
      const deleteSpinner = output.spinner('Deleting files...');
      let deleted = 0;
      const errors: string[] = [];

      for (const file of files) {
        try {
          await gdrive.deleteFile(file.id);
          deleted++;
        } catch (err) {
          errors.push(`${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      if (errors.length > 0) {
        deleteSpinner.fail(`Deleted ${deleted}/${files.length} files`);
        for (const err of errors) {
          output.error(err);
        }
      } else {
        deleteSpinner.success(`Deleted ${deleted} file(s)`);
      }

      if (globalFlags.json) {
        output.json({ deleted, errors });
      }
    } catch (error) {
      spinner.fail('Failed to search');
      throw error;
    }
  },
};
