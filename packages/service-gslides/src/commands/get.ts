/**
 * uni gslides get - Get presentation details
 */

import type { Command, CommandContext } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const getCommand: Command = {
  name: 'get',
  description: 'Get presentation details',
  args: [
    {
      name: 'id',
      required: true,
      description: 'Presentation ID or URL',
    },
  ],
  options: [
    {
      name: 'text',
      short: 't',
      type: 'boolean',
      description: 'Extract text from slides',
    },
  ],
  examples: [
    'uni gslides get <presentation-id>',
    'uni gslides get <presentation-id> --text',
    'uni gslides get https://docs.google.com/presentation/d/xxx/edit',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, flags, globalFlags } = ctx;

    const presentationId = extractPresentationId(args.id as string);
    const presentation = await gslides.getPresentation(presentationId);

    if (globalFlags.json) {
      output.json({
        id: presentation.presentationId,
        title: presentation.title,
        slideCount: presentation.slides?.length || 0,
        slides: presentation.slides?.map((s, i) => ({
          index: i + 1,
          id: s.objectId,
        })),
      });
      return;
    }

    output.text(`\nPresentation: ${presentation.title}`);
    output.text(`ID: ${presentation.presentationId}`);
    output.text(`Slides: ${presentation.slides?.length || 0}`);

    if (flags.text && presentation.slides) {
      output.text('\n--- Slide Content ---\n');
      const texts = gslides.extractSlideText(presentation);
      for (const text of texts) {
        output.text(text);
        output.text('');
      }
    } else if (presentation.slides) {
      output.text('\nSlides:');
      presentation.slides.forEach((slide, index) => {
        output.text(`  ${index + 1}. ${slide.objectId}`);
      });
    }

    output.text('');
  },
};
