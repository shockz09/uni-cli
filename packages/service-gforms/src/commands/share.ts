/**
 * uni gforms share - Share a form
 */

import type { Command, CommandContext } from '@uni/shared';
import { gforms, extractFormId } from '../api';

export const shareCommand: Command = {
  name: 'share',
  description: 'Share a form with someone',
  args: [
    {
      name: 'id',
      required: true,
      description: 'Form ID or URL',
    },
    {
      name: 'email',
      required: true,
      description: 'Email address to share with',
    },
  ],
  options: [
    {
      name: 'role',
      short: 'r',
      type: 'string',
      description: 'Permission role: reader or writer (default: writer)',
    },
  ],
  examples: [
    'uni gforms share <id> colleague@example.com',
    'uni gforms share <id> viewer@example.com --role reader',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, flags, globalFlags } = ctx;

    const formId = extractFormId(args.id as string);
    const email = args.email as string;
    const role = (flags.role as 'reader' | 'writer') || 'writer';

    await gforms.shareForm(formId, email, role);

    if (globalFlags.json) {
      output.json({
        formId,
        sharedWith: email,
        role,
      });
      return;
    }

    output.success(`Shared with ${email} (${role})`);
  },
};
