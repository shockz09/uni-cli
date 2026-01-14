/**
 * uni gslides delete-element - Delete page elements
 */

import type { Command, CommandContext } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const deleteElementCommand: Command = {
  name: 'delete-element',
  description: 'Delete a page element (shape, image, table, etc.)',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
    { name: 'elementId', description: 'Element ID to delete', required: true },
  ],
  options: [
    { name: 'force', short: 'f', type: 'boolean', description: 'Skip confirmation' },
  ],
  examples: [
    'uni gslides delete-element ID textbox_123',
    'uni gslides delete-element ID shape_456 --force',
    'uni gslides delete-element ID image_789',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const elementId = args.elementId as string;

    const spinner = output.spinner(`Deleting element ${elementId}...`);

    try {
      await gslides.deleteElement(presentationId, elementId);
      spinner.success(`Deleted element ${elementId}`);

      if (globalFlags.json) {
        output.json({ deleted: elementId });
      }
    } catch (error) {
      spinner.fail('Failed to delete element');
      throw error;
    }
  },
};
