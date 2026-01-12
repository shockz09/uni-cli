/**
 * uni gsheets import - Import CSV/TSV file into spreadsheet
 */

import * as fs from 'node:fs';
import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

/**
 * Parse CSV/TSV content into 2D array
 */
function parseDelimited(content: string, delimiter: string = ','): string[][] {
  const rows: string[][] = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;

    // Simple CSV parsing (handles basic cases)
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    rows.push(cells);
  }

  return rows;
}

export const importCommand: Command = {
  name: 'import',
  description: 'Import CSV/TSV file into spreadsheet',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'file', description: 'Path to CSV or TSV file', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
    { name: 'range', short: 'r', type: 'string', description: 'Starting cell (default: A1)' },
    { name: 'delimiter', short: 'd', type: 'string', description: 'Delimiter: comma, tab, pipe (default: auto-detect)' },
    { name: 'append', short: 'a', type: 'boolean', description: 'Append to existing data instead of overwriting' },
  ],
  examples: [
    'uni gsheets import ID data.csv',
    'uni gsheets import ID data.tsv --range B2',
    'uni gsheets import ID export.csv --sheet "Import" --append',
    'uni gsheets import ID data.txt --delimiter pipe',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const filePath = args.file as string;
    const sheetName = flags.sheet as string | undefined;
    const startRange = (flags.range as string) || 'A1';
    const delimiterFlag = flags.delimiter as string | undefined;
    const appendMode = flags.append as boolean;

    // Check file exists
    if (!fs.existsSync(filePath)) {
      output.error(`File not found: ${filePath}`);
      return;
    }

    const spinner = output.spinner(`Importing ${filePath}...`);

    try {
      // Read file
      const content = fs.readFileSync(filePath, 'utf-8');

      // Detect delimiter
      let delimiter = ',';
      if (delimiterFlag) {
        delimiter = delimiterFlag === 'tab' ? '\t' : delimiterFlag === 'pipe' ? '|' : delimiterFlag;
      } else if (filePath.endsWith('.tsv')) {
        delimiter = '\t';
      } else if (content.includes('\t') && !content.includes(',')) {
        delimiter = '\t';
      } else if (content.includes('|') && !content.includes(',')) {
        delimiter = '|';
      }

      // Parse content
      const rows = parseDelimited(content, delimiter);

      if (rows.length === 0) {
        spinner.fail('No data found in file');
        return;
      }

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

      // Build range
      let range = startRange;
      if (!range.includes('!')) {
        range = `${targetSheet.properties.title}!${range}`;
      }

      // Import data
      if (appendMode) {
        await gsheets.appendRows(spreadsheetId, range, rows);
      } else {
        await gsheets.setValues(spreadsheetId, range, rows);
      }

      const cellCount = rows.reduce((sum, row) => sum + row.length, 0);

      output.pipe(`${rows.length}`);
      spinner.success(`Imported ${rows.length} rows (${cellCount} cells)`);

      if (globalFlags.json) {
        output.json({
          spreadsheetId,
          file: filePath,
          rows: rows.length,
          cells: cellCount,
          range,
          mode: appendMode ? 'append' : 'overwrite',
        });
        return;
      }

      if (!output.isPiped()) {
        console.log(`${c.green('Imported:')} ${rows.length} rows, ${cellCount} cells to ${range}`);
      }
    } catch (error) {
      spinner.fail('Failed to import file');
      throw error;
    }
  },
};
