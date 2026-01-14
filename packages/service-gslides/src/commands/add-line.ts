/**
 * uni gslides add-line - Add lines to slides
 */

import type { Command, CommandContext } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const addLineCommand: Command = {
  name: 'add-line',
  description: 'Add a line to a slide',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
  ],
  options: [
    { name: 'slide', short: 's', type: 'string', description: 'Slide number (1-indexed). Default: last slide' },
    { name: 'type', short: 't', type: 'string', description: 'Line type: straight, bent, curved (default: straight)' },
    { name: 'start-x', type: 'string', description: 'Start X position (default: 50)' },
    { name: 'start-y', type: 'string', description: 'Start Y position (default: 100)' },
    { name: 'end-x', type: 'string', description: 'End X position (default: 300)' },
    { name: 'end-y', type: 'string', description: 'End Y position (default: 100)' },
    { name: 'color', short: 'c', type: 'string', description: 'Line color (hex or name)' },
    { name: 'weight', short: 'w', type: 'string', description: 'Line weight in points' },
    { name: 'dash', short: 'd', type: 'string', description: 'Dash style: solid, dot, dash, dash-dot' },
  ],
  examples: [
    'uni gslides add-line ID',
    'uni gslides add-line ID --slide 2 --color red --weight 3',
    'uni gslides add-line ID --start-x 50 --start-y 100 --end-x 400 --end-y 300',
    'uni gslides add-line ID --type curved --dash dot --color blue',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const slideNum = flags.slide ? parseInt(flags.slide as string, 10) : undefined;
    const lineTypeInput = (flags.type as string)?.toLowerCase() || 'straight';

    const lineTypeMap: Record<string, Parameters<typeof gslides.addLine>[2]> = {
      straight: 'STRAIGHT',
      bent: 'BENT',
      curved: 'CURVED',
    };

    const lineCategory = lineTypeMap[lineTypeInput];
    if (!lineCategory) {
      output.error('Invalid line type. Use: straight, bent, curved');
      return;
    }

    const options: Parameters<typeof gslides.addLine>[3] = {};

    if (flags['start-x']) options.startX = parseFloat(flags['start-x'] as string);
    if (flags['start-y']) options.startY = parseFloat(flags['start-y'] as string);
    if (flags['end-x']) options.endX = parseFloat(flags['end-x'] as string);
    if (flags['end-y']) options.endY = parseFloat(flags['end-y'] as string);
    if (flags.weight) options.weight = parseFloat(flags.weight as string);
    if (flags.color) options.lineColor = parseColor(flags.color as string);

    if (flags.dash) {
      const dashMap: Record<string, Parameters<typeof gslides.addLine>[3]['dashStyle']> = {
        solid: 'SOLID',
        dot: 'DOT',
        dash: 'DASH',
        'dash-dot': 'DASH_DOT',
        'long-dash': 'LONG_DASH',
      };
      options.dashStyle = dashMap[(flags.dash as string).toLowerCase()] || 'SOLID';
    }

    const spinner = output.spinner('Adding line...');

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
      const lineId = await gslides.addLine(presentationId, slideId, lineCategory, options);

      spinner.success(`Added ${lineTypeInput} line to slide ${slideIndex + 1}`);

      if (globalFlags.json) {
        output.json({ lineId, slideNumber: slideIndex + 1, lineType: lineTypeInput });
      }
    } catch (error) {
      spinner.fail('Failed to add line');
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
    gray: { red: 0.5, green: 0.5, blue: 0.5 },
    orange: { red: 1, green: 0.65, blue: 0 },
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

  return { red: 0, green: 0, blue: 0 };
}
