/**
 * uni gsheets validate - Manage data validation rules
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

  // Try range format: A1:B5
  const rangeMatch = ref.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
  if (rangeMatch) {
    return {
      startCol: colToIndex(rangeMatch[1].toUpperCase()),
      startRow: parseInt(rangeMatch[2], 10) - 1,
      endCol: colToIndex(rangeMatch[3].toUpperCase()) + 1,
      endRow: parseInt(rangeMatch[4], 10),
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
    };
  }

  return null;
}

export const validateCommand: Command = {
  name: 'validate',
  description: 'Set data validation rules on cells',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Cell range (e.g., A1:A100)', required: true },
  ],
  options: [
    { name: 'type', short: 't', type: 'string', description: 'Validation type: list, number, date, checkbox, text, custom' },
    { name: 'values', short: 'v', type: 'string', description: 'Comma-separated values for list validation' },
    { name: 'min', type: 'string', description: 'Minimum value for number validation' },
    { name: 'max', type: 'string', description: 'Maximum value for number validation' },
    { name: 'operator', short: 'o', type: 'string', description: 'Operator: gt, gte, lt, lte, eq, ne, between' },
    { name: 'date', short: 'd', type: 'string', description: 'Date value (YYYY-MM-DD)' },
    { name: 'date2', type: 'string', description: 'Second date for between operator' },
    { name: 'date-op', type: 'string', description: 'Date operator: before, after, on, between' },
    { name: 'formula', short: 'f', type: 'string', description: 'Custom formula (e.g., =A1>0)' },
    { name: 'message', short: 'm', type: 'string', description: 'Input message to show user' },
    { name: 'strict', type: 'boolean', description: 'Reject invalid data (default: true)' },
    { name: 'no-dropdown', type: 'boolean', description: 'Hide dropdown UI for list validation' },
    { name: 'clear', short: 'c', type: 'boolean', description: 'Clear validation from range' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets validate ID A1:A100 --type list --values "Yes,No,Maybe"',
    'uni gsheets validate ID B1:B50 --type number --min 0 --max 100',
    'uni gsheets validate ID C1:C100 --type number --operator gt --min 0',
    'uni gsheets validate ID D1:D50 --type date --date-op after --date 2024-01-01',
    'uni gsheets validate ID E1:E100 --type checkbox',
    'uni gsheets validate ID F1:F50 --type custom --formula "=LEN(F1)<=100"',
    'uni gsheets validate ID A1:A100 --clear',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rangeDef = args.range as string;
    const sheetName = flags.sheet as string | undefined;
    const clearValidation = flags.clear as boolean;
    const validationType = flags.type as string | undefined;
    const values = flags.values as string | undefined;
    const min = flags.min as string | undefined;
    const max = flags.max as string | undefined;
    const operator = flags.operator as string | undefined;
    const date = flags.date as string | undefined;
    const date2 = flags.date2 as string | undefined;
    const dateOp = flags['date-op'] as string | undefined;
    const formula = flags.formula as string | undefined;
    const message = flags.message as string | undefined;
    const strict = flags.strict !== false;
    const noDropdown = flags['no-dropdown'] as boolean;

    const spinner = output.spinner(clearValidation ? 'Clearing validation...' : 'Setting validation...');

    try {
      // Parse range
      const parsed = parseRange(rangeDef);
      if (!parsed) {
        spinner.fail(`Invalid range format: ${rangeDef}`);
        return;
      }

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

      const range = {
        sheetId: targetSheet.properties.sheetId,
        startRowIndex: parsed.startRow,
        endRowIndex: parsed.endRow,
        startColumnIndex: parsed.startCol,
        endColumnIndex: parsed.endCol,
      };

      if (clearValidation) {
        await gsheets.setDataValidation(spreadsheetId, range, null);
        spinner.success(`Cleared validation from ${rangeDef}`);

        if (globalFlags.json) {
          output.json({ cleared: rangeDef });
        }
        return;
      }

      if (!validationType) {
        spinner.fail('--type is required. Options: list, number, date, checkbox, text, custom');
        return;
      }

      // Build rule based on type
      let rule: Parameters<typeof gsheets.setDataValidation>[2];

      switch (validationType) {
        case 'list':
          if (!values) {
            spinner.fail('--values is required for list validation');
            return;
          }
          rule = {
            type: 'list',
            values: values.split(',').map(v => v.trim()),
            strict,
            showDropdown: !noDropdown,
            inputMessage: message,
          };
          break;

        case 'number':
          rule = {
            type: 'number',
            min: min !== undefined ? parseFloat(min) : undefined,
            max: max !== undefined ? parseFloat(max) : undefined,
            operator: operator as 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne' | 'between' | undefined,
            strict,
            inputMessage: message,
          };
          break;

        case 'date':
          rule = {
            type: 'date',
            date,
            date2,
            dateOperator: dateOp as 'before' | 'after' | 'on' | 'between' | undefined,
            strict,
            inputMessage: message,
          };
          break;

        case 'checkbox':
          rule = {
            type: 'checkbox',
            strict,
            inputMessage: message,
          };
          break;

        case 'text':
          rule = {
            type: 'text',
            strict,
            inputMessage: message,
          };
          break;

        case 'custom':
          if (!formula) {
            spinner.fail('--formula is required for custom validation');
            return;
          }
          rule = {
            type: 'custom',
            formula,
            strict,
            inputMessage: message,
          };
          break;

        default:
          spinner.fail(`Unknown validation type: ${validationType}`);
          return;
      }

      await gsheets.setDataValidation(spreadsheetId, range, rule);
      spinner.success(`Set ${validationType} validation on ${rangeDef}`);

      if (globalFlags.json) {
        output.json({
          range: rangeDef,
          type: validationType,
          rule,
        });
      }

    } catch (error) {
      spinner.fail('Failed to set validation');
      throw error;
    }
  },
};
