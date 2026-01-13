/**
 * uni gsheets merge - Merge or unmerge cells
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

export const mergeCommand: Command = {
  name: 'merge',
  description: 'Merge or unmerge cells',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Range to merge (e.g., A1:C1)', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
    { name: 'unmerge', short: 'u', type: 'boolean', description: 'Unmerge cells instead of merging' },
    { name: 'type', short: 't', type: 'string', description: 'Merge type: all, horizontal, vertical (default: all)' },
  ],
  examples: [
    'uni gsheets merge ID A1:C1',
    'uni gsheets merge ID A1:A5 --type vertical',
    'uni gsheets merge ID B2:D2 --type horizontal',
    'uni gsheets merge ID A1:C3 --unmerge',
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
    const unmerge = flags.unmerge as boolean;
    const mergeType = (flags.type as string) || 'all';

    // Validate merge type
    const validTypes = ['all', 'horizontal', 'vertical'];
    if (!validTypes.includes(mergeType)) {
      output.error(`Invalid type: ${mergeType}. Use: ${validTypes.join(', ')}`);
      return;
    }

    const spinner = output.spinner(unmerge ? 'Unmerging cells...' : 'Merging cells...');

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

      if (unmerge) {
        await gsheets.unmergeCells(spreadsheetId, range);
      } else {
        await gsheets.mergeCells(spreadsheetId, range, mergeType);
      }

      spinner.success(unmerge ? `Unmerged ${rangeStr}` : `Merged ${rangeStr}`);

      if (globalFlags.json) {
        output.json({
          spreadsheetId,
          range: rangeStr,
          action: unmerge ? 'unmerge' : 'merge',
          type: unmerge ? null : mergeType,
        });
        return;
      }

      if (!output.isPiped()) {
        console.log('');
        console.log(`${c.green(unmerge ? 'Unmerged:' : 'Merged:')} ${rangeStr}`);
        console.log('');
      }
    } catch (error) {
      spinner.fail(unmerge ? 'Failed to unmerge cells' : 'Failed to merge cells');
      throw error;
    }
  },
};
