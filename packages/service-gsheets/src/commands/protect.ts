/**
 * uni gsheets protect - Protect sheets or ranges
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

export const protectCommand: Command = {
  name: 'protect',
  description: 'Protect a sheet or range from editing',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name to protect (default: first sheet)' },
    { name: 'range', short: 'r', type: 'string', description: 'Range to protect (protects entire sheet if not specified)' },
    { name: 'description', short: 'd', type: 'string', description: 'Description for the protection' },
    { name: 'warning', short: 'w', type: 'boolean', description: 'Show warning when editing instead of blocking' },
    { name: 'list', short: 'l', type: 'boolean', description: 'List existing protections' },
  ],
  examples: [
    'uni gsheets protect ID --sheet "Data"',
    'uni gsheets protect ID --range A1:B10 --description "Header row"',
    'uni gsheets protect ID --sheet "Summary" --warning',
    'uni gsheets protect ID --list',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const sheetName = flags.sheet as string | undefined;
    const rangeStr = flags.range as string | undefined;
    const description = flags.description as string | undefined;
    const warningOnly = flags.warning as boolean;
    const listProtections = flags.list as boolean;

    const spinner = output.spinner(listProtections ? 'Fetching protections...' : 'Adding protection...');

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

      if (listProtections) {
        const protections = await gsheets.listProtections(spreadsheetId);
        spinner.stop();

        if (globalFlags.json) {
          output.json({ spreadsheetId, protections });
          return;
        }

        console.log('');
        if (protections.length === 0) {
          console.log(c.dim('No protections found.'));
        } else {
          console.log(c.bold(`Protections (${protections.length}):`));
          console.log('');
          for (const p of protections) {
            console.log(`  ${c.cyan(`ID: ${p.protectedRangeId}`)}`);
            if (p.description) console.log(`    Description: ${p.description}`);
            console.log(`    Type: ${p.range ? 'Range' : 'Sheet'}`);
            console.log(`    Warning only: ${p.warningOnly ? 'Yes' : 'No'}`);
            console.log('');
          }
        }
        return;
      }

      // Parse range if provided
      let range: {
        sheetId: number;
        startRowIndex?: number;
        endRowIndex?: number;
        startColumnIndex?: number;
        endColumnIndex?: number;
      } | undefined;

      if (rangeStr) {
        const cellPart = rangeStr.includes('!') ? rangeStr.split('!')[1] : rangeStr;
        const match = cellPart.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
        if (!match) {
          spinner.fail(`Invalid range: ${rangeStr}`);
          return;
        }

        const colToIndex = (col: string) => col.split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
        range = {
          sheetId: targetSheet.properties.sheetId,
          startRowIndex: parseInt(match[2], 10) - 1,
          endRowIndex: parseInt(match[4], 10),
          startColumnIndex: colToIndex(match[1].toUpperCase()),
          endColumnIndex: colToIndex(match[3].toUpperCase()) + 1,
        };
      }

      await gsheets.addProtection(
        spreadsheetId,
        targetSheet.properties.sheetId,
        range,
        description,
        warningOnly
      );

      spinner.success(`Protected ${rangeStr || targetSheet.properties.title}`);

      if (globalFlags.json) {
        output.json({
          spreadsheetId,
          sheet: targetSheet.properties.title,
          range: rangeStr || 'entire sheet',
          description,
          warningOnly,
        });
        return;
      }

      if (!output.isPiped()) {
        console.log('');
        console.log(`${c.green('Protected:')} ${rangeStr || targetSheet.properties.title}`);
        if (description) console.log(`${c.green('Description:')} ${description}`);
        console.log(`${c.green('Mode:')} ${warningOnly ? 'Warning only' : 'Blocked'}`);
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to manage protection');
      throw error;
    }
  },
};
