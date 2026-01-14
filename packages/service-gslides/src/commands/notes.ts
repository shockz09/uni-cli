/**
 * uni gslides notes - Manage speaker notes
 */

import type { Command, CommandContext } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const notesCommand: Command = {
  name: 'notes',
  description: 'Get or set speaker notes for a slide',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
  ],
  options: [
    { name: 'slide', short: 's', type: 'string', description: 'Slide number (1-indexed). Default: 1' },
    { name: 'text', short: 't', type: 'string', description: 'Set speaker notes text' },
    { name: 'get', short: 'g', type: 'boolean', description: 'Get current speaker notes' },
  ],
  examples: [
    'uni gslides notes ID --slide 1 --get',
    'uni gslides notes ID --slide 2 --text "Remember to mention the key points"',
    'uni gslides notes ID -s 3 -t "Transition to demo here"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const slideNum = parseInt(flags.slide as string, 10) || 1;
    const text = flags.text as string | undefined;
    const get = flags.get as boolean;

    if (!text && !get) {
      output.error('Specify --text to set notes or --get to view notes');
      return;
    }

    const spinner = output.spinner(get ? 'Getting speaker notes...' : 'Setting speaker notes...');

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

      const slideId = slides[slideIndex].objectId;

      if (get) {
        const notes = await gslides.getSpeakerNotes(presentationId, slideId);
        spinner.stop();

        if (notes) {
          output.text(`Speaker notes for slide ${slideNum}:\n${notes}`);
        } else {
          output.text(`No speaker notes for slide ${slideNum}`);
        }

        if (globalFlags.json) {
          output.json({ slideNumber: slideNum, notes });
        }
      } else {
        await gslides.setSpeakerNotes(presentationId, slideId, text!);
        spinner.success(`Set speaker notes for slide ${slideNum}`);

        if (globalFlags.json) {
          output.json({ slideNumber: slideNum, notes: text });
        }
      }
    } catch (error) {
      spinner.fail(get ? 'Failed to get speaker notes' : 'Failed to set speaker notes');
      throw error;
    }
  },
};
