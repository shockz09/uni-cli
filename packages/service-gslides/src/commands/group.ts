/**
 * uni gslides group - Group or ungroup elements
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const groupCommand: Command = {
  name: 'group',
  description: 'Group or ungroup elements on a slide',
  args: [
    { name: 'action', description: 'create or delete', required: true },
    { name: 'presentation', description: 'Presentation ID or URL', required: true },
  ],
  options: [
    { name: 'elements', alias: 'e', description: 'Comma-separated element IDs to group (for create)', type: 'string' },
    { name: 'id', description: 'Group ID to ungroup (for delete)', type: 'string' },
  ],
  examples: [
    'uni gslides group create PRES_ID -e "elem1,elem2,elem3"',
    'uni gslides group delete PRES_ID --id GROUP_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, options, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const action = args.action as string;
    const presentationId = extractPresentationId(args.presentation as string);

    if (action === 'create') {
      const elementsStr = options.elements as string;
      if (!elementsStr) {
        output.error('Elements are required. Use -e "elem1,elem2"');
        return;
      }

      const elementIds = elementsStr.split(',').map(e => e.trim());
      if (elementIds.length < 2) {
        output.error('At least 2 elements are required to create a group');
        return;
      }

      const spinner = output.spinner('Creating group...');
      try {
        const groupId = await gslides.groupElements(presentationId, elementIds);
        spinner.stop();

        if (globalFlags.json) {
          output.json({ groupId, elements: elementIds });
          return;
        }

        output.success('Elements grouped');
        output.info(`  Group ID: ${c.dim(groupId)}`);
      } catch (error) {
        spinner.fail('Failed to create group');
        throw error;
      }
    } else if (action === 'delete') {
      const groupId = options.id as string;
      if (!groupId) {
        output.error('Group ID is required. Use --id GROUP_ID');
        return;
      }

      const spinner = output.spinner('Ungrouping elements...');
      try {
        await gslides.ungroupElements(presentationId, groupId);
        spinner.stop();

        if (globalFlags.json) {
          output.json({ success: true, groupId });
          return;
        }

        output.success('Elements ungrouped');
      } catch (error) {
        spinner.fail('Failed to ungroup elements');
        throw error;
      }
    } else {
      output.error('Action must be: create or delete');
    }
  },
};
