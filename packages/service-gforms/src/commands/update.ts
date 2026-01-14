/**
 * uni gforms update - Update form settings
 */

import type { Command, CommandContext } from '@uni/shared';
import { gforms, extractFormId } from '../api';

export const updateCommand: Command = {
  name: 'update',
  aliases: ['edit'],
  description: 'Update form title or description',
  args: [
    { name: 'formId', description: 'Form ID or URL', required: true },
  ],
  options: [
    { name: 'title', short: 't', type: 'string', description: 'New title' },
    { name: 'description', short: 'd', type: 'string', description: 'New description' },
  ],
  examples: [
    'uni gforms update FORM_ID --title "New Title"',
    'uni gforms update FORM_ID --description "Updated description"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gforms.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gforms auth" first.');
      return;
    }

    const formId = extractFormId(args.formId as string);

    if (!flags.title && !flags.description) {
      output.error('Specify --title or --description');
      return;
    }

    const spinner = output.spinner('Updating form...');
    try {
      const form = await gforms.updateForm(formId, {
        title: flags.title as string | undefined,
        description: flags.description as string | undefined,
      });
      spinner.success(`Updated: ${form.info.title}`);

      if (globalFlags.json) {
        output.json(form);
      }
    } catch (error) {
      spinner.fail('Failed to update form');
      throw error;
    }
  },
};
