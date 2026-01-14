/**
 * uni gforms link - Get form URLs
 */

import type { Command, CommandContext } from '@uni/shared';
import { gforms, extractFormId } from '../api';

export const linkCommand: Command = {
  name: 'link',
  aliases: ['links', 'url', 'urls'],
  description: 'Get form URLs (edit, respond, results)',
  args: [
    { name: 'formId', description: 'Form ID or URL', required: true },
  ],
  examples: [
    'uni gforms link FORM_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gforms.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gforms auth" first.');
      return;
    }

    const formId = extractFormId(args.formId as string);
    const urls = gforms.getFormUrls(formId);

    if (globalFlags.json) {
      output.json(urls);
      return;
    }

    output.info('Form URLs:\n');
    output.info(`  Edit:    ${urls.edit}`);
    output.info(`  Respond: ${urls.respond}`);
    output.info(`  Results: ${urls.results}`);
  },
};
