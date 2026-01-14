/**
 * uni gslides add-table - Add tables to slides
 */

import type { Command, CommandContext } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const addTableCommand: Command = {
  name: 'add-table',
  description: 'Add a table to a slide',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
  ],
  options: [
    { name: 'slide', short: 's', type: 'string', description: 'Slide number (1-indexed). Default: last slide' },
    { name: 'rows', short: 'r', type: 'string', description: 'Number of rows (default: 3)' },
    { name: 'cols', short: 'c', type: 'string', description: 'Number of columns (default: 3)' },
    { name: 'x', type: 'string', description: 'X position in points (default: 50)' },
    { name: 'y', type: 'string', description: 'Y position in points (default: 100)' },
    { name: 'width', short: 'w', type: 'string', description: 'Width in points (default: 400)' },
    { name: 'height', short: 'h', type: 'string', description: 'Height in points (default: 200)' },
  ],
  examples: [
    'uni gslides add-table ID --rows 3 --cols 4',
    'uni gslides add-table ID --slide 2 --rows 5 --cols 2',
    'uni gslides add-table ID --rows 2 --cols 3 --x 100 --y 150 --width 300',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const slideNum = flags.slide ? parseInt(flags.slide as string, 10) : undefined;
    const rows = parseInt(flags.rows as string, 10) || 3;
    const cols = parseInt(flags.cols as string, 10) || 3;

    const options: { x?: number; y?: number; width?: number; height?: number } = {};
    if (flags.x) options.x = parseFloat(flags.x as string);
    if (flags.y) options.y = parseFloat(flags.y as string);
    if (flags.width) options.width = parseFloat(flags.width as string);
    if (flags.height) options.height = parseFloat(flags.height as string);

    const spinner = output.spinner('Adding table...');

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
      const tableId = await gslides.addTable(presentationId, slideId, rows, cols, options);

      spinner.success(`Added ${rows}x${cols} table to slide ${slideIndex + 1}`);

      if (globalFlags.json) {
        output.json({ tableId, slideNumber: slideIndex + 1, rows, cols });
      }
    } catch (error) {
      spinner.fail('Failed to add table');
      throw error;
    }
  },
};
