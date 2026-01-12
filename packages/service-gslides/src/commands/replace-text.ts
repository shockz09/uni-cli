/**
 * uni gslides replace-text - Replace text in presentation
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const replaceTextCommand: Command = {
  name: 'replace-text',
  description: 'Replace text throughout the presentation',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
    { name: 'old', description: 'Text to find', required: true },
    { name: 'new', description: 'Replacement text', required: true },
  ],
  options: [
    { name: 'case', short: 'c', type: 'boolean', description: 'Case-sensitive replacement' },
  ],
  examples: [
    'uni gslides replace-text ID "old text" "new text"',
    'uni gslides replace-text ID "TODO" "DONE"',
    'uni gslides replace-text ID "2024" "2025" --case',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const oldText = args.old as string;
    const newText = args.new as string;
    const caseSensitive = flags.case as boolean || false;

    const spinner = output.spinner(`Replacing text...`);

    try {
      const count = await gslides.replaceText(presentationId, oldText, newText, caseSensitive);
      spinner.success(`Replaced ${count} occurrence(s)`);

      if (globalFlags.json) {
        output.json({
          presentationId,
          searchText: oldText,
          replaceText: newText,
          caseSensitive,
          occurrences: count,
        });
        return;
      }

      if (!output.isPiped()) {
        console.log('');
        console.log(`${c.green('Replaced:')} "${oldText}" → "${newText}"`);
        console.log(`${c.green('Count:')} ${count} occurrence(s)`);
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to replace text');
      throw error;
    }
  },
};
