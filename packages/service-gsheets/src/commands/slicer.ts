/**
 * uni gsheets slicer - Add/list/delete slicers
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

export const slicerCommand: Command = {
  name: 'slicer',
  description: 'Add, list, or delete slicers (interactive filters)',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
  ],
  options: [
    { name: 'add', short: 'a', type: 'boolean', description: 'Add a new slicer' },
    { name: 'list', short: 'l', type: 'boolean', description: 'List all slicers' },
    { name: 'delete', short: 'd', type: 'string', description: 'Delete slicer by ID' },
    { name: 'anchor', type: 'string', description: 'Anchor cell for slicer (e.g., E1)' },
    { name: 'data-range', type: 'string', description: 'Data range to filter (e.g., A1:D100)' },
    { name: 'column', short: 'c', type: 'string', description: 'Column index to filter (0-based)' },
    { name: 'title', short: 't', type: 'string', description: 'Slicer title' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets slicer ID --list',
    'uni gsheets slicer ID --add --anchor E1 --data-range A1:D100 --column 0 --title "Category"',
    'uni gsheets slicer ID --delete 123456',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const addSlicer = flags.add as boolean;
    const listSlicers = flags.list as boolean;
    const deleteSlicerId = flags.delete as string | undefined;
    const sheetName = flags.sheet as string | undefined;

    // List slicers
    if (listSlicers) {
      const spinner = output.spinner('Fetching slicers...');
      try {
        const slicers = await gsheets.listSlicers(spreadsheetId);
        spinner.stop();

        if (slicers.length === 0) {
          output.text('No slicers found');
        } else {
          if (globalFlags.json) {
            output.json(slicers);
          } else {
            output.text(c.bold('Slicers:\n'));
            for (const s of slicers) {
              output.text(`  ${c.cyan(s.slicerId.toString())} - ${s.title || '(no title)'} (column ${s.filterColumnIndex ?? '?'})`);
            }
          }
        }
      } catch (error) {
        spinner.fail('Failed to list slicers');
        throw error;
      }
      return;
    }

    // Delete slicer
    if (deleteSlicerId) {
      const slicerId = parseInt(deleteSlicerId, 10);
      if (isNaN(slicerId)) {
        output.error('Slicer ID must be a number');
        return;
      }

      const spinner = output.spinner('Deleting slicer...');
      try {
        await gsheets.deleteSlicer(spreadsheetId, slicerId);
        spinner.success(`Deleted slicer ${slicerId}`);

        if (globalFlags.json) {
          output.json({ slicerId, deleted: true });
        }
      } catch (error) {
        spinner.fail('Failed to delete slicer');
        throw error;
      }
      return;
    }

    // Add slicer
    if (addSlicer) {
      const anchor = flags.anchor as string | undefined;
      const dataRange = flags['data-range'] as string | undefined;
      const columnStr = flags.column as string | undefined;
      const title = flags.title as string | undefined;

      if (!anchor || !dataRange || columnStr === undefined) {
        output.error('--anchor, --data-range, and --column are required for adding a slicer');
        return;
      }

      const anchorCell = parseCell(anchor);
      if (!anchorCell) {
        output.error(`Invalid anchor cell: ${anchor}`);
        return;
      }

      const range = parseRange(dataRange);
      if (!range) {
        output.error(`Invalid data range: ${dataRange}`);
        return;
      }

      const filterColumnIndex = parseInt(columnStr, 10);
      if (isNaN(filterColumnIndex)) {
        output.error('Column must be a number');
        return;
      }

      const spinner = output.spinner('Adding slicer...');

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

        const sheetId = targetSheet.properties.sheetId;
        const slicerId = await gsheets.addSlicer(
          spreadsheetId,
          sheetId,
          { columnIndex: anchorCell.col, rowIndex: anchorCell.row },
          {
            sheetId,
            startRowIndex: range.startRow,
            endRowIndex: range.endRow,
            startColumnIndex: range.startCol,
            endColumnIndex: range.endCol,
          },
          filterColumnIndex,
          title
        );

        spinner.success(`Created slicer ${slicerId}${title ? ` "${title}"` : ''}`);

        if (globalFlags.json) {
          output.json({ slicerId, anchor, dataRange, filterColumnIndex, title });
        }
      } catch (error) {
        spinner.fail('Failed to add slicer');
        throw error;
      }
      return;
    }

    output.error('Specify --add, --list, or --delete');
  },
};
