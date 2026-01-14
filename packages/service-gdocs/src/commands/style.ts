/**
 * uni gdocs style - Apply paragraph styles
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';

export const styleCommand: Command = {
  name: 'style',
  description: 'Apply paragraph style (heading, alignment, spacing)',
  args: [
    { name: 'id', description: 'Document ID or URL', required: true },
    { name: 'start', description: 'Start index', required: true },
    { name: 'end', description: 'End index', required: true },
  ],
  options: [
    { name: 'heading', short: 'h', type: 'string', description: 'Heading level: title, subtitle, 1-6, normal' },
    { name: 'align', short: 'a', type: 'string', description: 'Alignment: left, center, right, justified' },
    { name: 'line-spacing', type: 'string', description: 'Line spacing (e.g., 100 for single, 200 for double)' },
    { name: 'space-above', type: 'string', description: 'Space above paragraph (points)' },
    { name: 'space-below', type: 'string', description: 'Space below paragraph (points)' },
    { name: 'indent', type: 'string', description: 'First line indent (points)' },
  ],
  examples: [
    'uni gdocs style ID 1 20 --heading 1',
    'uni gdocs style ID 1 50 --heading title --align center',
    'uni gdocs style ID 10 100 --align justified --line-spacing 150',
    'uni gdocs style ID 1 30 --heading 2 --space-below 12',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const startIndex = parseInt(args.start as string, 10);
    const endIndex = parseInt(args.end as string, 10);

    if (isNaN(startIndex) || isNaN(endIndex)) {
      output.error('Start and end must be numbers');
      return;
    }

    const style: Record<string, unknown> = {};

    if (flags.heading) {
      const headingMap: Record<string, string> = {
        title: 'TITLE',
        subtitle: 'SUBTITLE',
        normal: 'NORMAL_TEXT',
        '1': 'HEADING_1',
        '2': 'HEADING_2',
        '3': 'HEADING_3',
        '4': 'HEADING_4',
        '5': 'HEADING_5',
        '6': 'HEADING_6',
      };
      const heading = headingMap[(flags.heading as string).toLowerCase()];
      if (!heading) {
        output.error('Invalid heading. Use: title, subtitle, normal, or 1-6');
        return;
      }
      style.namedStyleType = heading;
    }

    if (flags.align) {
      const alignMap: Record<string, string> = {
        left: 'START',
        center: 'CENTER',
        right: 'END',
        justified: 'JUSTIFIED',
      };
      const align = alignMap[(flags.align as string).toLowerCase()];
      if (!align) {
        output.error('Invalid alignment. Use: left, center, right, justified');
        return;
      }
      style.alignment = align;
    }

    if (flags['line-spacing']) {
      style.lineSpacing = parseFloat(flags['line-spacing'] as string);
    }
    if (flags['space-above']) {
      style.spaceAbove = parseFloat(flags['space-above'] as string);
    }
    if (flags['space-below']) {
      style.spaceBelow = parseFloat(flags['space-below'] as string);
    }
    if (flags.indent) {
      style.indentFirstLine = parseFloat(flags.indent as string);
    }

    if (Object.keys(style).length === 0) {
      output.error('Specify at least one style option (--heading, --align, etc.)');
      return;
    }

    const spinner = output.spinner('Applying paragraph style...');

    try {
      await gdocs.updateParagraphStyle(documentId, startIndex, endIndex, style as Parameters<typeof gdocs.updateParagraphStyle>[3]);
      spinner.success(`Applied paragraph style to characters ${startIndex}-${endIndex}`);

      if (globalFlags.json) {
        output.json({ startIndex, endIndex, style });
      }
    } catch (error) {
      spinner.fail('Failed to apply paragraph style');
      throw error;
    }
  },
};
