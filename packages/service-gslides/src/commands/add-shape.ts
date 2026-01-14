/**
 * uni gslides add-shape - Add shapes to slides
 */

import type { Command, CommandContext } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const addShapeCommand: Command = {
  name: 'add-shape',
  description: 'Add a shape to a slide',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
  ],
  options: [
    { name: 'slide', short: 's', type: 'string', description: 'Slide number (1-indexed). Default: last slide' },
    { name: 'type', short: 't', type: 'string', description: 'Shape type: rectangle, ellipse, triangle, arrow, star, diamond, heart, cloud' },
    { name: 'x', type: 'string', description: 'X position in points (default: 100)' },
    { name: 'y', type: 'string', description: 'Y position in points (default: 100)' },
    { name: 'width', short: 'w', type: 'string', description: 'Width in points (default: 200)' },
    { name: 'height', short: 'h', type: 'string', description: 'Height in points (default: 150)' },
    { name: 'color', short: 'c', type: 'string', description: 'Fill color (hex or name)' },
  ],
  examples: [
    'uni gslides add-shape ID --type rectangle',
    'uni gslides add-shape ID --type ellipse --slide 2 --color blue',
    'uni gslides add-shape ID --type star --x 200 --y 150 --width 100 --height 100',
    'uni gslides add-shape ID --type arrow --color "#FF5500"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const slideNum = flags.slide ? parseInt(flags.slide as string, 10) : undefined;
    const shapeTypeInput = (flags.type as string)?.toLowerCase() || 'rectangle';

    const shapeTypeMap: Record<string, Parameters<typeof gslides.addShape>[2]> = {
      rectangle: 'RECTANGLE',
      rect: 'RECTANGLE',
      ellipse: 'ELLIPSE',
      oval: 'ELLIPSE',
      circle: 'ELLIPSE',
      triangle: 'TRIANGLE',
      arrow: 'ARROW_EAST',
      'arrow-right': 'ARROW_EAST',
      'arrow-left': 'ARROW_WEST',
      'arrow-up': 'ARROW_NORTH',
      'arrow-down': 'ARROW_SOUTH',
      star: 'STAR_5',
      star5: 'STAR_5',
      star6: 'STAR_6',
      diamond: 'DIAMOND',
      heart: 'HEART',
      cloud: 'CLOUD',
      rounded: 'ROUND_RECTANGLE',
      parallelogram: 'PARALLELOGRAM',
    };

    const shapeType = shapeTypeMap[shapeTypeInput];
    if (!shapeType) {
      output.error(`Invalid shape type: ${shapeTypeInput}. Use: rectangle, ellipse, triangle, arrow, star, diamond, heart, cloud`);
      return;
    }

    const options: { x?: number; y?: number; width?: number; height?: number; fillColor?: { red: number; green: number; blue: number } } = {};

    if (flags.x) options.x = parseFloat(flags.x as string);
    if (flags.y) options.y = parseFloat(flags.y as string);
    if (flags.width) options.width = parseFloat(flags.width as string);
    if (flags.height) options.height = parseFloat(flags.height as string);
    if (flags.color) options.fillColor = parseColor(flags.color as string);

    const spinner = output.spinner('Adding shape...');

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
      const shapeId = await gslides.addShape(presentationId, slideId, shapeType, options);

      spinner.success(`Added ${shapeTypeInput} to slide ${slideIndex + 1}`);

      if (globalFlags.json) {
        output.json({ shapeId, slideNumber: slideIndex + 1, shapeType: shapeTypeInput });
      }
    } catch (error) {
      spinner.fail('Failed to add shape');
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
    magenta: { red: 1, green: 0, blue: 1 },
    gray: { red: 0.5, green: 0.5, blue: 0.5 },
    orange: { red: 1, green: 0.65, blue: 0 },
    purple: { red: 0.5, green: 0, blue: 0.5 },
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

  return { red: 0.5, green: 0.5, blue: 0.5 };
}
