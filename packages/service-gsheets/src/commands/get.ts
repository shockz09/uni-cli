/**
 * uni gsheets get - Get spreadsheet data
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

interface FilterCondition {
  col: string;
  op: string;
  value: string;
}

interface CompoundFilter {
  conditions: FilterCondition[];
  operators: ('AND' | 'OR')[];
}

/**
 * Parse filter expression: "C>100", "A=foo AND B<50", "A=x OR B=y"
 */
function parseFilter(filter: string): CompoundFilter | null {
  // Split by AND/OR while preserving the operators
  const parts = filter.split(/\s+(AND|OR)\s+/i);
  const conditions: FilterCondition[] = [];
  const operators: ('AND' | 'OR')[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (part.toUpperCase() === 'AND' || part.toUpperCase() === 'OR') {
      operators.push(part.toUpperCase() as 'AND' | 'OR');
    } else {
      const match = part.match(/^([A-Z]+)(>=|<=|!=|=|>|<)(.+)$/i);
      if (!match) return null;
      conditions.push({ col: match[1].toUpperCase(), op: match[2], value: match[3] });
    }
  }

  if (conditions.length === 0) return null;
  return { conditions, operators };
}

/**
 * Evaluate a single condition against a row
 */
function evaluateCondition(row: string[], condition: FilterCondition, startCol: number): boolean {
  const colIndex = condition.col.charCodeAt(0) - 'A'.charCodeAt(0) - startCol;
  if (colIndex < 0 || colIndex >= row.length) return false;

  const cellValue = row[colIndex] || '';
  const numValue = parseFloat(cellValue);
  const filterNum = parseFloat(condition.value);
  const isNumeric = !isNaN(numValue) && !isNaN(filterNum);

  switch (condition.op) {
    case '=':
      return isNumeric ? numValue === filterNum : cellValue.toLowerCase() === condition.value.toLowerCase();
    case '!=':
      return isNumeric ? numValue !== filterNum : cellValue.toLowerCase() !== condition.value.toLowerCase();
    case '>':
      return isNumeric && numValue > filterNum;
    case '<':
      return isNumeric && numValue < filterNum;
    case '>=':
      return isNumeric && numValue >= filterNum;
    case '<=':
      return isNumeric && numValue <= filterNum;
    default:
      return true;
  }
}

/**
 * Apply compound filter to rows (supports AND/OR)
 */
function applyFilter(
  values: string[][],
  filter: CompoundFilter,
  startCol: number
): string[][] {
  // Keep header row
  const header = values[0];
  const filtered = values.slice(1).filter(row => {
    // Evaluate first condition
    let result = evaluateCondition(row, filter.conditions[0], startCol);

    // Apply remaining conditions with AND/OR
    for (let i = 0; i < filter.operators.length; i++) {
      const nextResult = evaluateCondition(row, filter.conditions[i + 1], startCol);
      if (filter.operators[i] === 'AND') {
        result = result && nextResult;
      } else {
        result = result || nextResult;
      }
    }

    return result;
  });

  return [header, ...filtered];
}

/**
 * Convert values to cell-keyed object: {"A1": "value", "B1": "value", ...}
 */
function valuesToCells(values: string[][], startRow: number, startCol: number): Record<string, string> {
  const cells: Record<string, string> = {};
  for (let r = 0; r < values.length; r++) {
    for (let c = 0; c < values[r].length; c++) {
      const cellRef = `${colToLetter(startCol + c)}${startRow + r}`;
      cells[cellRef] = values[r][c] || '';
    }
  }
  return cells;
}

