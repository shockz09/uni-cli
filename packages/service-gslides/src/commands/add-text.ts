/**
 * uni gslides add-text - Add text to a slide
 */

import type { Command, CommandContext } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const addTextCommand: Command = {
  name: 'add-text',
  description: 'Add text to a slide',
  args: [
    {
      name: 'id',
      required: true,
      description: 'Presentation ID or URL',
    },
    {
      name: 'text',
      required: true,
      description: 'Text to add',
    },
  ],
  options: [
    {
      name: 'slide',
      short: 's',
      type: 'string',
      description: 'Slide number (default: last slide)',
    },
    { name: 'x', type: 'string', description: 'X position in points (default: 50)' },
    { name: 'y', type: 'string', description: 'Y position in points (default: 100)' },
    { name: 'width', short: 'w', type: 'string', description: 'Width in points (default: 500)' },
    { name: 'height', short: 'h', type: 'string', description: 'Height in points (default: 300)' },
  ],
  examples: [
    'uni gslides add-text <id> "Hello World"',
    'uni gslides add-text <id> "Title" --slide 1',
    'uni gslides add-text <id> "Content" --x 100 --y 200 --width 400 --height 50',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, flags, globalFlags } = ctx;

    const presentationId = extractPresentationId(args.id as string);
    const text = args.text as string;

    // Get presentation to find slide
    const presentation = await gslides.getPresentation(presentationId);

    if (!presentation.slides || presentation.slides.length === 0) {
      output.error('Presentation has no slides. Add a slide first.');
      return;
    }

    // Determine which slide to use
    let slideIndex = presentation.slides.length - 1; // Default to last slide
    if (flags.slide) {
      slideIndex = parseInt(flags.slide as string, 10) - 1;
      if (slideIndex < 0 || slideIndex >= presentation.slides.length) {
        output.error(`Invalid slide number. Presentation has ${presentation.slides.length} slides.`);
        return;
      }
    }

    const slideId = presentation.slides[slideIndex].objectId;

    const options: { x?: number; y?: number; width?: number; height?: number } = {};
    if (flags.x) options.x = parseFloat(flags.x as string);
    if (flags.y) options.y = parseFloat(flags.y as string);
    if (flags.width) options.width = parseFloat(flags.width as string);
    if (flags.height) options.height = parseFloat(flags.height as string);

    const textboxId = await gslides.addText(presentationId, slideId, text, options);

    if (globalFlags.json) {
      output.json({
        presentationId,
        slideNumber: slideIndex + 1,
        slideId,
        textboxId,
        textAdded: text,
      });
      return;
    }

    output.success(`Added text to slide ${slideIndex + 1} (element: ${textboxId})`);
  },
};
