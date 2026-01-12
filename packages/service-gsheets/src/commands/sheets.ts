/**
 * uni gsheets sheets - Manage worksheets (tabs)
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

export const sheetsCommand: Command = {
  name: 'sheets',
  description: 'Manage worksheets (tabs) in a spreadsheet',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'action', description: 'Action: list (default), add, rename, delete', required: false },
    { name: 'name', description: 'Sheet name (for add/rename) or sheet ID (for delete)', required: false },
    { name: 'newName', description: 'New name (for rename only)', required: false },
  ],
  options: [],
  examples: [
    'uni gsheets sheets ID',
    'uni gsheets sheets ID list',
    'uni gsheets sheets ID add "New Sheet"',
    'uni gsheets sheets ID rename "Sheet1" "Data"',
    'uni gsheets sheets ID delete 123456789',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const action = (args.action as string) || 'list';
    const name = args.name as string | undefined;
    const newName = args.newName as string | undefined;

    // List sheets
    if (action === 'list') {
      const spinner = output.spinner('Fetching sheets...');
      try {
        const spreadsheet = await gsheets.getSpreadsheet(spreadsheetId);
        const sheets = spreadsheet.sheets || [];
        spinner.stop();

        if (globalFlags.json) {
          output.json(sheets.map(s => ({
            id: s.properties.sheetId,
            title: s.properties.title,
            index: s.properties.index,
            rows: s.properties.gridProperties?.rowCount,
            cols: s.properties.gridProperties?.columnCount,
          })));
          return;
        }

        console.log('');
        console.log(c.bold(`Sheets in "${spreadsheet.properties.title}":`));
        console.log('');
        for (const sheet of sheets) {
          const grid = sheet.properties.gridProperties;
          const dims = grid ? `${grid.rowCount}x${grid.columnCount}` : '';
          const idx = sheet.properties.index;
          console.log(`  ${sheet.properties.title} ${c.dim(`(sheetId: ${sheet.properties.sheetId}, index: ${idx}, ${dims})`)}`);
        }
        console.log('');
      } catch (error) {
        spinner.fail('Failed to fetch sheets');
        throw error;
      }
      return;
    }

    // Add sheet
    if (action === 'add') {
      if (!name) {
        output.error('Sheet name required');
        return;
      }

      const spinner = output.spinner(`Creating sheet "${name}"...`);
      try {
        const result = await gsheets.addSheet(spreadsheetId, name);
        output.pipe(String(result.sheetId));
        spinner.success(`Sheet "${result.title}" created`);

        if (globalFlags.json) {
          output.json(result);
          return;
        }

        if (!output.isPiped()) {
          console.log(`${c.green('Created:')} ${result.title} (ID: ${result.sheetId})`);
        }
      } catch (error) {
        spinner.fail('Failed to create sheet');
        throw error;
      }
      return;
    }

    // Rename sheet
    if (action === 'rename') {
      if (!name || !newName) {
        output.error('Both current name and new name required');
        return;
      }

      const spinner = output.spinner(`Renaming "${name}" to "${newName}"...`);
      try {
        // Get sheet ID by name
        const spreadsheet = await gsheets.getSpreadsheet(spreadsheetId);
        const sheet = spreadsheet.sheets?.find(
          s => s.properties.title.toLowerCase() === name.toLowerCase()
        );
        if (!sheet) {
          spinner.fail(`Sheet "${name}" not found`);
          return;
        }

        await gsheets.renameSheet(spreadsheetId, sheet.properties.sheetId, newName);
        spinner.success(`Renamed "${name}" to "${newName}"`);

        if (globalFlags.json) {
          output.json({ sheetId: sheet.properties.sheetId, oldTitle: name, newTitle: newName });
        }
      } catch (error) {
        spinner.fail('Failed to rename sheet');
        throw error;
      }
      return;
    }

    // Delete sheet
    if (action === 'delete') {
      if (!name) {
        output.error('Sheet ID required');
        return;
      }

      const sheetId = parseInt(name, 10);
      if (isNaN(sheetId)) {
        output.error('Sheet ID must be a number');
        return;
      }

      const spinner = output.spinner(`Deleting sheet ${sheetId}...`);
      try {
        await gsheets.deleteSheet(spreadsheetId, sheetId);
        spinner.success('Sheet deleted');

        if (globalFlags.json) {
          output.json({ deleted: sheetId });
        }
      } catch (error) {
        spinner.fail('Failed to delete sheet');
        throw error;
      }
      return;
    }

    output.error(`Unknown action: ${action}. Use: list, add, rename, delete`);
  },
};
