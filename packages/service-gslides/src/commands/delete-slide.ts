/**
 * uni gslides delete-slide - Delete a slide
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const deleteSlideCommand: Command = {
  name: 'delete-slide',
  description: 'Delete a slide from presentation',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
  ],
  options: [
    { name: 'slide', short: 's', type: 'number', description: 'Slide number to delete (default: last slide)' },
    { name: 'force', short: 'f', type: 'boolean', description: 'Skip confirmation' },
  ],
  examples: [
    'uni gslides delete-slide ID',
    'uni gslides delete-slide ID --slide 2',
    'uni gslides delete-slide ID -s 1 --force',
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

    if (slides.length === 1) {
      output.error('Cannot delete the only slide in a presentation');
      return;
    }

    const slideIndex = slideNum ? slideNum - 1 : slides.length - 1;
    if (slideIndex < 0 || slideIndex >= slides.length) {
      output.error(`Invalid slide number. Presentation has ${slides.length} slides.`);
      return;
    }

    if (!flags.force && !output.isPiped()) {
      console.log(`${c.yellow('Warning:')} About to delete slide ${slideIndex + 1} from "${presentation.title}"`);
      console.log(c.dim('Use --force to skip this warning'));
    }

    const spinner = output.spinner(`Deleting slide ${slideIndex + 1}...`);

    try {
      const slideId = slides[slideIndex].objectId;
      await gslides.deleteSlide(presentationId, slideId);

      spinner.success(`Deleted slide ${slideIndex + 1}`);

      if (globalFlags.json) {
        output.json({
          presentationId,
          deletedSlide: slideIndex + 1,
          remainingSlides: slides.length - 1,
        });
      }
    } catch (error) {
      spinner.fail('Failed to delete slide');
      throw error;
    }
  },
};
