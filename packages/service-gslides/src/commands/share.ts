/**
 * uni gslides share - Share a presentation
 */

import type { Command, CommandContext } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const shareCommand: Command = {
  name: 'share',
  description: 'Share a presentation with someone',
  args: [
    {
      name: 'id',
      required: true,
      description: 'Presentation ID or URL',
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
    'uni gslides share <id> colleague@example.com',
    'uni gslides share <id> viewer@example.com --role reader',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, flags, globalFlags } = ctx;

    const presentationId = extractPresentationId(args.id as string);
    const email = args.email as string;
    const role = (flags.role as 'reader' | 'writer') || 'writer';

    await gslides.sharePresentation(presentationId, email, role);

    if (globalFlags.json) {
      output.json({
        presentationId,
        sharedWith: email,
        role,
      });
      return;
    }

    output.success(`Shared with ${email} (${role})`);
  },
};
