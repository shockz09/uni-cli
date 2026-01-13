/**
 * uni gsheets note - Add/get/remove cell notes (comments)
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

/**
 * Parse a cell reference or range (e.g., "A1", "A1:B5")
 * Returns { startCol, startRow, endCol, endRow } (0-indexed)
 */
function parseRange(ref: string): {
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
  isRange: boolean;
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
      isRange: true,
    };
  }

  // Try single cell format: A1
  const cellMatch = ref.match(/^([A-Z]+)(\d+)$/i);
  if (cellMatch) {
    const col = colToIndex(cellMatch[1].toUpperCase());
    const row = parseInt(cellMatch[2], 10) - 1;
    return {
      startCol: col,
      startRow: row,
      endCol: col + 1,
      endRow: row + 1,
      isRange: false,
    };
  }

  return null;
}

export const noteCommand: Command = {
  name: 'note',
  description: 'Add, view, or remove cell notes (comments)',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'cell', description: 'Cell reference or range (e.g., A1, A1:A5)', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
    { name: 'set', type: 'string', description: 'Set note text (applies to all cells in range)' },
    { name: 'remove', short: 'r', type: 'boolean', description: 'Remove note from cell(s)' },
  ],
  examples: [
    'uni gsheets note ID A1',
    'uni gsheets note ID B2 --set "Remember to update this"',
    'uni gsheets note ID A1:A5 --set "Same note on all cells"',
    'uni gsheets note ID C3 --remove',
    'uni gsheets note ID A1:B10 --remove',
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

      // Parse cell reference or range
      const range = parseRange(cellRef);
      if (!range) {
        spinner.fail(`Invalid cell reference: ${cellRef}`);
        return;
      }

      const cellCount = (range.endRow - range.startRow) * (range.endCol - range.startCol);

      if (noteText !== undefined || removeNote) {
        // Set or remove note
        if (range.isRange) {
          // Use range method for multiple cells
          await gsheets.setNoteRange(
            spreadsheetId,
            targetSheet.properties.sheetId,
            range.startRow,
            range.endRow,
            range.startCol,
            range.endCol,
            removeNote ? '' : noteText || ''
          );
        } else {
          // Use single cell method
          await gsheets.setNote(
            spreadsheetId,
            targetSheet.properties.sheetId,
            range.startRow,
            range.startCol,
            removeNote ? '' : noteText || ''
          );
        }

        const action = removeNote ? 'Removed note from' : 'Set note on';
        const target = range.isRange ? `${cellCount} cells (${cellRef})` : cellRef;
        spinner.success(`${action} ${target}`);

        if (globalFlags.json) {
          output.json({
            spreadsheetId,
            range: cellRef,
            cellCount,
            action: removeNote ? 'removed' : 'set',
            note: removeNote ? null : noteText,
          });
        }
      } else {
        // Get note(s)
        if (range.isRange) {
          // Get notes for a range
          const notes = await gsheets.getNotesRange(
            spreadsheetId,
            targetSheet.properties.title,
            range.startRow,
            range.endRow,
            range.startCol,
            range.endCol
          );
          spinner.stop();

          // Build list of cells with notes
          const colToLetter = (col: number) => {
            let letter = '';
            let temp = col;
            while (temp >= 0) {
              letter = String.fromCharCode((temp % 26) + 65) + letter;
              temp = Math.floor(temp / 26) - 1;
            }
            return letter;
          };

          const cellNotes: Array<{ cell: string; note: string }> = [];
          for (let r = 0; r < notes.length; r++) {
            for (let c = 0; c < notes[r].length; c++) {
              if (notes[r][c]) {
                const cellAddr = `${colToLetter(range.startCol + c)}${range.startRow + r + 1}`;
                cellNotes.push({ cell: cellAddr, note: notes[r][c]! });
              }
            }
          }

          if (globalFlags.json) {
            output.json({
              spreadsheetId,
              range: cellRef,
              notes: cellNotes,
            });
            return;
          }

          console.log('');
          if (cellNotes.length === 0) {
            console.log(c.dim(`No notes in range ${cellRef}`));
          } else {
            console.log(c.bold(`Notes in ${cellRef} (${cellNotes.length}):`));
            console.log('');
            for (const { cell, note } of cellNotes) {
              console.log(`  ${c.cyan(cell)}: ${note}`);
            }
          }
          console.log('');
        } else {
          // Get note for single cell
          const note = await gsheets.getNote(spreadsheetId, targetSheet.properties.title, range.startRow, range.startCol);
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
      }
    } catch (error) {
      spinner.fail('Failed to manage note');
      throw error;
    }
  },
};
