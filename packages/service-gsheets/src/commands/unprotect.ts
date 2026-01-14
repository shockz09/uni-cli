/**
 * uni gsheets unprotect - Remove protected range
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

export const unprotectCommand: Command = {
  name: 'unprotect',
  description: 'Remove protection from a range',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'protectedRangeId', description: 'Protected range ID to remove (not needed with --list)', required: false },
  ],
  options: [
    { name: 'list', short: 'l', type: 'boolean', description: 'List all protected ranges instead' },
  ],
  examples: [
    'uni gsheets unprotect ID --list',
    'uni gsheets unprotect ID 123456',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const listOnly = flags.list as boolean;

    if (listOnly) {
      const spinner = output.spinner('Fetching protected ranges...');
      try {
        const spreadsheet = await gsheets.getSpreadsheet(spreadsheetId);
        const protectedRanges: Array<{
          id: number;
          sheetTitle: string;
          description?: string;
          range?: string;
        }> = [];

        for (const sheet of spreadsheet.sheets || []) {
          for (const pr of sheet.protectedRanges || []) {
            const range = pr.range;
            let rangeStr = '';
            if (range) {
              const colToLetter = (idx: number) => {
                let letter = '';
                idx++;
                while (idx > 0) {
                  idx--;
                  letter = String.fromCharCode(65 + (idx % 26)) + letter;
                  idx = Math.floor(idx / 26);
                }
                return letter;
              };
              if (range.startColumnIndex !== undefined && range.startRowIndex !== undefined) {
                rangeStr = `${colToLetter(range.startColumnIndex)}${range.startRowIndex + 1}`;
                if (range.endColumnIndex !== undefined && range.endRowIndex !== undefined) {
                  rangeStr += `:${colToLetter(range.endColumnIndex - 1)}${range.endRowIndex}`;
                }
              }
            }
            protectedRanges.push({
              id: pr.protectedRangeId,
              sheetTitle: sheet.properties.title,
              description: pr.description,
              range: rangeStr || undefined,
            });
          }
        }

        spinner.stop();

        if (protectedRanges.length === 0) {
          output.text('No protected ranges found');
        } else {
          if (globalFlags.json) {
            output.json(protectedRanges);
          } else {
            output.text(c.bold('Protected Ranges:\n'));
            for (const pr of protectedRanges) {
              output.text(`  ${c.cyan(pr.id.toString())} - ${pr.sheetTitle}${pr.range ? ` (${pr.range})` : ''}${pr.description ? ` - ${pr.description}` : ''}`);
            }
          }
        }
      } catch (error) {
        spinner.fail('Failed to list protected ranges');
        throw error;
      }
      return;
    }

    if (!args.protectedRangeId) {
      output.error('Protected range ID is required. Use --list to see IDs.');
      return;
    }

    const protectedRangeId = parseInt(args.protectedRangeId as string, 10);
    if (isNaN(protectedRangeId)) {
      output.error('Protected range ID must be a number. Use --list to see IDs.');
      return;
    }

    const spinner = output.spinner('Removing protection...');

    try {
      await gsheets.deleteProtectedRange(spreadsheetId, protectedRangeId);
      spinner.success(`Removed protected range ${protectedRangeId}`);

      if (globalFlags.json) {
        output.json({ protectedRangeId, removed: true });
      }

    } catch (error) {
      spinner.fail('Failed to remove protection');
      throw error;
    }
  },
};
