/**
 * uni gslides duplicate-slide - Duplicate a slide
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const duplicateSlideCommand: Command = {
  name: 'duplicate-slide',
  description: 'Duplicate an existing slide',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
  ],
  options: [
    { name: 'slide', short: 's', type: 'number', description: 'Slide number to duplicate (default: last slide)' },
  ],
  examples: [
    'uni gslides duplicate-slide ID',
    'uni gslides duplicate-slide ID --slide 1',
    'uni gslides duplicate-slide ID -s 3',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const slideNum = flags.slide as number | undefined;

    const spinner = output.spinner(`Duplicating slide...`);

    try {
      const presentation = await gslides.getPresentation(presentationId);
      const slides = presentation.slides || [];

      if (slides.length === 0) {
        spinner.fail('Presentation has no slides');
        return;
      }

      const slideIndex = slideNum ? slideNum - 1 : slides.length - 1;
      if (slideIndex < 0 || slideIndex >= slides.length) {
        spinner.fail(`Invalid slide number. Presentation has ${slides.length} slides.`);
        return;
      }

      const slideId = slides[slideIndex].objectId;
      const newSlideId = await gslides.duplicateSlide(presentationId, slideId);

      spinner.success(`Duplicated slide ${slideIndex + 1}`);

      if (globalFlags.json) {
        output.json({
          presentationId,
          sourceSlide: slideIndex + 1,
          newSlideId,
        });
        return;
      }

      if (!output.isPiped()) {
        console.log('');
        console.log(`${c.green('Source:')} Slide ${slideIndex + 1}`);
        console.log(`${c.green('New slide ID:')} ${newSlideId}`);
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to duplicate slide');
      throw error;
    }
  },
};
