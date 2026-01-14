/**
 * uni gslides reorder - Reorder slides
 */

import type { Command, CommandContext } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const reorderCommand: Command = {
  name: 'reorder',
  description: 'Move slides to a new position',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
    { name: 'slide', description: 'Slide number to move (1-indexed)', required: true },
    { name: 'to', description: 'New position (1-indexed)', required: true },
  ],
  options: [],
  examples: [
    'uni gslides reorder ID 3 1',
    'uni gslides reorder ID 5 2',
    'uni gslides reorder ID 1 10',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const slideNum = parseInt(args.slide as string, 10);
    const toPosition = parseInt(args.to as string, 10);

    if (isNaN(slideNum) || isNaN(toPosition)) {
      output.error('Slide number and position must be numbers');
      return;
    }

    const spinner = output.spinner(`Moving slide ${slideNum} to position ${toPosition}...`);

    try {
      const presentation = await gslides.getPresentation(presentationId);
      const slides = presentation.slides || [];

      if (slides.length === 0) {
        spinner.fail('Presentation has no slides');
        return;
      }

      const slideIndex = slideNum - 1;
      if (slideIndex < 0 || slideIndex >= slides.length) {
        spinner.fail(`Invalid slide number. Presentation has ${slides.length} slides.`);
        return;
      }

      const targetIndex = toPosition - 1;
      if (targetIndex < 0 || targetIndex >= slides.length) {
        spinner.fail(`Invalid target position. Must be between 1 and ${slides.length}.`);
        return;
      }

      const slideId = slides[slideIndex].objectId;
      await gslides.reorderSlides(presentationId, [slideId], targetIndex);

      spinner.success(`Moved slide ${slideNum} to position ${toPosition}`);

      if (globalFlags.json) {
        output.json({ slideNumber: slideNum, newPosition: toPosition });
      }
    } catch (error) {
      spinner.fail('Failed to reorder slides');
      throw error;
    }
  },
};
