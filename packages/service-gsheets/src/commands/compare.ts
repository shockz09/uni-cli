/**
 * uni gsheets compare - Add comparison formulas between columns
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

/**
 * Convert column index to letter (0 = A, 1 = B, etc.)
 */
function colToLetter(col: number): string {
  let letter = '';
  let temp = col;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Parse column letter to index (A = 0, B = 1, etc.)
 */
function letterToCol(letter: string): number {
  let col = 0;
  for (let i = 0; i < letter.length; i++) {
    col = col * 26 + (letter.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
  }
  return col - 1;
}

export const compareCommand: Command = {
  name: 'compare',
  description: 'Add comparison formulas between columns',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Data range with 2+ columns (e.g., A1:B10)', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
    { name: 'type', short: 't', type: 'string', description: 'Comparison type: diff, percent, change (default: percent)' },
    { name: 'header', short: 'h', type: 'string', description: 'Header for new column (default: "Change")' },
  ],
  examples: [
    'uni gsheets compare ID A1:B10',
    'uni gsheets compare ID A1:B10 --type diff --header "Difference"',
    'uni gsheets compare ID C1:D20 --type percent --header "% Change"',
    'uni gsheets compare ID --sheet "Data" E1:F50',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rangeStr = args.range as string;
    const sheetName = flags.sheet as string | undefined;
    const compType = (flags.type as string) || 'percent';
    const headerText = (flags.header as string) || 'Change';

    // Parse range
    const cellPart = rangeStr.includes('!') ? rangeStr.split('!')[1] : rangeStr;
    const match = cellPart.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
    if (!match) {
      output.error(`Invalid range: ${rangeStr}. Use format like A1:B10`);
      return;
    }

    const startCol = letterToCol(match[1].toUpperCase());
    const startRow = parseInt(match[2], 10);
    const endCol = letterToCol(match[3].toUpperCase());
    const endRow = parseInt(match[4], 10);

    if (endCol - startCol < 1) {
      output.error('Need at least 2 columns to compare');
      return;
    }

    const spinner = output.spinner(`Adding comparison formulas...`);

    try {
      // Get sheet info (sort by index, fallback to sheetId 0 = first created)
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

      // Column letters for formulas - col1 is baseline (old), col2 is comparison (new)
      const col1 = colToLetter(startCol);
      const col2 = colToLetter(startCol + 1);  // Always the next column, not endCol
      const resultCol = colToLetter(endCol + 1);

      // Build formula based on type
      // For improvement metrics (lower is better, like latency), use (old-new)/old
      // This shows positive % when new value is lower (improved)
      let formulaTemplate: string;
      switch (compType) {
        case 'diff':
          // Simple difference: new - old
          formulaTemplate = `=${col2}{ROW}-${col1}{ROW}`;
          break;
        case 'change':
          // Absolute change with sign
          formulaTemplate = `=IF(${col1}{ROW}=0,"N/A",${col2}{ROW}-${col1}{ROW})`;
          break;
        case 'percent':
        default:
          // Percentage improvement: (old - new) / old * 100
          // Positive = improvement (new is smaller/better)
          // Negative = regression (new is larger/worse)
          formulaTemplate = `=IF(${col1}{ROW}=0,"N/A",ROUND((${col1}{ROW}-${col2}{ROW})/${col1}{ROW}*100,1)&"%")`;
          break;
      }

      // Build values array: header + formulas
      const values: string[][] = [[headerText]];
      for (let row = startRow + 1; row <= endRow; row++) {
        values.push([formulaTemplate.replace(/\{ROW\}/g, String(row))]);
      }

      // Write to the column after the range
      const resultRange = `${targetSheet.properties.title}!${resultCol}${startRow}:${resultCol}${endRow}`;
      await gsheets.setValues(spreadsheetId, resultRange, values);

      spinner.success(`Added ${values.length - 1} comparison formulas`);

      if (globalFlags.json) {
        output.json({
          spreadsheetId,
          sourceRange: rangeStr,
          resultColumn: resultCol,
          resultRange,
          formulaType: compType,
          rowCount: values.length - 1,
        });
        return;
      }

      if (!output.isPiped()) {
        console.log('');
        console.log(`${c.green('Added:')} "${headerText}" column at ${resultCol}`);
        console.log(c.dim(`Formula type: ${compType}`));
        console.log(c.dim(`Rows: ${startRow + 1} to ${endRow}`));
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to add comparison formulas');
      throw error;
    }
  },
};
