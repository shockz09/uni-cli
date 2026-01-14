/**
 * uni gdocs format - Apply text formatting
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';

export const formatCommand: Command = {
  name: 'format',
  description: 'Apply text formatting (bold, italic, underline, etc.)',
  args: [
    { name: 'id', description: 'Document ID or URL', required: true },
    { name: 'start', description: 'Start index', required: true },
    { name: 'end', description: 'End index', required: true },
  ],
  options: [
    { name: 'bold', short: 'b', type: 'boolean', description: 'Make text bold' },
    { name: 'italic', short: 'i', type: 'boolean', description: 'Make text italic' },
    { name: 'underline', short: 'u', type: 'boolean', description: 'Underline text' },
    { name: 'strike', type: 'boolean', description: 'Strikethrough text' },
    { name: 'size', short: 's', type: 'string', description: 'Font size in points' },
    { name: 'color', short: 'c', type: 'string', description: 'Text color (hex or name)' },
    { name: 'bg', type: 'string', description: 'Background color (hex or name)' },
    { name: 'font', short: 'f', type: 'string', description: 'Font family' },
  ],
  examples: [
    'uni gdocs format ID 1 10 --bold',
    'uni gdocs format ID 5 20 --italic --underline',
    'uni gdocs format ID 1 50 --size 14 --color red',
    'uni gdocs format ID 10 30 --font "Arial" --bold',
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

    if (flags.bold) style.bold = true;
    if (flags.italic) style.italic = true;
    if (flags.underline) style.underline = true;
    if (flags.strike) style.strikethrough = true;
    if (flags.size) style.fontSize = parseFloat(flags.size as string);
    if (flags.font) style.fontFamily = flags.font as string;

    if (flags.color) {
      style.foregroundColor = parseColor(flags.color as string);
    }
    if (flags.bg) {
      style.backgroundColor = parseColor(flags.bg as string);
    }

    if (Object.keys(style).length === 0) {
      output.error('Specify at least one formatting option (--bold, --italic, etc.)');
      return;
    }

    const spinner = output.spinner('Applying formatting...');

    try {
      await gdocs.updateTextStyle(documentId, startIndex, endIndex, style as Parameters<typeof gdocs.updateTextStyle>[3]);
      spinner.success(`Applied formatting to characters ${startIndex}-${endIndex}`);

      if (globalFlags.json) {
        output.json({ startIndex, endIndex, style });
      }
    } catch (error) {
      spinner.fail('Failed to apply formatting');
      throw error;
    }
  },
};

function parseColor(color: string): { red: number; green: number; blue: number } {
  const colors: Record<string, { red: number; green: number; blue: number }> = {
    black: { red: 0, green: 0, blue: 0 },
    white: { red: 1, green: 1, blue: 1 },
    red: { red: 1, green: 0, blue: 0 },
    green: { red: 0, green: 1, blue: 0 },
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

  return { red: 0, green: 0, blue: 0 };
}
