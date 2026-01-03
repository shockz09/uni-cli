/**
 * uni gforms create - Create a new form
 */

import type { Command, CommandContext } from '@uni/shared';
import { gforms } from '../api';

export const createCommand: Command = {
  name: 'create',
  description: 'Create a new form',
  args: [
    {
      name: 'title',
      required: true,
      description: 'Form title',
    },
  ],
  examples: ['uni gforms create "Customer Feedback"', 'uni gforms create "Event Registration"'],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, globalFlags } = ctx;

    const title = args.title as string;
    const form = await gforms.createForm(title);

    const editUrl = `https://docs.google.com/forms/d/${form.formId}/edit`;

    if (globalFlags.json) {
      output.json({
        id: form.formId,
        title: form.info.title,
        editUrl,
        responderUri: form.responderUri,
      });
      return;
    }

    output.success(`Created form: ${form.info.title}`);
    output.text(`ID: ${form.formId}`);
    output.text(`Edit URL: ${editUrl}`);
    if (form.responderUri) {
      output.text(`Response URL: ${form.responderUri}`);
    }
  },
};
