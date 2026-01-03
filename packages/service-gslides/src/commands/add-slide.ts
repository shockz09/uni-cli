/**
 * uni gslides add-slide - Add a new slide to presentation
 */

import type { Command, CommandContext } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const addSlideCommand: Command = {
  name: 'add-slide',
  description: 'Add a new slide to presentation',
  args: [
    {
      name: 'id',
      required: true,
      description: 'Presentation ID or URL',
    },
  ],
  examples: [
    'uni gslides add-slide <presentation-id>',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, globalFlags } = ctx;

    const presentationId = extractPresentationId(args.id as string);
    const slideId = await gslides.addSlide(presentationId);

    // Get updated presentation to show slide count
    const presentation = await gslides.getPresentation(presentationId);

    if (globalFlags.json) {
      output.json({
        presentationId,
        newSlideId: slideId,
        totalSlides: presentation.slides?.length || 0,
      });
      return;
    }

    output.success(`Added new slide`);
    output.text(`Slide ID: ${slideId}`);
    output.text(`Total slides: ${presentation.slides?.length || 0}`);
  },
};
