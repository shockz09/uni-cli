/**
 * uni gslides background - Set slide background
 */

import type { Command, CommandContext } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const backgroundCommand: Command = {
  name: 'background',
  description: 'Set slide background color or image',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
  ],
  options: [
    { name: 'slide', short: 's', type: 'string', description: 'Slide number (1-indexed). Default: all slides' },
    { name: 'color', short: 'c', type: 'string', description: 'Background color (hex or name)' },
    { name: 'image', short: 'i', type: 'string', description: 'Background image URL' },
  ],
  examples: [
    'uni gslides background ID --color blue',
    'uni gslides background ID --slide 1 --color "#FF5500"',
    'uni gslides background ID --slide 2 --image "https://example.com/bg.jpg"',
    'uni gslides background ID --color white',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const slideNum = flags.slide ? parseInt(flags.slide as string, 10) : undefined;
    const color = flags.color as string | undefined;
    const imageUrl = flags.image as string | undefined;

    if (!color && !imageUrl) {
      output.error('Specify --color or --image for the background');
      return;
    }

    const spinner = output.spinner('Setting background...');

    try {
      const presentation = await gslides.getPresentation(presentationId);
      const slides = presentation.slides || [];

      if (slides.length === 0) {
        spinner.fail('Presentation has no slides');
        return;
      }

      let targetSlides: string[];
      if (slideNum) {
        const slideIndex = slideNum - 1;
        if (slideIndex < 0 || slideIndex >= slides.length) {
          spinner.fail(`Invalid slide number. Presentation has ${slides.length} slides.`);
          return;
        }
        targetSlides = [slides[slideIndex].objectId];
      } else {
        targetSlides = slides.map(s => s.objectId);
      }

      for (const slideId of targetSlides) {
        if (imageUrl) {
          await gslides.setSlideBackgroundImage(presentationId, slideId, imageUrl);
        } else if (color) {
          await gslides.setSlideBackgroundColor(presentationId, slideId, parseColor(color));
        }
      }

      const slideDesc = slideNum ? `slide ${slideNum}` : `${targetSlides.length} slides`;
      spinner.success(`Set background for ${slideDesc}`);

      if (globalFlags.json) {
        output.json({
          slides: slideNum || 'all',
          background: imageUrl ? { type: 'image', url: imageUrl } : { type: 'color', value: color },
        });
      }
    } catch (error) {
      spinner.fail('Failed to set background');
      throw error;
    }
  },
};

function parseColor(color: string): { red: number; green: number; blue: number } {
  const colors: Record<string, { red: number; green: number; blue: number }> = {
    black: { red: 0, green: 0, blue: 0 },
    white: { red: 1, green: 1, blue: 1 },
    red: { red: 1, green: 0, blue: 0 },
    green: { red: 0, green: 0.8, blue: 0 },
    blue: { red: 0, green: 0, blue: 1 },
    yellow: { red: 1, green: 1, blue: 0 },
    cyan: { red: 0, green: 1, blue: 1 },
    gray: { red: 0.5, green: 0.5, blue: 0.5 },
    lightgray: { red: 0.9, green: 0.9, blue: 0.9 },
    darkgray: { red: 0.3, green: 0.3, blue: 0.3 },
    orange: { red: 1, green: 0.65, blue: 0 },
    purple: { red: 0.5, green: 0, blue: 0.5 },
    navy: { red: 0, green: 0, blue: 0.5 },
  };

  const lower = color.toLowerCase();
  if (colors[lower]) return colors[lower];

  const hex = color.replace('#', '');
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return {
      red: parseInt(hex.slice(0, 2), 16) / 255,
      green: parseInt(hex.slice(2, 4), 16) / 255,
      blue: parseInt(hex.slice(4, 6), 16) / 255,
    };
  }

  return { red: 1, green: 1, blue: 1 };
}
