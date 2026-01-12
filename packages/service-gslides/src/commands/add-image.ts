/**
 * uni gslides add-image - Add an image to a slide
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const addImageCommand: Command = {
  name: 'add-image',
  description: 'Add an image to a slide',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
    { name: 'url', description: 'Image URL', required: true },
  ],
  options: [
    { name: 'slide', short: 's', type: 'number', description: 'Slide number (default: last slide)' },
    { name: 'width', short: 'w', type: 'number', description: 'Image width in points (default: 300)' },
    { name: 'height', short: 'h', type: 'number', description: 'Image height in points (default: auto)' },
    { name: 'x', type: 'number', description: 'X position in points (default: 100)' },
    { name: 'y', type: 'number', description: 'Y position in points (default: 100)' },
  ],
  examples: [
    'uni gslides add-image ID "https://example.com/image.png"',
    'uni gslides add-image ID "https://example.com/logo.png" --slide 1',
    'uni gslides add-image ID "https://example.com/chart.png" --width 400 --x 50 --y 200',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const imageUrl = args.url as string;
    const slideNum = flags.slide as number | undefined;
    const width = (flags.width as number) || 300;
    const height = flags.height as number | undefined;
    const x = (flags.x as number) || 100;
    const y = (flags.y as number) || 100;

    const spinner = output.spinner(`Adding image...`);

    try {
      const presentation = await gslides.getPresentation(presentationId);
      const slides = presentation.slides || [];

      if (slides.length === 0) {
        spinner.fail('Presentation has no slides. Add a slide first.');
        return;
      }

      const slideIndex = slideNum ? slideNum - 1 : slides.length - 1;
      if (slideIndex < 0 || slideIndex >= slides.length) {
        spinner.fail(`Invalid slide number. Presentation has ${slides.length} slides.`);
        return;
      }

      const slideId = slides[slideIndex].objectId;
      await gslides.addImage(presentationId, slideId, imageUrl, { width, height, x, y });

      spinner.success(`Added image to slide ${slideIndex + 1}`);

      if (globalFlags.json) {
        output.json({
          presentationId,
          slide: slideIndex + 1,
          imageUrl,
          position: { x, y, width, height },
        });
        return;
      }

      if (!output.isPiped()) {
        console.log('');
        console.log(`${c.green('Slide:')} ${slideIndex + 1}`);
        console.log(`${c.green('Image:')} ${imageUrl.slice(0, 60)}${imageUrl.length > 60 ? '...' : ''}`);
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to add image');
      throw error;
    }
  },
};
