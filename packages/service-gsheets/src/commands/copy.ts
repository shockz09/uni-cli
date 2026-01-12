/**
 * uni gsheets copy - Duplicate a sheet
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

export const copyCommand: Command = {
  name: 'copy',
  description: 'Duplicate a sheet within the spreadsheet',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'newName', description: 'Name for the copy', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Source sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets copy ID "Sheet1 Copy"',
    'uni gsheets copy ID "Backup" --sheet "Data"',
    'uni gsheets copy ID "Template Copy" -s "Template"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const newName = args.newName as string;
    const sheetName = flags.sheet as string | undefined;

    const spinner = output.spinner(`Copying sheet...`);

    try {
      // Get sheet info (sort by index, fallback to sheetId 0 = first created)
      const spreadsheet = await gsheets.getSpreadsheet(spreadsheetId);
      const sheets = [...(spreadsheet.sheets || [])].sort((a, b) => {
        const indexA = a.properties.index ?? (a.properties.sheetId === 0 ? 0 : 999);
        const indexB = b.properties.index ?? (b.properties.sheetId === 0 ? 0 : 999);
        return indexA - indexB;
      });
      const sourceSheet = sheetName
        ? sheets.find(s => s.properties.title.toLowerCase() === sheetName.toLowerCase())
        : sheets[0];

      if (!sourceSheet) {
        spinner.fail(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      const result = await gsheets.duplicateSheet(
        spreadsheetId,
        sourceSheet.properties.sheetId,
        newName
      );

      output.pipe(String(result.sheetId));
      spinner.success(`Copied "${sourceSheet.properties.title}" to "${result.title}"`);

      if (globalFlags.json) {
        output.json({
          spreadsheetId,
          sourceSheet: sourceSheet.properties.title,
          newSheet: result.title,
          newSheetId: result.sheetId,
        });
        return;
      }

      if (!output.isPiped()) {
        console.log(`${c.green('Created:')} ${result.title} (ID: ${result.sheetId})`);
      }
    } catch (error) {
      spinner.fail('Failed to copy sheet');
      throw error;
    }
  },
};
