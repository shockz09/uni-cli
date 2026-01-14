/**
 * uni gslides format-text - Format text in shapes
 */

import type { Command, CommandContext } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const formatTextCommand: Command = {
  name: 'format-text',
  description: 'Format text in a shape element',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
    { name: 'elementId', description: 'Element (shape/textbox) ID', required: true },
  ],
  options: [
    { name: 'bold', short: 'b', type: 'boolean', description: 'Make text bold' },
    { name: 'italic', short: 'i', type: 'boolean', description: 'Make text italic' },
    { name: 'underline', short: 'u', type: 'boolean', description: 'Underline text' },
    { name: 'strike', type: 'boolean', description: 'Strikethrough text' },
    { name: 'size', short: 's', type: 'string', description: 'Font size in points' },
    { name: 'color', short: 'c', type: 'string', description: 'Text color (hex or name)' },
    { name: 'font', short: 'f', type: 'string', description: 'Font family' },
    { name: 'start', type: 'string', description: 'Start index (default: all text)' },
    { name: 'end', type: 'string', description: 'End index (default: all text)' },
  ],
  examples: [
    'uni gslides format-text ID textbox_123 --bold',
    'uni gslides format-text ID shape_456 --size 24 --color red',
    'uni gslides format-text ID element_789 --font "Arial" --italic',
    'uni gslides format-text ID textbox_123 --bold --start 0 --end 10',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const elementId = args.elementId as string;

    const style: Parameters<typeof gslides.updateTextStyle>[2] = {};

    if (flags.bold) style.bold = true;
    if (flags.italic) style.italic = true;
    if (flags.underline) style.underline = true;
    if (flags.strike) style.strikethrough = true;
    if (flags.size) style.fontSize = parseFloat(flags.size as string);
    if (flags.font) style.fontFamily = flags.font as string;
    if (flags.color) style.foregroundColor = parseColor(flags.color as string);

    if (Object.keys(style).length === 0) {
      output.error('Specify at least one formatting option (--bold, --italic, etc.)');
      return;
    }

    const startIndex = flags.start ? parseInt(flags.start as string, 10) : 0;
    const endIndex = flags.end ? parseInt(flags.end as string, 10) : undefined;

    const spinner = output.spinner('Formatting text...');

    try {
      await gslides.updateTextStyle(presentationId, elementId, style, startIndex, endIndex);
      spinner.success(`Applied formatting to element ${elementId}`);

      if (globalFlags.json) {
        output.json({ elementId, style, startIndex, endIndex });
      }
    } catch (error) {
      spinner.fail('Failed to format text');
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
