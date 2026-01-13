/**
 * uni gsheets export - Export spreadsheet data to file
 */

import * as fs from 'node:fs';
import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

export const exportCommand: Command = {
  name: 'export',
  description: 'Export spreadsheet data to CSV/TSV file',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'output', description: 'Output file path (e.g., data.csv)', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
    { name: 'range', short: 'r', type: 'string', description: 'Range to export (default: all data)' },
    { name: 'format', short: 'f', type: 'string', description: 'Format: csv, tsv (default: auto from filename)' },
    { name: 'force', type: 'boolean', description: 'Overwrite existing file without warning' },
  ],
  examples: [
    'uni gsheets export 1abc123XYZ data.csv',
    'uni gsheets export 1abc123XYZ data.tsv --sheet "Sales"',
    'uni gsheets export 1abc123XYZ output.csv --range A1:D100',
    'uni gsheets export 1abc123XYZ data.txt --format csv',
    'uni gsheets export 1abc123XYZ data.csv --force',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const outputPath = args.output as string;
    const sheetName = flags.sheet as string | undefined;
    const rangeArg = flags.range as string | undefined;
    let format = flags.format as string | undefined;
    const forceOverwrite = flags.force as boolean;

    // Check if file exists and warn
    if (fs.existsSync(outputPath) && !forceOverwrite && !output.isPiped()) {
      console.log(`${c.yellow('Warning:')} File "${outputPath}" already exists and will be overwritten.`);
      console.log(c.dim('Use --force to skip this warning.'));
    }

    // Auto-detect format from filename
    if (!format) {
      if (outputPath.endsWith('.tsv')) {
        format = 'tsv';
      } else {
        format = 'csv';
      }
    }

    const delimiter = format === 'tsv' ? '\t' : ',';

    const spinner = output.spinner('Exporting data...');

    try {
      // Get spreadsheet info
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
      const range = rangeArg
        ? (rangeArg.includes('!') ? rangeArg : `${targetSheet.properties.title}!${rangeArg}`)
        : `${targetSheet.properties.title}!A1:ZZ10000`;

      // Get data
      const values = await gsheets.getValues(spreadsheetId, range);

      if (values.length === 0) {
        spinner.fail('No data to export');
        return;
      }

      // Convert to CSV/TSV
      const escapeCell = (cell: string) => {
        if (format === 'csv' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      };

      const content = values
        .map(row => row.map(cell => escapeCell(cell || '')).join(delimiter))
        .join('\n');

      // Write file
      fs.writeFileSync(outputPath, content, 'utf-8');

      output.pipe(outputPath);
      spinner.success(`Exported ${values.length} rows to ${outputPath}`);

      if (globalFlags.json) {
        output.json({
          spreadsheetId,
          sheet: targetSheet.properties.title,
          outputPath,
          format,
          rows: values.length,
          columns: values[0]?.length || 0,
        });
        return;
      }

      if (!output.isPiped()) {
        console.log(`${c.green('Exported:')} ${values.length} rows, ${values[0]?.length || 0} columns`);
        console.log(c.dim(`File: ${outputPath}`));
      }
    } catch (error) {
      spinner.fail('Failed to export data');
      throw error;
    }
  },
};
