/**
 * uni gslides create - Create a new presentation
 */

import type { Command, CommandContext } from '@uni/shared';
import { gslides } from '../api';

export const createCommand: Command = {
  name: 'create',
  description: 'Create a new presentation',
  args: [
    {
      name: 'title',
      required: true,
      description: 'Presentation title',
    },
  ],
  examples: ['uni gslides create "Q1 Review"', 'uni gslides create "Product Launch"'],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, globalFlags } = ctx;

    const title = args.title as string;
    const presentation = await gslides.createPresentation(title);

    const url = `https://docs.google.com/presentation/d/${presentation.presentationId}/edit`;

    if (globalFlags.json) {
      output.json({
        id: presentation.presentationId,
        title: presentation.title,
        url,
        slideCount: presentation.slides?.length || 0,
      });
      return;
    }

    output.success(`Created presentation: ${presentation.title}`);
    output.text(`ID: ${presentation.presentationId}`);
    output.text(`URL: ${url}`);
    output.text(`Slides: ${presentation.slides?.length || 0}`);
  },
};
