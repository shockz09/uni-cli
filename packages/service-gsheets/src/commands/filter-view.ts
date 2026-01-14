/**
 * uni gsheets filter-view - Manage saved filter views
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

/**
 * Parse cell reference to grid coordinates (0-indexed)
 */
function parseRange(ref: string): {
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
} | null {
  const colToIndex = (col: string) =>
    col.split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;

  // Try range format: A1:B5
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

export const filterViewCommand: Command = {
  name: 'filter-view',
  description: 'Manage saved filter views',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
  ],
  options: [
    { name: 'list', short: 'l', type: 'boolean', description: 'List all filter views' },
    { name: 'add', short: 'a', type: 'string', description: 'Add filter view with name' },
    { name: 'range', short: 'r', type: 'string', description: 'Range for new filter view (e.g., A1:D100)' },
    { name: 'remove', type: 'string', description: 'Remove filter view by ID' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets filter-view ID --list',
    'uni gsheets filter-view ID --add "My Filter" --range A1:E100',
    'uni gsheets filter-view ID --remove 123456789',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const list = flags.list as boolean;
    const addName = flags.add as string | undefined;
    const rangeDef = flags.range as string | undefined;
    const removeId = flags.remove as string | undefined;
    const sheetName = flags.sheet as string | undefined;

    try {
      // List filter views
      if (list || (!addName && !removeId)) {
        const spinner = output.spinner('Fetching filter views...');
        const views = await gsheets.listFilterViews(spreadsheetId);
        spinner.stop();

        if (globalFlags.json) {
          output.json({ filterViews: views });
          return;
        }

        if (views.length === 0) {
          console.log(c.dim('No filter views defined'));
          return;
        }

        console.log('');
        console.log(c.bold('Filter Views:'));
        console.log('');
        for (const fv of views) {
          console.log(`  ${c.cyan(fv.title)}: ${fv.range} ${c.dim(`(ID: ${fv.filterViewId})`)}`);
        }
        console.log('');
        return;
      }

      // Get sheet info for add operations
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
        output.error(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      // Add filter view
      if (addName) {
        if (!rangeDef) {
          output.error('--range is required when adding a filter view');
          return;
        }

        const parsed = parseRange(rangeDef);
        if (!parsed) {
          output.error(`Invalid range format: ${rangeDef}. Use format like A1:D100`);
          return;
        }

        const spinner = output.spinner(`Adding filter view "${addName}"...`);
        const filterViewId = await gsheets.addFilterView(spreadsheetId, addName, {
          sheetId: targetSheet.properties.sheetId,
          startRowIndex: parsed.startRow,
          endRowIndex: parsed.endRow,
          startColumnIndex: parsed.startCol,
          endColumnIndex: parsed.endCol,
        });
        spinner.success(`Added filter view "${addName}"`);

        if (globalFlags.json) {
          output.json({ filterViewId, name: addName, range: rangeDef });
        }
        return;
      }

      // Remove filter view
      if (removeId) {
        const spinner = output.spinner(`Removing filter view...`);
        await gsheets.deleteFilterView(spreadsheetId, parseInt(removeId, 10));
        spinner.success(`Removed filter view ${removeId}`);

        if (globalFlags.json) {
          output.json({ removed: parseInt(removeId, 10) });
        }
        return;
      }

    } catch (error) {
      output.error('Failed to manage filter views');
      throw error;
    }
  },
};
