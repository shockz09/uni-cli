/**
 * uni gsheets image - Insert images into cells
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

function parseCell(ref: string): { col: number; row: number } | null {
  const colToIndex = (col: string) =>
    col.split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;

  const match = ref.match(/^([A-Z]+)(\d+)$/i);
  if (match) {
    return {
      col: colToIndex(match[1].toUpperCase()),
      row: parseInt(match[2], 10) - 1,
    };
  }
  return null;
}

export const imageCommand: Command = {
  name: 'image',
  description: 'Insert an image into a cell',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'cell', description: 'Target cell (e.g., A1)', required: true },
    { name: 'url', description: 'Image URL', required: true },
  ],
  options: [
    { name: 'mode', short: 'm', type: 'string', description: 'Insert mode: 1 (fit to cell), 2 (stretch), 3 (original size), 4 (custom size)' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets image ID A1 "https://example.com/logo.png"',
    'uni gsheets image ID B5 "https://example.com/chart.png" --mode 2',
    'uni gsheets image ID C1 "https://example.com/image.jpg" --mode 3 --sheet "Images"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const cellDef = args.cell as string;
    const imageUrl = args.url as string;
    const modeStr = flags.mode as string | undefined;
    const sheetName = flags.sheet as string | undefined;

    const cell = parseCell(cellDef);
    if (!cell) {
      output.error(`Invalid cell: ${cellDef}`);
      return;
    }

    let mode: 1 | 2 | 3 | 4 | undefined;
    if (modeStr) {
      const m = parseInt(modeStr, 10);
      if (m < 1 || m > 4) {
        output.error('Mode must be 1 (fit), 2 (stretch), 3 (original), or 4 (custom)');
        return;
      }
      mode = m as 1 | 2 | 3 | 4;
    }

    const spinner = output.spinner(`Inserting image into ${cellDef}...`);

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

      await gsheets.insertImage(
        spreadsheetId,
        {
          sheetId: targetSheet.properties.sheetId,
          rowIndex: cell.row,
          columnIndex: cell.col,
        },
        imageUrl,
        mode
      );

      spinner.success(`Inserted image into ${cellDef}`);

      if (globalFlags.json) {
        output.json({ cell: cellDef, url: imageUrl, mode });
      }

    } catch (error) {
      spinner.fail('Failed to insert image');
      throw error;
    }
  },
};
