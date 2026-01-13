/**
 * uni gsheets note - Add/get/remove cell notes (comments)
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

export const noteCommand: Command = {
  name: 'note',
  description: 'Add, view, or remove cell notes (comments)',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'cell', description: 'Cell reference (e.g., A1)', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
    { name: 'set', type: 'string', description: 'Set note text' },
    { name: 'remove', short: 'r', type: 'boolean', description: 'Remove note from cell' },
  ],
  examples: [
    'uni gsheets note ID A1',
    'uni gsheets note ID B2 --set "Remember to update this"',
    'uni gsheets note ID C3 --remove',
    'uni gsheets note ID --sheet "Data" D4 --set "Important value"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const cellRef = (args.cell as string).toUpperCase();
    const sheetName = flags.sheet as string | undefined;
    const noteText = flags.set as string | undefined;
    const removeNote = flags.remove as boolean;

    const spinner = output.spinner(noteText ? 'Setting note...' : removeNote ? 'Removing note...' : 'Getting note...');

    try {
      // Get sheet info
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

      // Parse cell reference
      const match = cellRef.match(/^([A-Z]+)(\d+)$/);
      if (!match) {
        spinner.fail(`Invalid cell reference: ${cellRef}`);
        return;
      }

      const colIndex = match[1].split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
      const rowIndex = parseInt(match[2], 10) - 1;

      if (noteText !== undefined || removeNote) {
        // Set or remove note
        await gsheets.setNote(spreadsheetId, targetSheet.properties.sheetId, rowIndex, colIndex, removeNote ? '' : noteText || '');
        spinner.success(removeNote ? `Removed note from ${cellRef}` : `Set note on ${cellRef}`);

        if (globalFlags.json) {
          output.json({
            spreadsheetId,
            cell: cellRef,
            action: removeNote ? 'removed' : 'set',
            note: removeNote ? null : noteText,
          });
        }
      } else {
        // Get note
        const note = await gsheets.getNote(spreadsheetId, targetSheet.properties.title, rowIndex, colIndex);
        spinner.stop();

        if (globalFlags.json) {
          output.json({
            spreadsheetId,
            cell: cellRef,
            note: note || null,
          });
          return;
        }

        if (note) {
          console.log('');
          console.log(`${c.cyan('Cell:')} ${cellRef}`);
          console.log(`${c.cyan('Note:')} ${note}`);
          console.log('');
        } else {
          console.log('');
          console.log(c.dim(`No note on cell ${cellRef}`));
          console.log('');
        }
      }
    } catch (error) {
      spinner.fail('Failed to manage note');
      throw error;
    }
  },
};
