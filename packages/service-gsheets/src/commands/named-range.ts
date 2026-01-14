/**
 * uni gsheets named-range - Manage named ranges
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

  const match = ref.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
  if (!match) return null;

  return {
    startCol: colToIndex(match[1].toUpperCase()),
    startRow: parseInt(match[2], 10) - 1,
    endCol: colToIndex(match[3].toUpperCase()) + 1,
    endRow: parseInt(match[4], 10),
  };
}

export const namedRangeCommand: Command = {
  name: 'named-range',
  description: 'Manage named ranges',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
  ],
  options: [
    { name: 'list', short: 'l', type: 'boolean', description: 'List all named ranges' },
    { name: 'add', short: 'a', type: 'string', description: 'Add named range (name)' },
    { name: 'range', short: 'r', type: 'string', description: 'Range for add/update (e.g., A1:D10)' },
    { name: 'remove', type: 'string', description: 'Remove named range by name or ID' },
    { name: 'update', short: 'u', type: 'string', description: 'Update named range (name or ID)' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets named-range ID --list',
    'uni gsheets named-range ID --add "DataRange" --range A1:D100',
    'uni gsheets named-range ID --remove "DataRange"',
    'uni gsheets named-range ID --update "DataRange" --range A1:E200',
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
    const removeName = flags.remove as string | undefined;
    const updateName = flags.update as string | undefined;
    const sheetName = flags.sheet as string | undefined;

    try {
      // List named ranges
      if (list || (!addName && !removeName && !updateName)) {
        const spinner = output.spinner('Fetching named ranges...');
        const ranges = await gsheets.listNamedRanges(spreadsheetId);
        spinner.stop();

        if (globalFlags.json) {
          output.json({ namedRanges: ranges });
          return;
        }

        if (ranges.length === 0) {
          console.log(c.dim('No named ranges defined'));
          return;
        }

        console.log('');
        console.log(c.bold('Named Ranges:'));
        console.log('');
        for (const nr of ranges) {
          console.log(`  ${c.cyan(nr.name)}: ${nr.range} ${c.dim(`(ID: ${nr.namedRangeId})`)}`);
        }
        console.log('');
        return;
      }

      // Get sheet info for operations that need sheetId
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

      // Add named range
      if (addName) {
        if (!rangeDef) {
          output.error('--range is required when adding a named range');
          return;
        }

        const parsed = parseRange(rangeDef);
        if (!parsed) {
          output.error(`Invalid range format: ${rangeDef}. Use format like A1:D10`);
          return;
        }

        const spinner = output.spinner(`Adding named range "${addName}"...`);
        const namedRangeId = await gsheets.addNamedRange(spreadsheetId, addName, {
          sheetId: targetSheet.properties.sheetId,
          startRowIndex: parsed.startRow,
          endRowIndex: parsed.endRow,
          startColumnIndex: parsed.startCol,
          endColumnIndex: parsed.endCol,
        });
        spinner.success(`Added named range "${addName}"`);

        if (globalFlags.json) {
          output.json({ namedRangeId, name: addName, range: rangeDef });
        }
        return;
      }

      // Remove named range
      if (removeName) {
        const spinner = output.spinner(`Removing named range "${removeName}"...`);

        // Find the named range by name or ID
        const ranges = await gsheets.listNamedRanges(spreadsheetId);
        const found = ranges.find(r => r.name === removeName || r.namedRangeId === removeName);

        if (!found) {
          spinner.fail(`Named range "${removeName}" not found`);
          return;
        }

        await gsheets.deleteNamedRange(spreadsheetId, found.namedRangeId);
        spinner.success(`Removed named range "${found.name}"`);

        if (globalFlags.json) {
          output.json({ removed: found.name, namedRangeId: found.namedRangeId });
        }
        return;
      }

      // Update named range
      if (updateName) {
        if (!rangeDef) {
          output.error('--range is required when updating a named range');
          return;
        }

        const parsed = parseRange(rangeDef);
        if (!parsed) {
          output.error(`Invalid range format: ${rangeDef}. Use format like A1:D10`);
          return;
        }

        const spinner = output.spinner(`Updating named range "${updateName}"...`);

        // Find the named range by name or ID
        const ranges = await gsheets.listNamedRanges(spreadsheetId);
        const found = ranges.find(r => r.name === updateName || r.namedRangeId === updateName);

        if (!found) {
          spinner.fail(`Named range "${updateName}" not found`);
          return;
        }

        await gsheets.updateNamedRange(spreadsheetId, found.namedRangeId, undefined, {
          sheetId: targetSheet.properties.sheetId,
          startRowIndex: parsed.startRow,
          endRowIndex: parsed.endRow,
          startColumnIndex: parsed.startCol,
          endColumnIndex: parsed.endCol,
        });
        spinner.success(`Updated named range "${found.name}" to ${rangeDef}`);

        if (globalFlags.json) {
          output.json({ updated: found.name, namedRangeId: found.namedRangeId, newRange: rangeDef });
        }
        return;
      }

    } catch (error) {
      output.error('Failed to manage named ranges');
      throw error;
    }
  },
};
