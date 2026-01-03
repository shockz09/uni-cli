/**
 * uni gforms delete - Delete a form
 */

import type { Command, CommandContext } from '@uni/shared';
import { gforms, extractFormId } from '../api';

export const deleteCommand: Command = {
  name: 'delete',
  description: 'Delete a form',
  args: [
    {
      name: 'id',
      required: true,
      description: 'Form ID or URL',
    },
  ],
  examples: ['uni gforms delete <form-id>'],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, globalFlags } = ctx;

    const formId = extractFormId(args.id as string);

    await gforms.deleteForm(formId);

    if (globalFlags.json) {
      output.json({
        formId,
        deleted: true,
      });
      return;
    }

    output.success(`Deleted form: ${formId}`);
  },
};