export const getCommand: Command = {
  name: 'get',
  description: 'Get spreadsheet data',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Cell range (e.g., A1:B10, Sheet1!A1:Z100)', required: false },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
    { name: 'data', short: 'd', type: 'boolean', description: 'Dump all sheet data' },
    { name: 'tsv', type: 'boolean', description: 'Output as TSV (for piping)' },
    { name: 'cells', type: 'boolean', description: 'JSON output as cell-keyed object (e.g., {"A1": "value"})' },
    { name: 'filter', short: 'f', type: 'string', description: 'Filter rows (e.g., "C>100", "A=foo AND B<50", "A=x OR A=y")' },
  ],
  examples: [
    'uni gsheets get 1abc123XYZ',
    'uni gsheets get 1abc123XYZ A1:B10',
    'uni gsheets get 1abc123XYZ --data',
    'uni gsheets get 1abc123XYZ --data --tsv > data.tsv',
    'uni gsheets get 1abc123XYZ A1:D100 --filter "C>100"',
    'uni gsheets get 1abc123XYZ A1:D100 --filter "B>50 AND C<100"',
    'uni gsheets get 1abc123XYZ A1:D100 --json --cells',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    let range = args.range as string | undefined;
    const sheetName = flags.sheet as string | undefined;
    const includeData = flags.data as boolean;
    const outputTsv = flags.tsv as boolean;
    const outputCells = flags.cells as boolean;
    const filterExpr = flags.filter as string | undefined;

    const spinner = output.spinner('Fetching spreadsheet...');

    try {
      const spreadsheet = await gsheets.getSpreadsheet(spreadsheetId);

      // Determine which sheet to use (sort by index, fallback to sheetId 0 = first created)
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

      // Prepend sheet name to range if it doesn't already include one
      if (range && !range.includes('!')) {
        range = `${targetSheet.properties.title}!${range}`;
      }

      // Parse range to get start row/col for cell references
      let startRow = 1;
      let startCol = 0;
      if (range) {
        const cellPart = range.includes('!') ? range.split('!')[1] : range;
        const match = cellPart.match(/^([A-Z]+)(\d+)/i);
        if (match) {
          startCol = match[1].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
          startRow = parseInt(match[2], 10);
        }
      }

      // Get data if range specified or --data flag
      let values: string[][] = [];
      if (range || includeData) {
        const dataRange = range || `${targetSheet.properties.title}!A1:Z1000`;
        values = await gsheets.getValues(spreadsheetId, dataRange);
      }

      // Apply filter if specified
      if (filterExpr && values.length > 0) {
        const filter = parseFilter(filterExpr);
        if (filter) {
          values = applyFilter(values, filter, startCol);
        } else {
          spinner.fail(`Invalid filter: ${filterExpr}. Use format like "C>100" or "A=foo"`);
          return;
        }
      }

      spinner.stop();

      // TSV output mode
      if (outputTsv && values.length > 0) {
        const tsv = values.map(row => row.join('\t')).join('\n');
        console.log(tsv);
        return;
      }

      // Pipe output: if range was specified, output the data as TSV
      if ((range || includeData) && values.length > 0) {
        const tsv = values.map(row => row.join('\t')).join('\n');
        output.pipe(tsv);
      } else {
        output.pipe(spreadsheet.spreadsheetId);
      }

      // JSON output
      if (globalFlags.json) {
        if (outputCells && values.length > 0) {
          // Cell-keyed output
          output.json(valuesToCells(values, startRow, startCol));
        } else {
          output.json({
            id: spreadsheet.spreadsheetId,
            name: spreadsheet.properties.title,
            url: spreadsheet.spreadsheetUrl,
            range: range || undefined,
            sheets: sheets.map(s => ({
              name: s.properties.title,
              rows: s.properties.gridProperties?.rowCount,
              cols: s.properties.gridProperties?.columnCount,
            })),
            data: values.length > 0 ? values : undefined,
          });
        }
        return;
      }

      // If range was specified or --data, show the data
      if (range || includeData) {
        if (values.length === 0) {
          console.log(c.dim('No data in range'));
          return;
        }

        // Calculate column widths (min 3 chars per column)
        const colWidths: number[] = [];
        for (const row of values.slice(0, 50)) {
          row.forEach((cell, i) => {
            const len = Math.min(String(cell || '').length, 30);
            colWidths[i] = Math.max(colWidths[i] || 3, len);
          });
        }

        // Output as formatted table
        console.log('');
        for (let i = 0; i < Math.min(values.length, 50); i++) {
          const row = values[i];
          const cells = row.map((cell, j) => {
            const str = String(cell || '');
            return str.length > 30 ? str.slice(0, 27) + '...' : str.padEnd(colWidths[j] || 3);
          });
          // First row is header - make bold
          if (i === 0) {
            console.log(c.bold(cells.join('  ')));
            console.log(c.dim('─'.repeat(cells.join('  ').length)));
          } else {
            console.log(cells.join('  '));
          }
        }

        if (values.length > 50) {
          console.log(c.dim(`... and ${values.length - 50} more rows`));
        }
        console.log('');
        return;
      }

      // No range specified - show full spreadsheet info
      console.log('');
      console.log(c.bold(spreadsheet.properties.title));
      console.log(c.dim(`ID: ${spreadsheet.spreadsheetId}`));
      console.log('');

      // Show sheets info
      console.log(c.bold('Sheets:'));
      for (const sheet of sheets) {
        const grid = sheet.properties.gridProperties;
        const dims = grid ? `${grid.rowCount} rows x ${grid.columnCount} cols` : '';
        const marker = sheet.properties.title === targetSheet.properties.title ? ' *' : '';
        console.log(`  ${sheet.properties.title}${marker} ${c.dim(`(${dims})`)}`);
      }

      console.log('');
    } catch (error) {
      spinner.fail('Failed to fetch spreadsheet');
      throw error;
    }
  },
};
