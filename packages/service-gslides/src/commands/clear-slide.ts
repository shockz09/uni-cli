/**
 * uni gslides clear-slide - Clear all content from a slide
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const clearSlideCommand: Command = {
  name: 'clear-slide',
  description: 'Clear all content from a slide',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
  ],
  options: [
    { name: 'slide', short: 's', type: 'number', description: 'Slide number to clear (default: last slide)' },
    { name: 'force', short: 'f', type: 'boolean', description: 'Skip confirmation' },
  ],
  examples: [
    'uni gslides clear-slide ID',
    'uni gslides clear-slide ID --slide 2',
    'uni gslides clear-slide ID -s 1 --force',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const slideNum = flags.slide as number | undefined;

    const presentation = await gslides.getPresentation(presentationId);
    const slides = presentation.slides || [];

    if (slides.length === 0) {
      output.error('Presentation has no slides');
      return;
    }

    const slideIndex = slideNum ? slideNum - 1 : slides.length - 1;
    if (slideIndex < 0 || slideIndex >= slides.length) {
      output.error(`Invalid slide number. Presentation has ${slides.length} slides.`);
      return;
    }

    if (!flags.force && !output.isPiped()) {
      console.log(`${c.yellow('Warning:')} About to clear all content from slide ${slideIndex + 1}`);
      console.log(c.dim('Use --force to skip this warning'));
    }

    const spinner = output.spinner(`Clearing slide ${slideIndex + 1}...`);

    try {
      const slide = slides[slideIndex];
      const elementIds = (slide.pageElements || []).map(el => el.objectId);

      if (elementIds.length === 0) {
        spinner.success(`Slide ${slideIndex + 1} is already empty`);
        return;
      }

      await gslides.clearSlide(presentationId, elementIds);

      spinner.success(`Cleared ${elementIds.length} element(s) from slide ${slideIndex + 1}`);

      if (globalFlags.json) {
        output.json({
          presentationId,
          slide: slideIndex + 1,
          elementsCleared: elementIds.length,
        });
      }
    } catch (error) {
      spinner.fail('Failed to clear slide');
      throw error;
    }
  },
};
