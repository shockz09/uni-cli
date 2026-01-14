/**
 * uni gdocs bullets - Create bulleted or numbered lists
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';

export const bulletsCommand: Command = {
  name: 'bullets',
  description: 'Create or remove bulleted/numbered lists',
  args: [
    { name: 'id', description: 'Document ID or URL', required: true },
    { name: 'start', description: 'Start index', required: true },
    { name: 'end', description: 'End index', required: true },
  ],
  options: [
    { name: 'type', short: 't', type: 'string', description: 'List type: bullet, numbered, checkbox, or remove' },
    { name: 'style', short: 's', type: 'string', description: 'Bullet style: disc, diamond, arrow, star (for bullets) or decimal, alpha, roman (for numbered)' },
  ],
  examples: [
    'uni gdocs bullets ID 1 100 --type bullet',
    'uni gdocs bullets ID 1 50 --type numbered',
    'uni gdocs bullets ID 10 80 --type checkbox',
    'uni gdocs bullets ID 1 100 --type bullet --style star',
    'uni gdocs bullets ID 1 100 --type numbered --style roman',
    'uni gdocs bullets ID 1 100 --type remove',
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
    const listType = (flags.type as string)?.toLowerCase() || 'bullet';
    const style = (flags.style as string)?.toLowerCase();

    if (isNaN(startIndex) || isNaN(endIndex)) {
      output.error('Start and end must be numbers');
      return;
    }

    const spinner = output.spinner('Updating list formatting...');

    try {
      if (listType === 'remove') {
        await gdocs.deleteParagraphBullets(documentId, startIndex, endIndex);
        spinner.success('Removed bullets/numbering');
      } else {
        let preset: Parameters<typeof gdocs.createParagraphBullets>[3];

        if (listType === 'bullet') {
          const bulletStyles: Record<string, Parameters<typeof gdocs.createParagraphBullets>[3]> = {
            disc: 'BULLET_DISC_CIRCLE_SQUARE',
            diamond: 'BULLET_DIAMONDX_ARROW3D_SQUARE',
            arrow: 'BULLET_ARROW_DIAMOND_DISC',
            star: 'BULLET_STAR_CIRCLE_SQUARE',
          };
          preset = bulletStyles[style || 'disc'] || 'BULLET_DISC_CIRCLE_SQUARE';
        } else if (listType === 'numbered') {
          const numberedStyles: Record<string, Parameters<typeof gdocs.createParagraphBullets>[3]> = {
            decimal: 'NUMBERED_DECIMAL_ALPHA_ROMAN',
            alpha: 'NUMBERED_UPPERALPHA_ALPHA_ROMAN',
            roman: 'NUMBERED_UPPERROMAN_UPPERALPHA_DECIMAL',
          };
          preset = numberedStyles[style || 'decimal'] || 'NUMBERED_DECIMAL_ALPHA_ROMAN';
        } else if (listType === 'checkbox') {
          preset = 'BULLET_CHECKBOX';
        } else {
          spinner.fail('Invalid list type. Use: bullet, numbered, checkbox, or remove');
          return;
        }

        await gdocs.createParagraphBullets(documentId, startIndex, endIndex, preset);
        spinner.success(`Created ${listType} list`);
      }

      if (globalFlags.json) {
        output.json({ startIndex, endIndex, type: listType, style });
      }
    } catch (error) {
      spinner.fail('Failed to update list formatting');
      throw error;
    }
  },
};
