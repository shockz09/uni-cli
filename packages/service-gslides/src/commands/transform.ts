/**
 * uni gslides transform - Move or resize elements
 */

import type { Command, CommandContext } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const transformCommand: Command = {
  name: 'transform',
  description: 'Move or resize a page element',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
    { name: 'elementId', description: 'Element ID to transform', required: true },
  ],
  options: [
    { name: 'x', type: 'string', description: 'X position in points' },
    { name: 'y', type: 'string', description: 'Y position in points' },
    { name: 'scale-x', type: 'string', description: 'Scale factor for width (1 = 100%)' },
    { name: 'scale-y', type: 'string', description: 'Scale factor for height (1 = 100%)' },
  ],
  examples: [
    'uni gslides transform ID shape_123 --x 200 --y 150',
    'uni gslides transform ID textbox_456 --scale-x 1.5 --scale-y 1.5',
    'uni gslides transform ID image_789 --x 100 --y 100 --scale-x 0.5',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const elementId = args.elementId as string;

    const transform: { x?: number; y?: number; scaleX?: number; scaleY?: number } = {};

    if (flags.x) transform.x = parseFloat(flags.x as string);
    if (flags.y) transform.y = parseFloat(flags.y as string);
    if (flags['scale-x']) transform.scaleX = parseFloat(flags['scale-x'] as string);
    if (flags['scale-y']) transform.scaleY = parseFloat(flags['scale-y'] as string);

    if (Object.keys(transform).length === 0) {
      output.error('Specify at least one transform option (--x, --y, --scale-x, --scale-y)');
      return;
    }

    const spinner = output.spinner(`Transforming element ${elementId}...`);

    try {
      await gslides.transformElement(presentationId, elementId, transform);
      spinner.success(`Transformed element ${elementId}`);

      if (globalFlags.json) {
        output.json({ elementId, transform });
      }
    } catch (error) {
      spinner.fail('Failed to transform element');
      throw error;
    }
  },
};
