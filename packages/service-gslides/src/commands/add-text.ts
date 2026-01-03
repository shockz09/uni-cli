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
  ],
  examples: [
    'uni gslides add-text <id> "Hello World"',
    'uni gslides add-text <id> "Title" --slide 1',
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
    await gslides.addText(presentationId, slideId, text);

    if (globalFlags.json) {
      output.json({
        presentationId,
        slideNumber: slideIndex + 1,
        slideId,
        textAdded: text,
      });
      return;
    }

    output.success(`Added text to slide ${slideIndex + 1}`);
  },
};
