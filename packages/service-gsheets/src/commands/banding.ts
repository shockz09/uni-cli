/**
 * uni gsheets banding - Add/list/delete banded (alternating color) ranges
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

function parseRange(ref: string): {
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
} | null {
  const colToIndex = (col: string) =>
    col.split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;

  const rangeMatch = ref.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
  if (rangeMatch) {
    return {
      startCol: colToIndex(rangeMatch[1].toUpperCase()),
      startRow: parseInt(rangeMatch[2], 10) - 1,
      endCol: colToIndex(rangeMatch[3].toUpperCase()) + 1,
      endRow: parseInt(rangeMatch[4], 10),
    };
  }
  return null;
}

function parseColor(color: string): { red: number; green: number; blue: number } | null {
  const colors: Record<string, { red: number; green: number; blue: number }> = {
    white: { red: 1, green: 1, blue: 1 },
    black: { red: 0, green: 0, blue: 0 },
    lightgray: { red: 0.9, green: 0.9, blue: 0.9 },
    gray: { red: 0.5, green: 0.5, blue: 0.5 },
    lightblue: { red: 0.8, green: 0.9, blue: 1 },
    blue: { red: 0.2, green: 0.4, blue: 0.8 },
    lightgreen: { red: 0.8, green: 1, blue: 0.8 },
    green: { red: 0.2, green: 0.6, blue: 0.2 },
    lightyellow: { red: 1, green: 1, blue: 0.8 },
    yellow: { red: 1, green: 0.9, blue: 0 },
  };

  const lower = color.toLowerCase();
  if (colors[lower]) return colors[lower];

  // Try hex
  const hex = color.replace('#', '');
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return {
      red: parseInt(hex.slice(0, 2), 16) / 255,
      green: parseInt(hex.slice(2, 4), 16) / 255,
      blue: parseInt(hex.slice(4, 6), 16) / 255,
    };
  }

  return null;
}

export const bandingCommand: Command = {
  name: 'banding',
  description: 'Add, list, or delete banded (alternating color) ranges',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
  ],
  options: [
    { name: 'add', short: 'a', type: 'boolean', description: 'Add banding to a range' },
    { name: 'list', short: 'l', type: 'boolean', description: 'List all banded ranges' },
    { name: 'delete', short: 'd', type: 'string', description: 'Delete banding by ID' },
    { name: 'range', short: 'r', type: 'string', description: 'Range for banding (e.g., A1:D100)' },
    { name: 'header-color', type: 'string', description: 'Header row color (name or #hex)' },
    { name: 'first-color', type: 'string', description: 'First band color (name or #hex)' },
    { name: 'second-color', type: 'string', description: 'Second band color (name or #hex)' },
    { name: 'footer-color', type: 'string', description: 'Footer row color (name or #hex)' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets banding ID --list',
    'uni gsheets banding ID --add --range A1:D100 --header-color blue --first-color white --second-color lightgray',
    'uni gsheets banding ID --add --range A1:Z50 --first-color "#ffffff" --second-color "#f0f0f0"',
    'uni gsheets banding ID --delete 123456',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const addBanding = flags.add as boolean;
    const listBanding = flags.list as boolean;
    const deleteBandingId = flags.delete as string | undefined;
    const sheetName = flags.sheet as string | undefined;

    // List banded ranges
    if (listBanding) {
      const spinner = output.spinner('Fetching banded ranges...');
      try {
        const bands = await gsheets.listBandedRanges(spreadsheetId);
        spinner.stop();

        if (bands.length === 0) {
          output.text('No banded ranges found');
        } else {
          if (globalFlags.json) {
            output.json(bands);
          } else {
            output.text(c.bold('Banded Ranges:\n'));
            for (const b of bands) {
              output.text(`  ${c.cyan(b.bandedRangeId.toString())} - Sheet ${b.sheetId}`);
            }
          }
        }
      } catch (error) {
        spinner.fail('Failed to list banded ranges');
        throw error;
      }
      return;
    }

    // Delete banding
    if (deleteBandingId) {
      const bandedRangeId = parseInt(deleteBandingId, 10);
      if (isNaN(bandedRangeId)) {
        output.error('Banded range ID must be a number');
        return;
      }

      const spinner = output.spinner('Deleting banded range...');
      try {
        await gsheets.deleteBandedRange(spreadsheetId, bandedRangeId);
        spinner.success(`Deleted banded range ${bandedRangeId}`);

        if (globalFlags.json) {
          output.json({ bandedRangeId, deleted: true });
        }
      } catch (error) {
        spinner.fail('Failed to delete banded range');
        throw error;
      }
      return;
    }

    // Add banding
    if (addBanding) {
      const rangeDef = flags.range as string | undefined;
      const headerColor = flags['header-color'] as string | undefined;
      const firstColor = flags['first-color'] as string | undefined;
      const secondColor = flags['second-color'] as string | undefined;
      const footerColor = flags['footer-color'] as string | undefined;

      if (!rangeDef) {
        output.error('--range is required when adding banding');
        return;
      }

      if (!firstColor && !secondColor) {
        output.error('Specify at least --first-color or --second-color');
        return;
      }

      const parsed = parseRange(rangeDef);
      if (!parsed) {
        output.error(`Invalid range: ${rangeDef}`);
        return;
      }

      const headerColorObj = headerColor ? parseColor(headerColor) : undefined;
      const firstColorObj = firstColor ? parseColor(firstColor) : undefined;
      const secondColorObj = secondColor ? parseColor(secondColor) : undefined;
      const footerColorObj = footerColor ? parseColor(footerColor) : undefined;

      if (headerColor && !headerColorObj) {
        output.error(`Invalid header color: ${headerColor}`);
        return;
      }
      if (firstColor && !firstColorObj) {
        output.error(`Invalid first color: ${firstColor}`);
        return;
      }
      if (secondColor && !secondColorObj) {
        output.error(`Invalid second color: ${secondColor}`);
        return;
      }
      if (footerColor && !footerColorObj) {
        output.error(`Invalid footer color: ${footerColor}`);
        return;
      }

      const spinner = output.spinner('Adding banded range...');

      try {
        const spreadsheet = await gsheets.getSpreadsheet(spreadsheetId);
        const sheets = [...(spreadsheet.sheets || [])].sort((a, b) => {
          const indexA = a.properties.index ?? (a.properties.sheetId === 0 ? 0 : 999);
          const indexB = b.properties.index ?? (b.properties.sheetId === 0 ? 0 : 999);
          return indexA - indexB;
        });
        const targetSheet = sheetName
          ? sheets.find(s => s.properties.title.toLowerCase() === sheetName.toLowerCase())
          : sheets[0];

        if (!targetSheet) {
          spinner.fail(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
          return;
        }

        const bandedRangeId = await gsheets.addBandedRange(
          spreadsheetId,
          {
            sheetId: targetSheet.properties.sheetId,
            startRowIndex: parsed.startRow,
            endRowIndex: parsed.endRow,
            startColumnIndex: parsed.startCol,
            endColumnIndex: parsed.endCol,
          },
          headerColorObj,
          firstColorObj,
          secondColorObj,
          footerColorObj
        );

        spinner.success(`Created banded range ${bandedRangeId} on ${rangeDef}`);

        if (globalFlags.json) {
          output.json({ bandedRangeId, range: rangeDef });
        }
      } catch (error) {
        spinner.fail('Failed to add banded range');
        throw error;
      }
      return;
    }

    output.error('Specify --add, --list, or --delete');
  },
};
