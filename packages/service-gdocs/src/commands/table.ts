/**
 * uni gdocs table - Insert and manage tables
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';

export const tableCommand: Command = {
  name: 'table',
  description: 'Insert a table or manage table rows/columns',
  args: [
    { name: 'id', description: 'Document ID or URL', required: true },
  ],
  options: [
    { name: 'insert', type: 'boolean', description: 'Insert a new table' },
    { name: 'rows', short: 'r', type: 'string', description: 'Number of rows (for insert)' },
    { name: 'cols', short: 'c', type: 'string', description: 'Number of columns (for insert)' },
    { name: 'at', type: 'string', description: 'Insert position (index)' },
    { name: 'add-row', type: 'string', description: 'Add row at table (tableStartIndex:rowIndex)' },
    { name: 'add-col', type: 'string', description: 'Add column at table (tableStartIndex:colIndex)' },
    { name: 'del-row', type: 'string', description: 'Delete row from table (tableStartIndex:rowIndex)' },
    { name: 'del-col', type: 'string', description: 'Delete column from table (tableStartIndex:colIndex)' },
  ],
  examples: [
    'uni gdocs table ID --insert --rows 3 --cols 4',
    'uni gdocs table ID --insert --rows 5 --cols 2 --at 100',
    'uni gdocs table ID --add-row 50:2',
    'uni gdocs table ID --add-col 50:1',
    'uni gdocs table ID --del-row 50:0',
    'uni gdocs table ID --del-col 50:3',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);

    const spinner = output.spinner('Managing table...');

    try {
      if (flags.insert) {
        const rows = parseInt(flags.rows as string, 10) || 3;
        const cols = parseInt(flags.cols as string, 10) || 3;
        const at = flags.at ? parseInt(flags.at as string, 10) : undefined;

        await gdocs.insertTable(documentId, rows, cols, at);
        spinner.success(`Inserted ${rows}x${cols} table`);

        if (globalFlags.json) {
          output.json({ action: 'insert', rows, cols, at });
        }
      } else if (flags['add-row']) {
        const [tableStart, rowIdx] = (flags['add-row'] as string).split(':').map(Number);
        if (isNaN(tableStart) || isNaN(rowIdx)) {
          spinner.fail('Invalid format. Use: tableStartIndex:rowIndex');
          return;
        }
        await gdocs.insertTableRow(documentId, tableStart, rowIdx);
        spinner.success(`Added row after row ${rowIdx}`);

        if (globalFlags.json) {
          output.json({ action: 'add-row', tableStart, rowIndex: rowIdx });
        }
      } else if (flags['add-col']) {
        const [tableStart, colIdx] = (flags['add-col'] as string).split(':').map(Number);
        if (isNaN(tableStart) || isNaN(colIdx)) {
          spinner.fail('Invalid format. Use: tableStartIndex:colIndex');
          return;
        }
        await gdocs.insertTableColumn(documentId, tableStart, colIdx);
        spinner.success(`Added column after column ${colIdx}`);

        if (globalFlags.json) {
          output.json({ action: 'add-col', tableStart, columnIndex: colIdx });
        }
      } else if (flags['del-row']) {
        const [tableStart, rowIdx] = (flags['del-row'] as string).split(':').map(Number);
        if (isNaN(tableStart) || isNaN(rowIdx)) {
          spinner.fail('Invalid format. Use: tableStartIndex:rowIndex');
          return;
        }
        await gdocs.deleteTableRow(documentId, tableStart, rowIdx);
        spinner.success(`Deleted row ${rowIdx}`);

        if (globalFlags.json) {
          output.json({ action: 'del-row', tableStart, rowIndex: rowIdx });
        }
      } else if (flags['del-col']) {
        const [tableStart, colIdx] = (flags['del-col'] as string).split(':').map(Number);
        if (isNaN(tableStart) || isNaN(colIdx)) {
          spinner.fail('Invalid format. Use: tableStartIndex:colIndex');
          return;
        }
        await gdocs.deleteTableColumn(documentId, tableStart, colIdx);
        spinner.success(`Deleted column ${colIdx}`);

        if (globalFlags.json) {
          output.json({ action: 'del-col', tableStart, columnIndex: colIdx });
        }
      } else {
        spinner.fail('Specify an action: --insert, --add-row, --add-col, --del-row, or --del-col');
      }
    } catch (error) {
      spinner.fail('Failed to manage table');
      throw error;
    }
  },
};
