/**
 * uni gsheets group - Manage row/column groups (collapsible sections)
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

/**
 * Parse column range like "A:D" or "A" to indices (0-indexed)
 */
function parseColRange(colRange: string): { start: number; end: number } | null {
  const colToIndex = (col: string) =>
    col.split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;

  // Range format: A:D
  const rangeMatch = colRange.match(/^([A-Z]+):([A-Z]+)$/i);
  if (rangeMatch) {
    return {
      start: colToIndex(rangeMatch[1].toUpperCase()),
      end: colToIndex(rangeMatch[2].toUpperCase()) + 1,
    };
  }

  // Single column: A
  const singleMatch = colRange.match(/^([A-Z]+)$/i);
  if (singleMatch) {
    const idx = colToIndex(singleMatch[1].toUpperCase());
    return { start: idx, end: idx + 1 };
  }

  return null;
}

/**
 * Parse row range like "1:10" or "5" to indices (0-indexed)
 */
function parseRowRange(rowRange: string): { start: number; end: number } | null {
  // Range format: 1:10
  const rangeMatch = rowRange.match(/^(\d+):(\d+)$/);
  if (rangeMatch) {
    return {
      start: parseInt(rangeMatch[1], 10) - 1,
      end: parseInt(rangeMatch[2], 10),
    };
  }

  // Single row: 5
  const singleMatch = rowRange.match(/^(\d+)$/);
  if (singleMatch) {
    const idx = parseInt(singleMatch[1], 10) - 1;
    return { start: idx, end: idx + 1 };
  }

  return null;
}

function colToLetter(col: number): string {
  let letter = '';
  let temp = col;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export const groupCommand: Command = {
  name: 'group',
  description: 'Create collapsible row/column groups',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
  ],
  options: [
    { name: 'rows', short: 'r', type: 'string', description: 'Row range to group (e.g., 5:10)' },
    { name: 'cols', short: 'c', type: 'string', description: 'Column range to group (e.g., B:D)' },
    { name: 'ungroup', short: 'u', type: 'boolean', description: 'Remove group instead of creating' },
    { name: 'collapse', type: 'boolean', description: 'Collapse the group' },
    { name: 'expand', type: 'boolean', description: 'Expand the group' },
    { name: 'list', short: 'l', type: 'boolean', description: 'List all groups' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets group ID --rows 5:10',
    'uni gsheets group ID --cols B:D',
    'uni gsheets group ID --rows 5:10 --ungroup',
    'uni gsheets group ID --rows 5:10 --collapse',
    'uni gsheets group ID --rows 5:10 --expand',
    'uni gsheets group ID --list',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rowRange = flags.rows as string | undefined;
    const colRange = flags.cols as string | undefined;
    const ungroup = flags.ungroup as boolean;
    const collapse = flags.collapse as boolean;
    const expand = flags.expand as boolean;
    const list = flags.list as boolean;
    const sheetName = flags.sheet as string | undefined;

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
        output.error(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      const sheetId = targetSheet.properties.sheetId;

      // List groups
      if (list) {
        const spinner = output.spinner('Fetching groups...');
        const groups = await gsheets.listDimensionGroups(spreadsheetId, sheetId);
        spinner.stop();

        if (globalFlags.json) {
          output.json(groups);
          return;
        }

        console.log('');
        console.log(c.bold('Row Groups:'));
        if (groups.rowGroups.length === 0) {
          console.log(c.dim('  None'));
        } else {
          for (const g of groups.rowGroups) {
            const status = g.collapsed ? c.dim('(collapsed)') : c.green('(expanded)');
            console.log(`  Rows ${g.startIndex + 1}:${g.endIndex} ${status} [depth: ${g.depth}]`);
          }
        }

        console.log('');
        console.log(c.bold('Column Groups:'));
        if (groups.columnGroups.length === 0) {
          console.log(c.dim('  None'));
        } else {
          for (const g of groups.columnGroups) {
            const status = g.collapsed ? c.dim('(collapsed)') : c.green('(expanded)');
            console.log(`  Cols ${colToLetter(g.startIndex)}:${colToLetter(g.endIndex - 1)} ${status} [depth: ${g.depth}]`);
          }
        }
        console.log('');
        return;
      }

      if (!rowRange && !colRange) {
        output.error('Specify --rows or --cols to group, or use --list to see existing groups');
        return;
      }

      // Handle row groups
      if (rowRange) {
        const parsed = parseRowRange(rowRange);
        if (!parsed) {
          output.error(`Invalid row range: ${rowRange}. Use format like 5:10`);
          return;
        }

        if (collapse || expand) {
          const spinner = output.spinner(`${collapse ? 'Collapsing' : 'Expanding'} row group...`);
          await gsheets.updateDimensionGroup(spreadsheetId, sheetId, 'ROWS', parsed.start, parsed.end, collapse);
          spinner.success(`${collapse ? 'Collapsed' : 'Expanded'} rows ${rowRange}`);
        } else if (ungroup) {
          const spinner = output.spinner(`Removing row group ${rowRange}...`);
          await gsheets.deleteDimensionGroup(spreadsheetId, sheetId, 'ROWS', parsed.start, parsed.end);
          spinner.success(`Removed row group ${rowRange}`);
        } else {
          const spinner = output.spinner(`Creating row group ${rowRange}...`);
          await gsheets.addDimensionGroup(spreadsheetId, sheetId, 'ROWS', parsed.start, parsed.end);
          spinner.success(`Created row group ${rowRange}`);
        }

        if (globalFlags.json) {
          output.json({ type: 'rows', range: rowRange, action: ungroup ? 'ungroup' : (collapse ? 'collapse' : (expand ? 'expand' : 'group')) });
        }
      }

      // Handle column groups
      if (colRange) {
        const parsed = parseColRange(colRange);
        if (!parsed) {
          output.error(`Invalid column range: ${colRange}. Use format like B:D`);
          return;
        }

        if (collapse || expand) {
          const spinner = output.spinner(`${collapse ? 'Collapsing' : 'Expanding'} column group...`);
          await gsheets.updateDimensionGroup(spreadsheetId, sheetId, 'COLUMNS', parsed.start, parsed.end, collapse);
          spinner.success(`${collapse ? 'Collapsed' : 'Expanded'} columns ${colRange}`);
        } else if (ungroup) {
          const spinner = output.spinner(`Removing column group ${colRange}...`);
          await gsheets.deleteDimensionGroup(spreadsheetId, sheetId, 'COLUMNS', parsed.start, parsed.end);
          spinner.success(`Removed column group ${colRange}`);
        } else {
          const spinner = output.spinner(`Creating column group ${colRange}...`);
          await gsheets.addDimensionGroup(spreadsheetId, sheetId, 'COLUMNS', parsed.start, parsed.end);
          spinner.success(`Created column group ${colRange}`);
        }

        if (globalFlags.json) {
          output.json({ type: 'cols', range: colRange, action: ungroup ? 'ungroup' : (collapse ? 'collapse' : (expand ? 'expand' : 'group')) });
        }
      }

    } catch (error) {
      output.error('Failed to manage groups');
      throw error;
    }
  },
};
