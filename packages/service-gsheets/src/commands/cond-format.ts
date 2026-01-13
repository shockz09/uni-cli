/**
 * uni gsheets cond-format - Conditional formatting
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

const COLOR_MAP: Record<string, { red: number; green: number; blue: number }> = {
  red: { red: 0.95, green: 0.2, blue: 0.2 },
  green: { red: 0.2, green: 0.8, blue: 0.2 },
  blue: { red: 0.2, green: 0.4, blue: 0.9 },
  yellow: { red: 1, green: 0.9, blue: 0.2 },
  orange: { red: 1, green: 0.6, blue: 0.2 },
  purple: { red: 0.6, green: 0.2, blue: 0.8 },
  pink: { red: 0.95, green: 0.4, blue: 0.6 },
  gray: { red: 0.7, green: 0.7, blue: 0.7 },
  white: { red: 1, green: 1, blue: 1 },
};

export const condFormatCommand: Command = {
  name: 'cond-format',
  description: 'Apply conditional formatting to cells',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Range to format (e.g., B2:B100)', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
    { name: 'type', short: 't', type: 'string', description: 'Rule type: gt, lt, eq, ne, empty, not-empty, contains, between (default: gt)' },
    { name: 'value', short: 'v', type: 'string', description: 'Value to compare (required for most types)' },
    { name: 'value2', type: 'string', description: 'Second value (for "between" type)' },
    { name: 'bg', type: 'string', description: 'Background color: red, green, blue, yellow, orange, purple, pink, gray' },
    { name: 'color', type: 'string', description: 'Text color: red, green, blue, yellow, orange, purple, pink, white' },
    { name: 'bold', type: 'boolean', description: 'Make text bold' },
  ],
  examples: [
    'uni gsheets cond-format ID B2:B100 --type gt --value 100 --bg green',
    'uni gsheets cond-format ID C2:C50 --type lt --value 0 --bg red --bold',
    'uni gsheets cond-format ID A1:A100 --type empty --bg yellow',
    'uni gsheets cond-format ID D1:D50 --type contains --value "error" --bg red --color white',
    'uni gsheets cond-format ID E2:E100 --type between --value 10 --value2 50 --bg blue',
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
    const ruleType = (flags.type as string) || 'gt';
    const value = flags.value as string | undefined;
    const value2 = flags.value2 as string | undefined;
    const bgColor = flags.bg as string | undefined;
    const textColor = flags.color as string | undefined;
    const makeBold = flags.bold as boolean;

    // Validate rule type
    const validTypes = ['gt', 'lt', 'eq', 'ne', 'empty', 'not-empty', 'contains', 'between'];
    if (!validTypes.includes(ruleType)) {
      output.error(`Invalid type: ${ruleType}. Use: ${validTypes.join(', ')}`);
      return;
    }

    // Validate colors
    if (bgColor && !COLOR_MAP[bgColor]) {
      output.error(`Invalid background color: ${bgColor}. Use: ${Object.keys(COLOR_MAP).join(', ')}`);
      return;
    }
    if (textColor && !COLOR_MAP[textColor]) {
      output.error(`Invalid text color: ${textColor}. Use: ${Object.keys(COLOR_MAP).join(', ')}`);
      return;
    }

    // Validate value for certain types
    if (['gt', 'lt', 'eq', 'ne', 'contains'].includes(ruleType) && value === undefined) {
      output.error(`--value is required for type "${ruleType}"`);
      return;
    }
    if (ruleType === 'between' && (value === undefined || value2 === undefined)) {
      output.error('--value and --value2 are required for type "between"');
      return;
    }

    const spinner = output.spinner('Applying conditional formatting...');

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

      // Parse range
      const cellPart = rangeStr.includes('!') ? rangeStr.split('!')[1] : rangeStr;
      const match = cellPart.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
      if (!match) {
        spinner.fail(`Invalid range: ${rangeStr}`);
        return;
      }

      const colToIndex = (col: string) => col.split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
      const range = {
        sheetId: targetSheet.properties.sheetId,
        startRowIndex: parseInt(match[2], 10) - 1,
        endRowIndex: parseInt(match[4], 10),
        startColumnIndex: colToIndex(match[1].toUpperCase()),
        endColumnIndex: colToIndex(match[3].toUpperCase()) + 1,
      };

      await gsheets.addConditionalFormat(
        spreadsheetId,
        range,
        ruleType,
        value,
        value2,
        bgColor ? COLOR_MAP[bgColor] : undefined,
        textColor ? COLOR_MAP[textColor] : undefined,
        makeBold
      );

      spinner.success('Conditional formatting applied');

      if (globalFlags.json) {
        output.json({
          spreadsheetId,
          range: rangeStr,
          type: ruleType,
          value,
          value2,
          bgColor,
          textColor,
          bold: makeBold,
        });
        return;
      }

      if (!output.isPiped()) {
        console.log('');
        console.log(`${c.green('Applied:')} ${ruleType} rule to ${rangeStr}`);
        if (bgColor) console.log(`${c.green('Background:')} ${bgColor}`);
        if (textColor) console.log(`${c.green('Text color:')} ${textColor}`);
        if (makeBold) console.log(`${c.green('Style:')} bold`);
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to apply conditional formatting');
      throw error;
    }
  },
};
