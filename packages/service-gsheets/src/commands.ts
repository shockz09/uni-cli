/**
 * Google Sheets Commands
 * Consolidated from 53 command files
 */

import * as fs from 'node:fs';
import type { Command, CommandContext } from '@uni/shared';
import { c, createGoogleAuthCommand } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from './api';

// ============================================================
// Auth Command
// ============================================================
export const authCommand = createGoogleAuthCommand({
  serviceName: 'Sheets',
  serviceKey: 'gsheets',
  client: gsheets,
});

// ============================================================
// Shared Helper Functions
// ============================================================

/**
 * Parse cell reference to grid coordinates (0-indexed)
 * Handles both single cell (A1) and range (A1:B5) formats
 */
function parseRange(ref: string): {
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
  isRange?: boolean;
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
      isRange: true,
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
      isRange: false,
    };
  }

  return null;
}

/**
 * Parse single cell reference to coordinates (0-indexed)
 */
function parseCell(ref: string): { row: number; col: number } | null {
  const colToIndex = (col: string) =>
    col.split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;

  const match = ref.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;

  return {
    col: colToIndex(match[1].toUpperCase()),
    row: parseInt(match[2], 10) - 1,
  };
}

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

/**
 * Parse color from name or hex
 */
function parseColor(color: string): { red: number; green: number; blue: number } {
  const colors: Record<string, { red: number; green: number; blue: number }> = {
    black: { red: 0, green: 0, blue: 0 },
    white: { red: 1, green: 1, blue: 1 },
    red: { red: 0.96, green: 0.26, blue: 0.21 },
    green: { red: 0.26, green: 0.65, blue: 0.45 },
    blue: { red: 0.26, green: 0.52, blue: 0.96 },
    yellow: { red: 1, green: 0.92, blue: 0.23 },
    orange: { red: 1, green: 0.6, blue: 0 },
    purple: { red: 0.61, green: 0.15, blue: 0.69 },
    gray: { red: 0.62, green: 0.62, blue: 0.62 },
    grey: { red: 0.62, green: 0.62, blue: 0.62 },
    cyan: { red: 0, green: 0.74, blue: 0.83 },
    pink: { red: 0.91, green: 0.12, blue: 0.39 },
    lightgray: { red: 0.9, green: 0.9, blue: 0.9 },
    lightblue: { red: 0.8, green: 0.9, blue: 1 },
    lightgreen: { red: 0.8, green: 1, blue: 0.8 },
    lightyellow: { red: 1, green: 1, blue: 0.8 },
  };

  const lower = color.toLowerCase();
  if (colors[lower]) return colors[lower];

  // Try hex color
  const hex = color.replace('#', '');
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return {
      red: parseInt(hex.slice(0, 2), 16) / 255,
      green: parseInt(hex.slice(2, 4), 16) / 255,
      blue: parseInt(hex.slice(4, 6), 16) / 255,
    };
  }

  return { red: 0, green: 0, blue: 0 };
}

/**
 * Get target sheet from spreadsheet, with sorting by index
 */
async function getTargetSheet(spreadsheetId: string, sheetName?: string) {
  const spreadsheet = await gsheets.getSpreadsheet(spreadsheetId);
  const sheets = [...(spreadsheet.sheets || [])].sort((a, b) => {
    const indexA = a.properties.index ?? (a.properties.sheetId === 0 ? 0 : 999);
    const indexB = b.properties.index ?? (b.properties.sheetId === 0 ? 0 : 999);
    return indexA - indexB;
  });
  const targetSheet = sheetName
    ? sheets.find(s => s.properties.title.toLowerCase() === sheetName.toLowerCase())
    : sheets[0];
  return { spreadsheet, sheets, targetSheet };
}

/**
 * Parse CSV/TSV content into 2D array
 */
function parseDelimited(content: string, delimiter: string = ','): string[][] {
  const rows: string[][] = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;

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

// Color map for conditional formatting
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

// ============================================================
// CRUD Commands
// ============================================================

const createCommand: Command = {
  name: 'create',
  description: 'Create a new Google Spreadsheet',
  args: [
    { name: 'title', description: 'Spreadsheet title', required: true },
  ],
  options: [
    { name: 'sheets', short: 's', type: 'string', description: 'Comma-separated sheet names (default: "Sheet1")' },
  ],
  examples: [
    'uni gsheets create "My Spreadsheet"',
    'uni gsheets create "Budget" --sheets "Income,Expenses,Summary"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const title = args.title as string;
    const sheetsArg = flags.sheets as string | undefined;
    const sheetNames = sheetsArg ? sheetsArg.split(',').map(s => s.trim()) : ['Sheet1'];

    const spinner = output.spinner('Creating spreadsheet...');

    try {
      const result = await gsheets.createSpreadsheet(title, sheetNames);

      output.pipe(result.spreadsheetId);
      spinner.success(`Created spreadsheet: ${title}`);

      if (globalFlags.json) {
        output.json(result);
        return;
      }

      if (!output.isPiped()) {
        console.log(`${c.green('ID:')} ${result.spreadsheetId}`);
        console.log(`${c.green('URL:')} ${result.spreadsheetUrl}`);
      }
    } catch (error) {
      spinner.fail('Failed to create spreadsheet');
      throw error;
    }
  },
};

const listCommand: Command = {
  name: 'list',
  description: 'List Google Spreadsheets',
  args: [],
  options: [
    { name: 'limit', short: 'n', type: 'string', description: 'Max results (default: 20)' },
    { name: 'query', short: 'q', type: 'string', description: 'Search query' },
  ],
  examples: [
    'uni gsheets list',
    'uni gsheets list --limit 50',
    'uni gsheets list --query "budget"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const limit = parseInt(flags.limit as string || '20', 10);
    const query = flags.query as string | undefined;

    const spinner = output.spinner('Fetching spreadsheets...');

    try {
      const files = await gsheets.listSpreadsheets(limit, query);
      spinner.success(`Found ${files.length} spreadsheet(s)`);

      if (globalFlags.json) {
        output.json({ spreadsheets: files });
        return;
      }

      if (files.length === 0) {
        if (!output.isPiped()) {
          console.log(c.dim('No spreadsheets found.'));
        }
        return;
      }

      if (output.isPiped()) {
        for (const file of files) {
          output.pipe(file.id);
        }
      } else {
        console.log('');
        for (const file of files) {
          const modified = file.modifiedTime
            ? new Date(file.modifiedTime).toLocaleDateString()
            : 'unknown';
          console.log(`${c.green(file.id)}  ${file.name}  ${c.dim(modified)}`);
        }
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to list spreadsheets');
      throw error;
    }
  },
};

const getCommand: Command = {
  name: 'get',
  description: 'Get data from a spreadsheet range',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
  ],
  options: [
    { name: 'range', short: 'r', type: 'string', description: 'Range in A1 notation (e.g., A1:D10)' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name' },
  ],
  examples: [
    'uni gsheets get 1abc123XYZ',
    'uni gsheets get 1abc123XYZ --range A1:D10',
    'uni gsheets get 1abc123XYZ --sheet "Sales" --range B2:E20',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rangeArg = flags.range as string | undefined;
    const sheetName = flags.sheet as string | undefined;

    const spinner = output.spinner('Fetching data...');

    try {
      const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);

      if (!targetSheet) {
        spinner.fail(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      const range = rangeArg
        ? (rangeArg.includes('!') ? rangeArg : `${targetSheet.properties.title}!${rangeArg}`)
        : `${targetSheet.properties.title}!A1:ZZ10000`;

      const values = await gsheets.getValues(spreadsheetId, range);

      spinner.success(`Fetched ${values.length} row(s)`);

      if (globalFlags.json) {
        output.json({ spreadsheetId, range, values });
        return;
      }

      if (values.length === 0) {
        if (!output.isPiped()) {
          console.log(c.dim('No data in range.'));
        }
        return;
      }

      if (output.isPiped()) {
        for (const row of values) {
          output.pipe(row.join('\t'));
        }
      } else {
        console.log('');
        for (const row of values) {
          console.log(row.map(cell => cell || '').join('\t'));
        }
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to fetch data');
      throw error;
    }
  },
};

const setCommand: Command = {
  name: 'set',
  description: 'Set data in a spreadsheet range',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Range in A1 notation (e.g., A1)', required: true },
    { name: 'values', description: 'Values (comma-separated for row, semicolon for rows)', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name' },
    { name: 'raw', short: 'r', type: 'boolean', description: 'Input values as raw (no parsing)' },
  ],
  examples: [
    'uni gsheets set ID A1 "Hello"',
    'uni gsheets set ID A1:C1 "A,B,C"',
    'uni gsheets set ID A1:B2 "A,B;C,D"',
    'uni gsheets set ID --sheet "Data" B2 "Value"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rangeArg = args.range as string;
    const valuesArg = args.values as string;
    const sheetName = flags.sheet as string | undefined;
    const rawInput = flags.raw as boolean;

    const spinner = output.spinner('Setting data...');

    try {
      const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);

      if (!targetSheet) {
        spinner.fail(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      const range = rangeArg.includes('!')
        ? rangeArg
        : `${targetSheet.properties.title}!${rangeArg}`;

      // Parse values
      let values: string[][];
      if (rawInput) {
        values = [[valuesArg]];
      } else {
        values = valuesArg.split(';').map(row => row.split(',').map(v => v.trim()));
      }

      await gsheets.setValues(spreadsheetId, range, values);

      const cellCount = values.reduce((sum, row) => sum + row.length, 0);
      spinner.success(`Updated ${cellCount} cell(s)`);

      if (globalFlags.json) {
        output.json({ spreadsheetId, range, cellCount });
      }
    } catch (error) {
      spinner.fail('Failed to set data');
      throw error;
    }
  },
};

const deleteCommand: Command = {
  name: 'delete',
  description: 'Delete a spreadsheet',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
  ],
  options: [
    { name: 'force', short: 'f', type: 'boolean', description: 'Skip confirmation' },
  ],
  examples: [
    'uni gsheets delete 1abc123XYZ',
    'uni gsheets delete 1abc123XYZ --force',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);

    if (!flags.force && !output.isPiped()) {
      console.log(`${c.yellow('Warning:')} This will permanently delete the spreadsheet.`);
      console.log(c.dim('Use --force to skip this warning.'));
    }

    const spinner = output.spinner('Deleting spreadsheet...');

    try {
      await gsheets.deleteSpreadsheet(spreadsheetId);
      spinner.success('Spreadsheet deleted');

      if (globalFlags.json) {
        output.json({ spreadsheetId, deleted: true });
      }
    } catch (error) {
      spinner.fail('Failed to delete spreadsheet');
      throw error;
    }
  },
};

const renameCommand: Command = {
  name: 'rename',
  description: 'Rename a spreadsheet',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'title', description: 'New title', required: true },
  ],
  options: [],
  examples: [
    'uni gsheets rename 1abc123XYZ "New Title"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const newTitle = args.title as string;

    const spinner = output.spinner('Renaming spreadsheet...');

    try {
      await gsheets.renameSpreadsheet(spreadsheetId, newTitle);
      spinner.success(`Renamed to "${newTitle}"`);

      if (globalFlags.json) {
        output.json({ spreadsheetId, title: newTitle });
      }
    } catch (error) {
      spinner.fail('Failed to rename spreadsheet');
      throw error;
    }
  },
};

const copyCommand: Command = {
  name: 'copy',
  description: 'Copy a spreadsheet',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL to copy', required: true },
  ],
  options: [
    { name: 'title', short: 't', type: 'string', description: 'Title for the copy' },
  ],
  examples: [
    'uni gsheets copy 1abc123XYZ',
    'uni gsheets copy 1abc123XYZ --title "Copy of Budget"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const title = flags.title as string | undefined;

    const spinner = output.spinner('Copying spreadsheet...');

    try {
      const result = await gsheets.copySpreadsheet(spreadsheetId, title);

      output.pipe(result.id);
      spinner.success(`Created copy: ${result.name}`);

      if (globalFlags.json) {
        output.json(result);
        return;
      }

      if (!output.isPiped()) {
        console.log(`${c.green('ID:')} ${result.id}`);
        console.log(`${c.green('Name:')} ${result.name}`);
      }
    } catch (error) {
      spinner.fail('Failed to copy spreadsheet');
      throw error;
    }
  },
};

const shareCommand: Command = {
  name: 'share',
  description: 'Share a spreadsheet with users or make it public',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'email', description: 'Email address to share with (not needed with --public)', required: false },
  ],
  options: [
    { name: 'role', short: 'r', type: 'string', description: 'Role: reader, writer, commenter (default: reader)' },
    { name: 'notify', short: 'n', type: 'boolean', description: 'Send notification email' },
    { name: 'public', short: 'p', type: 'boolean', description: 'Make publicly accessible (anyone with link)' },
  ],
  examples: [
    'uni gsheets share 1abc123XYZ user@example.com',
    'uni gsheets share 1abc123XYZ user@example.com --role writer',
    'uni gsheets share 1abc123XYZ --public',
    'uni gsheets share 1abc123XYZ --public --role writer',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const email = args.email as string | undefined;
    const role = (flags.role as string) || 'reader';
    const notify = flags.notify as boolean;
    const makePublic = flags.public as boolean;

    if (!makePublic && !email) {
      output.error('Specify an email address or use --public to make it publicly accessible');
      return;
    }

    const validRoles = ['reader', 'writer', 'commenter'];
    if (!validRoles.includes(role)) {
      output.error(`Invalid role: ${role}. Use: ${validRoles.join(', ')}`);
      return;
    }

    if (makePublic) {
      if (role === 'commenter') {
        output.error('Public sharing only supports reader or writer roles');
        return;
      }

      const spinner = output.spinner('Making spreadsheet public...');

      try {
        await gsheets.sharePublic(spreadsheetId, role as 'reader' | 'writer');
        const spreadsheet = await gsheets.getSpreadsheet(spreadsheetId);
        spinner.success('Spreadsheet is now publicly accessible');

        if (globalFlags.json) {
          output.json({ spreadsheetId, public: true, role, url: spreadsheet.spreadsheetUrl });
        } else {
          console.log(`${c.green('URL:')} ${spreadsheet.spreadsheetUrl}`);
        }
      } catch (error) {
        spinner.fail('Failed to make spreadsheet public');
        throw error;
      }
      return;
    }

    const spinner = output.spinner(`Sharing with ${email}...`);

    try {
      await gsheets.shareSpreadsheet(spreadsheetId, email!, role as 'reader' | 'writer' | 'commenter', notify);
      spinner.success(`Shared with ${email} as ${role}`);

      if (globalFlags.json) {
        output.json({ spreadsheetId, email, role, notified: notify });
      }
    } catch (error) {
      spinner.fail('Failed to share spreadsheet');
      throw error;
    }
  },
};

const clearCommand: Command = {
  name: 'clear',
  description: 'Clear data from a range',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Range to clear (e.g., A1:D10)', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name' },
  ],
  examples: [
    'uni gsheets clear 1abc123XYZ A1:D10',
    'uni gsheets clear 1abc123XYZ --sheet "Data" A1:Z100',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rangeArg = args.range as string;
    const sheetName = flags.sheet as string | undefined;

    const spinner = output.spinner('Clearing data...');

    try {
      const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);

      if (!targetSheet) {
        spinner.fail(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      const range = rangeArg.includes('!')
        ? rangeArg
        : `${targetSheet.properties.title}!${rangeArg}`;

      await gsheets.clearRange(spreadsheetId, range);
      spinner.success(`Cleared ${range}`);

      if (globalFlags.json) {
        output.json({ spreadsheetId, range, cleared: true });
      }
    } catch (error) {
      spinner.fail('Failed to clear data');
      throw error;
    }
  },
};

const appendCommand: Command = {
  name: 'append',
  description: 'Append rows to a spreadsheet',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'values', description: 'Values (comma-separated for row, semicolon for multiple rows)', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name' },
    { name: 'range', short: 'r', type: 'string', description: 'Range to append after (default: A1)' },
  ],
  examples: [
    'uni gsheets append ID "A,B,C"',
    'uni gsheets append ID "A,B;C,D"',
    'uni gsheets append ID --sheet "Data" "Value1,Value2"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const valuesArg = args.values as string;
    const sheetName = flags.sheet as string | undefined;
    const rangeArg = (flags.range as string) || 'A1';

    const spinner = output.spinner('Appending data...');

    try {
      const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);

      if (!targetSheet) {
        spinner.fail(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      const range = rangeArg.includes('!')
        ? rangeArg
        : `${targetSheet.properties.title}!${rangeArg}`;

      const values = valuesArg.split(';').map(row => row.split(',').map(v => v.trim()));

      await gsheets.appendRows(spreadsheetId, range, values);

      spinner.success(`Appended ${values.length} row(s)`);

      if (globalFlags.json) {
        output.json({ spreadsheetId, range, rowsAdded: values.length });
      }
    } catch (error) {
      spinner.fail('Failed to append data');
      throw error;
    }
  },
};

// ============================================================
// Sheet Management
// ============================================================

const sheetsCommand: Command = {
  name: 'sheets',
  description: 'Manage sheets within a spreadsheet',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
  ],
  options: [
    { name: 'add', short: 'a', type: 'string', description: 'Add a new sheet with this name' },
    { name: 'rename', short: 'r', type: 'string', description: 'Rename a sheet (format: "oldName:newName")' },
    { name: 'delete', short: 'd', type: 'string', description: 'Delete a sheet by name' },
    { name: 'copy', short: 'c', type: 'string', description: 'Copy a sheet (format: "sheetName" or "sheetName:newName")' },
  ],
  examples: [
    'uni gsheets sheets ID',
    'uni gsheets sheets ID --add "New Sheet"',
    'uni gsheets sheets ID --rename "Sheet1:Data"',
    'uni gsheets sheets ID --delete "Old Sheet"',
    'uni gsheets sheets ID --copy "Template:Copy of Template"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const addSheet = flags.add as string | undefined;
    const renameSheet = flags.rename as string | undefined;
    const deleteSheet = flags.delete as string | undefined;
    const copySheet = flags.copy as string | undefined;

    try {
      // Add sheet
      if (addSheet) {
        const spinner = output.spinner(`Adding sheet "${addSheet}"...`);
        const sheetId = await gsheets.addSheet(spreadsheetId, addSheet);
        spinner.success(`Added sheet "${addSheet}"`);

        if (globalFlags.json) {
          output.json({ action: 'add', sheetName: addSheet, sheetId });
        }
        return;
      }

      // Rename sheet
      if (renameSheet) {
        const parts = renameSheet.split(':');
        if (parts.length !== 2) {
          output.error('Rename format: "oldName:newName"');
          return;
        }
        const [oldName, newName] = parts;

        const spinner = output.spinner(`Renaming "${oldName}" to "${newName}"...`);
        const { sheets } = await getTargetSheet(spreadsheetId);
        const sheet = sheets.find(s => s.properties.title.toLowerCase() === oldName.toLowerCase());

        if (!sheet) {
          spinner.fail(`Sheet "${oldName}" not found`);
          return;
        }

        await gsheets.renameSheet(spreadsheetId, sheet.properties.sheetId, newName);
        spinner.success(`Renamed "${oldName}" to "${newName}"`);

        if (globalFlags.json) {
          output.json({ action: 'rename', oldName, newName });
        }
        return;
      }

      // Delete sheet
      if (deleteSheet) {
        const spinner = output.spinner(`Deleting sheet "${deleteSheet}"...`);
        const { sheets } = await getTargetSheet(spreadsheetId);
        const sheet = sheets.find(s => s.properties.title.toLowerCase() === deleteSheet.toLowerCase());

        if (!sheet) {
          spinner.fail(`Sheet "${deleteSheet}" not found`);
          return;
        }

        await gsheets.deleteSheet(spreadsheetId, sheet.properties.sheetId);
        spinner.success(`Deleted sheet "${deleteSheet}"`);

        if (globalFlags.json) {
          output.json({ action: 'delete', sheetName: deleteSheet });
        }
        return;
      }

      // Copy sheet
      if (copySheet) {
        const parts = copySheet.split(':');
        const sourceName = parts[0];
        const destName = parts[1];

        const spinner = output.spinner(`Copying sheet "${sourceName}"...`);
        const { sheets } = await getTargetSheet(spreadsheetId);
        const sheet = sheets.find(s => s.properties.title.toLowerCase() === sourceName.toLowerCase());

        if (!sheet) {
          spinner.fail(`Sheet "${sourceName}" not found`);
          return;
        }

        const newSheetId = await gsheets.copySheet(spreadsheetId, sheet.properties.sheetId, destName);
        spinner.success(`Copied sheet "${sourceName}"`);

        if (globalFlags.json) {
          output.json({ action: 'copy', sourceName, newSheetId });
        }
        return;
      }

      // List sheets (default)
      const spinner = output.spinner('Fetching sheets...');
      const { sheets } = await getTargetSheet(spreadsheetId);
      spinner.success(`Found ${sheets.length} sheet(s)`);

      if (globalFlags.json) {
        output.json({
          spreadsheetId,
          sheets: sheets.map(s => ({
            sheetId: s.properties.sheetId,
            title: s.properties.title,
            index: s.properties.index,
            rowCount: s.properties.gridProperties?.rowCount,
            columnCount: s.properties.gridProperties?.columnCount,
          })),
        });
        return;
      }

      if (output.isPiped()) {
        for (const sheet of sheets) {
          output.pipe(sheet.properties.title);
        }
      } else {
        console.log('');
        for (const sheet of sheets) {
          const grid = sheet.properties.gridProperties;
          const size = grid ? `${grid.rowCount}x${grid.columnCount}` : '';
          console.log(`  ${c.green(sheet.properties.title)} ${c.dim(size)} ${c.dim(`(ID: ${sheet.properties.sheetId})`)}`);
        }
        console.log('');
      }
    } catch (error) {
      output.error('Failed to manage sheets');
      throw error;
    }
  },
};

// ============================================================
// Search & Sort Commands
// ============================================================

const findCommand: Command = {
  name: 'find',
  description: 'Find cells containing a value',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'query', description: 'Text to search for', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: all sheets)' },
    { name: 'case', short: 'c', type: 'boolean', description: 'Case-sensitive search' },
    { name: 'exact', short: 'e', type: 'boolean', description: 'Exact match only' },
  ],
  examples: [
    'uni gsheets find ID "total"',
    'uni gsheets find ID "Total" --case',
    'uni gsheets find ID "100" --exact',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const query = args.query as string;
    const sheetName = flags.sheet as string | undefined;
    const caseSensitive = flags.case as boolean;
    const exactMatch = flags.exact as boolean;

    const spinner = output.spinner(`Searching for "${query}"...`);

    try {
      const { spreadsheet, sheets } = await getTargetSheet(spreadsheetId, sheetName);
      const targetSheets = sheetName
        ? sheets.filter(s => s.properties.title.toLowerCase() === sheetName.toLowerCase())
        : sheets;

      if (targetSheets.length === 0) {
        spinner.fail(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      const matches: Array<{ sheet: string; cell: string; value: string }> = [];

      for (const sheet of targetSheets) {
        const range = `${sheet.properties.title}!A1:ZZ10000`;
        const values = await gsheets.getValues(spreadsheetId, range);

        for (let row = 0; row < values.length; row++) {
          for (let col = 0; col < values[row].length; col++) {
            const cellValue = values[row][col] || '';
            const searchValue = caseSensitive ? cellValue : cellValue.toLowerCase();
            const searchQuery = caseSensitive ? query : query.toLowerCase();

            const found = exactMatch
              ? searchValue === searchQuery
              : searchValue.includes(searchQuery);

            if (found) {
              matches.push({
                sheet: sheet.properties.title,
                cell: `${colToLetter(col)}${row + 1}`,
                value: cellValue,
              });
            }
          }
        }
      }

      spinner.success(`Found ${matches.length} match(es)`);

      if (globalFlags.json) {
        output.json({ query, matches });
        return;
      }

      if (matches.length === 0) {
        if (!output.isPiped()) {
          console.log(c.dim('No matches found.'));
        }
        return;
      }

      if (output.isPiped()) {
        for (const m of matches) {
          output.pipe(`${m.sheet}!${m.cell}`);
        }
      } else {
        console.log('');
        for (const m of matches) {
          console.log(`  ${c.cyan(`${m.sheet}!${m.cell}`)}: ${m.value}`);
        }
        console.log('');
      }
    } catch (error) {
      spinner.fail('Search failed');
      throw error;
    }
  },
};

const sortCommand: Command = {
  name: 'sort',
  description: 'Sort a range by column',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Range to sort (e.g., A1:D100)', required: true },
  ],
  options: [
    { name: 'column', short: 'c', type: 'string', description: 'Column to sort by (0-indexed, default: 0)' },
    { name: 'desc', short: 'd', type: 'boolean', description: 'Sort descending' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name' },
  ],
  examples: [
    'uni gsheets sort ID A1:D100',
    'uni gsheets sort ID A1:D100 --column 2',
    'uni gsheets sort ID A1:D100 --column 0 --desc',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rangeDef = args.range as string;
    const sortColumn = parseInt(flags.column as string || '0', 10);
    const descending = flags.desc as boolean;
    const sheetName = flags.sheet as string | undefined;

    const spinner = output.spinner('Sorting...');

    try {
      const parsed = parseRange(rangeDef);
      if (!parsed) {
        spinner.fail(`Invalid range: ${rangeDef}`);
        return;
      }

      const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);

      if (!targetSheet) {
        spinner.fail(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      await gsheets.sortRange(
        spreadsheetId,
        {
          sheetId: targetSheet.properties.sheetId,
          startRowIndex: parsed.startRow,
          endRowIndex: parsed.endRow,
          startColumnIndex: parsed.startCol,
          endColumnIndex: parsed.endCol,
        },
        sortColumn,
        descending ? 'DESCENDING' : 'ASCENDING'
      );

      spinner.success(`Sorted ${rangeDef} by column ${sortColumn + 1} ${descending ? 'descending' : 'ascending'}`);

      if (globalFlags.json) {
        output.json({ range: rangeDef, sortColumn, descending });
      }
    } catch (error) {
      spinner.fail('Failed to sort');
      throw error;
    }
  },
};

const filterCommand: Command = {
  name: 'filter',
  description: 'Set or clear a basic filter on a range',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
  ],
  options: [
    { name: 'range', short: 'r', type: 'string', description: 'Range for filter (e.g., A1:D100)' },
    { name: 'clear', short: 'c', type: 'boolean', description: 'Clear existing filter' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name' },
  ],
  examples: [
    'uni gsheets filter ID --range A1:D100',
    'uni gsheets filter ID --clear',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rangeDef = flags.range as string | undefined;
    const clearFilter = flags.clear as boolean;
    const sheetName = flags.sheet as string | undefined;

    const spinner = output.spinner(clearFilter ? 'Clearing filter...' : 'Setting filter...');

    try {
      const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);

      if (!targetSheet) {
        spinner.fail(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      if (clearFilter) {
        await gsheets.clearBasicFilter(spreadsheetId, targetSheet.properties.sheetId);
        spinner.success('Filter cleared');

        if (globalFlags.json) {
          output.json({ cleared: true });
        }
        return;
      }

      if (!rangeDef) {
        spinner.fail('--range is required to set a filter');
        return;
      }

      const parsed = parseRange(rangeDef);
      if (!parsed) {
        spinner.fail(`Invalid range: ${rangeDef}`);
        return;
      }

      await gsheets.setBasicFilter(spreadsheetId, {
        sheetId: targetSheet.properties.sheetId,
        startRowIndex: parsed.startRow,
        endRowIndex: parsed.endRow,
        startColumnIndex: parsed.startCol,
        endColumnIndex: parsed.endCol,
      });

      spinner.success(`Set filter on ${rangeDef}`);

      if (globalFlags.json) {
        output.json({ range: rangeDef });
      }
    } catch (error) {
      spinner.fail('Failed to manage filter');
      throw error;
    }
  },
};

const statsCommand: Command = {
  name: 'stats',
  description: 'Get statistics for a numeric range',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Range to analyze (e.g., B2:B100)', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name' },
  ],
  examples: [
    'uni gsheets stats ID B2:B100',
    'uni gsheets stats ID --sheet "Sales" C2:C50',
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

    const spinner = output.spinner('Calculating statistics...');

    try {
      const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);

      if (!targetSheet) {
        spinner.fail(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      const range = rangeDef.includes('!')
        ? rangeDef
        : `${targetSheet.properties.title}!${rangeDef}`;

      const values = await gsheets.getValues(spreadsheetId, range);
      const numbers: number[] = [];

      for (const row of values) {
        for (const cell of row) {
          const num = parseFloat(cell);
          if (!isNaN(num)) {
            numbers.push(num);
          }
        }
      }

      if (numbers.length === 0) {
        spinner.fail('No numeric values found in range');
        return;
      }

      const sum = numbers.reduce((a, b) => a + b, 0);
      const mean = sum / numbers.length;
      const sorted = [...numbers].sort((a, b) => a - b);
      const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const variance = numbers.reduce((acc, n) => acc + Math.pow(n - mean, 2), 0) / numbers.length;
      const stdDev = Math.sqrt(variance);

      spinner.success(`Analyzed ${numbers.length} values`);

      const stats = { count: numbers.length, sum, mean, median, min, max, stdDev };

      if (globalFlags.json) {
        output.json({ range, stats });
        return;
      }

      console.log('');
      console.log(`${c.cyan('Count:')} ${numbers.length}`);
      console.log(`${c.cyan('Sum:')} ${sum.toFixed(2)}`);
      console.log(`${c.cyan('Mean:')} ${mean.toFixed(2)}`);
      console.log(`${c.cyan('Median:')} ${median.toFixed(2)}`);
      console.log(`${c.cyan('Min:')} ${min}`);
      console.log(`${c.cyan('Max:')} ${max}`);
      console.log(`${c.cyan('Std Dev:')} ${stdDev.toFixed(2)}`);
      console.log('');
    } catch (error) {
      spinner.fail('Failed to calculate statistics');
      throw error;
    }
  },
};

const compareCommand: Command = {
  name: 'compare',
  description: 'Compare two ranges for differences',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range1', description: 'First range (e.g., A1:D10)', required: true },
    { name: 'range2', description: 'Second range (e.g., F1:I10)', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name' },
  ],
  examples: [
    'uni gsheets compare ID A1:D10 F1:I10',
    'uni gsheets compare ID --sheet "Data" A1:C5 E1:G5',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const range1 = args.range1 as string;
    const range2 = args.range2 as string;
    const sheetName = flags.sheet as string | undefined;

    const spinner = output.spinner('Comparing ranges...');

    try {
      const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);

      if (!targetSheet) {
        spinner.fail(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      const fullRange1 = range1.includes('!') ? range1 : `${targetSheet.properties.title}!${range1}`;
      const fullRange2 = range2.includes('!') ? range2 : `${targetSheet.properties.title}!${range2}`;

      const values1 = await gsheets.getValues(spreadsheetId, fullRange1);
      const values2 = await gsheets.getValues(spreadsheetId, fullRange2);

      const differences: Array<{ row: number; col: number; value1: string; value2: string }> = [];
      const maxRows = Math.max(values1.length, values2.length);

      for (let row = 0; row < maxRows; row++) {
        const row1 = values1[row] || [];
        const row2 = values2[row] || [];
        const maxCols = Math.max(row1.length, row2.length);

        for (let col = 0; col < maxCols; col++) {
          const v1 = row1[col] || '';
          const v2 = row2[col] || '';
          if (v1 !== v2) {
            differences.push({ row: row + 1, col: col + 1, value1: v1, value2: v2 });
          }
        }
      }

      spinner.success(`Found ${differences.length} difference(s)`);

      if (globalFlags.json) {
        output.json({ range1, range2, differenceCount: differences.length, differences });
        return;
      }

      if (differences.length === 0) {
        console.log(c.green('Ranges are identical'));
      } else {
        console.log('');
        console.log(c.bold(`Differences (${differences.length}):`));
        console.log('');
        for (const diff of differences.slice(0, 20)) {
          console.log(`  Row ${diff.row}, Col ${diff.col}: "${diff.value1}" vs "${diff.value2}"`);
        }
        if (differences.length > 20) {
          console.log(c.dim(`  ... and ${differences.length - 20} more`));
        }
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to compare ranges');
      throw error;
    }
  },
};

// ============================================================
// Formatting Commands
// ============================================================

const formatCommand: Command = {
  name: 'format',
  description: 'Format cells (bold, italic, colors, font size)',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Range to format (e.g., A1:D10)', required: true },
  ],
  options: [
    { name: 'bold', short: 'b', type: 'boolean', description: 'Make text bold' },
    { name: 'italic', short: 'i', type: 'boolean', description: 'Make text italic' },
    { name: 'underline', short: 'u', type: 'boolean', description: 'Underline text' },
    { name: 'strikethrough', type: 'boolean', description: 'Strikethrough text' },
    { name: 'color', short: 'c', type: 'string', description: 'Text color (name or #hex)' },
    { name: 'bg', type: 'string', description: 'Background color (name or #hex)' },
    { name: 'size', type: 'string', description: 'Font size in points' },
    { name: 'font', short: 'f', type: 'string', description: 'Font family name' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name' },
  ],
  examples: [
    'uni gsheets format ID A1:Z1 --bold',
    'uni gsheets format ID A1:A10 --bold --color blue',
    'uni gsheets format ID B2:D5 --bg yellow --size 14',
    'uni gsheets format ID A1:Z1 --bold --bg "#4285f4" --color white',
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

    const bold = flags.bold as boolean | undefined;
    const italic = flags.italic as boolean | undefined;
    const underline = flags.underline as boolean | undefined;
    const strikethrough = flags.strikethrough as boolean | undefined;
    const textColor = flags.color as string | undefined;
    const bgColor = flags.bg as string | undefined;
    const fontSize = flags.size as string | undefined;
    const fontFamily = flags.font as string | undefined;

    const spinner = output.spinner(`Formatting ${rangeDef}...`);

    try {
      const parsed = parseRange(rangeDef);
      if (!parsed) {
        spinner.fail(`Invalid range: ${rangeDef}`);
        return;
      }

      const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);

      if (!targetSheet) {
        spinner.fail(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      await gsheets.formatCells(
        spreadsheetId,
        {
          sheetId: targetSheet.properties.sheetId,
          startRowIndex: parsed.startRow,
          endRowIndex: parsed.endRow,
          startColumnIndex: parsed.startCol,
          endColumnIndex: parsed.endCol,
        },
        {
          bold,
          italic,
          underline,
          strikethrough,
          foregroundColor: textColor ? parseColor(textColor) : undefined,
          backgroundColor: bgColor ? parseColor(bgColor) : undefined,
          fontSize: fontSize ? parseInt(fontSize, 10) : undefined,
          fontFamily,
        }
      );

      spinner.success(`Formatted ${rangeDef}`);

      if (globalFlags.json) {
        output.json({ range: rangeDef, bold, italic, underline, strikethrough, textColor, bgColor, fontSize, fontFamily });
      }
    } catch (error) {
      spinner.fail('Failed to format cells');
      throw error;
    }
  },
};

const alignCommand: Command = {
  name: 'align',
  description: 'Set text alignment in cells',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Cell or range (e.g., A1, A1:D10)', required: true },
  ],
  options: [
    { name: 'horizontal', short: 'h', type: 'string', description: 'Horizontal alignment: left, center, right' },
    { name: 'vertical', short: 'v', type: 'string', description: 'Vertical alignment: top, middle, bottom' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets align ID A1:D10 --horizontal center',
    'uni gsheets align ID B1:B100 --vertical middle',
    'uni gsheets align ID A1:Z1 --horizontal center --vertical middle',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rangeDef = args.range as string;
    const horizontal = flags.horizontal as string | undefined;
    const vertical = flags.vertical as string | undefined;
    const sheetName = flags.sheet as string | undefined;

    if (!horizontal && !vertical) {
      output.error('Specify --horizontal and/or --vertical alignment');
      return;
    }

    const parsed = parseRange(rangeDef);
    if (!parsed) {
      output.error(`Invalid range: ${rangeDef}`);
      return;
    }

    const hMap: Record<string, 'LEFT' | 'CENTER' | 'RIGHT'> = {
      left: 'LEFT', center: 'CENTER', right: 'RIGHT',
    };
    const vMap: Record<string, 'TOP' | 'MIDDLE' | 'BOTTOM'> = {
      top: 'TOP', middle: 'MIDDLE', bottom: 'BOTTOM',
    };

    const h = horizontal ? hMap[horizontal.toLowerCase()] : undefined;
    const v = vertical ? vMap[vertical.toLowerCase()] : undefined;

    if (horizontal && !h) {
      output.error(`Invalid horizontal alignment: ${horizontal}`);
      return;
    }
    if (vertical && !v) {
      output.error(`Invalid vertical alignment: ${vertical}`);
      return;
    }

    const spinner = output.spinner(`Setting alignment on ${rangeDef}...`);

    try {
      const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);

      if (!targetSheet) {
        spinner.fail(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      await gsheets.setAlignment(
        spreadsheetId,
        {
          sheetId: targetSheet.properties.sheetId,
          startRowIndex: parsed.startRow,
          endRowIndex: parsed.endRow,
          startColumnIndex: parsed.startCol,
          endColumnIndex: parsed.endCol,
        },
        h,
        v
      );

      const parts = [];
      if (h) parts.push(`horizontal: ${horizontal}`);
      if (v) parts.push(`vertical: ${vertical}`);
      spinner.success(`Set alignment (${parts.join(', ')}) on ${rangeDef}`);

      if (globalFlags.json) {
        output.json({ range: rangeDef, horizontal: h, vertical: v });
      }
    } catch (error) {
      spinner.fail('Failed to set alignment');
      throw error;
    }
  },
};

const borderCommand: Command = {
  name: 'border',
  description: 'Set cell borders',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Cell range (e.g., A1:D10)', required: true },
  ],
  options: [
    { name: 'all', short: 'a', type: 'boolean', description: 'Apply border to all sides and inner lines' },
    { name: 'outer', short: 'o', type: 'boolean', description: 'Apply border to outer edges only' },
    { name: 'inner', short: 'i', type: 'boolean', description: 'Apply border to inner lines only' },
    { name: 'top', type: 'boolean', description: 'Apply border to top' },
    { name: 'bottom', type: 'boolean', description: 'Apply border to bottom' },
    { name: 'left', type: 'boolean', description: 'Apply border to left' },
    { name: 'right', type: 'boolean', description: 'Apply border to right' },
    { name: 'style', short: 's', type: 'string', description: 'Border style: solid, solid-medium, solid-thick, dashed, dotted, double' },
    { name: 'color', short: 'c', type: 'string', description: 'Border color (name or hex)' },
    { name: 'clear', type: 'boolean', description: 'Clear all borders' },
    { name: 'sheet', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets border ID A1:D10 --all',
    'uni gsheets border ID A1:D10 --all --style solid-thick --color blue',
    'uni gsheets border ID A1:D10 --outer --style double',
    'uni gsheets border ID A1:D10 --clear',
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

    const all = flags.all as boolean;
    const outer = flags.outer as boolean;
    const inner = flags.inner as boolean;
    const top = flags.top as boolean;
    const bottom = flags.bottom as boolean;
    const left = flags.left as boolean;
    const right = flags.right as boolean;
    const style = (flags.style as string) || 'solid';
    const colorStr = flags.color as string | undefined;
    const clearBorders = flags.clear as boolean;

    const spinner = output.spinner(clearBorders ? 'Clearing borders...' : 'Setting borders...');

    try {
      const parsed = parseRange(rangeDef);
      if (!parsed) {
        spinner.fail(`Invalid range format: ${rangeDef}`);
        return;
      }

      const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);

      if (!targetSheet) {
        spinner.fail(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      const color = colorStr ? parseColor(colorStr) : { red: 0, green: 0, blue: 0 };

      const range = {
        sheetId: targetSheet.properties.sheetId,
        startRowIndex: parsed.startRow,
        endRowIndex: parsed.endRow,
        startColumnIndex: parsed.startCol,
        endColumnIndex: parsed.endCol,
      };

      const borders: Parameters<typeof gsheets.updateBorders>[2] = {};

      if (clearBorders) {
        borders.top = { style: 'none' };
        borders.bottom = { style: 'none' };
        borders.left = { style: 'none' };
        borders.right = { style: 'none' };
        borders.innerHorizontal = { style: 'none' };
        borders.innerVertical = { style: 'none' };
      } else {
        const borderSpec = { style, color };

        if (all) {
          borders.top = borderSpec;
          borders.bottom = borderSpec;
          borders.left = borderSpec;
          borders.right = borderSpec;
          borders.innerHorizontal = borderSpec;
          borders.innerVertical = borderSpec;
        } else if (outer) {
          borders.top = borderSpec;
          borders.bottom = borderSpec;
          borders.left = borderSpec;
          borders.right = borderSpec;
        } else if (inner) {
          borders.innerHorizontal = borderSpec;
          borders.innerVertical = borderSpec;
        } else {
          if (top) borders.top = borderSpec;
          if (bottom) borders.bottom = borderSpec;
          if (left) borders.left = borderSpec;
          if (right) borders.right = borderSpec;
        }
      }

      if (!clearBorders && Object.keys(borders).length === 0) {
        spinner.fail('Specify --all, --outer, --inner, or individual sides (--top, --bottom, --left, --right)');
        return;
      }

      await gsheets.updateBorders(spreadsheetId, range, borders);

      if (clearBorders) {
        spinner.success(`Cleared borders from ${rangeDef}`);
      } else {
        spinner.success(`Applied ${style} borders to ${rangeDef}`);
      }

      if (globalFlags.json) {
        output.json({ range: rangeDef, cleared: clearBorders, style: clearBorders ? undefined : style, color: clearBorders ? undefined : colorStr });
      }
    } catch (error) {
      spinner.fail('Failed to set borders');
      throw error;
    }
  },
};

const mergeCommand: Command = {
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
    'uni gsheets merge ID A1:C3 --unmerge',
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
    const unmerge = flags.unmerge as boolean;
    const mergeType = (flags.type as string) || 'all';

    const validTypes = ['all', 'horizontal', 'vertical'];
    if (!validTypes.includes(mergeType)) {
      output.error(`Invalid type: ${mergeType}. Use: ${validTypes.join(', ')}`);
      return;
    }

    const spinner = output.spinner(unmerge ? 'Unmerging cells...' : 'Merging cells...');

    try {
      const parsed = parseRange(rangeDef);
      if (!parsed) {
        spinner.fail(`Invalid range: ${rangeDef}`);
        return;
      }

      const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);

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

      if (unmerge) {
        await gsheets.unmergeCells(spreadsheetId, range);
      } else {
        await gsheets.mergeCells(spreadsheetId, range, mergeType);
      }

      spinner.success(unmerge ? `Unmerged ${rangeDef}` : `Merged ${rangeDef}`);

      if (globalFlags.json) {
        output.json({ spreadsheetId, range: rangeDef, action: unmerge ? 'unmerge' : 'merge', type: unmerge ? null : mergeType });
      }
    } catch (error) {
      spinner.fail(unmerge ? 'Failed to unmerge cells' : 'Failed to merge cells');
      throw error;
    }
  },
};

const freezeCommand: Command = {
  name: 'freeze',
  description: 'Freeze rows and/or columns',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
  ],
  options: [
    { name: 'rows', short: 'r', type: 'string', description: 'Number of rows to freeze' },
    { name: 'cols', short: 'c', type: 'string', description: 'Number of columns to freeze' },
    { name: 'clear', type: 'boolean', description: 'Unfreeze all rows and columns' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets freeze ID --rows 1',
    'uni gsheets freeze ID --cols 2',
    'uni gsheets freeze ID --rows 1 --cols 1',
    'uni gsheets freeze ID --clear',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rows = flags.rows !== undefined ? parseInt(flags.rows as string, 10) : undefined;
    const cols = flags.cols !== undefined ? parseInt(flags.cols as string, 10) : undefined;
    const clearFreeze = flags.clear as boolean;
    const sheetName = flags.sheet as string | undefined;

    const spinner = output.spinner(clearFreeze ? 'Unfreezing...' : 'Freezing...');

    try {
      const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);

      if (!targetSheet) {
        spinner.fail(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      if (!clearFreeze && rows === undefined && cols === undefined) {
        spinner.stop();
        const grid = targetSheet.properties.gridProperties;
        const frozenRows = grid?.frozenRowCount || 0;
        const frozenCols = grid?.frozenColumnCount || 0;

        if (globalFlags.json) {
          output.json({ frozenRows, frozenCols, sheet: targetSheet.properties.title });
          return;
        }

        console.log('');
        console.log(c.bold(`Freeze state for "${targetSheet.properties.title}":`));
        console.log(`  Frozen rows: ${frozenRows}`);
        console.log(`  Frozen columns: ${frozenCols}`);
        console.log('');
        return;
      }

      const frozenRowCount = clearFreeze ? 0 : rows;
      const frozenColumnCount = clearFreeze ? 0 : cols;

      await gsheets.freezeRowsColumns(spreadsheetId, targetSheet.properties.sheetId, frozenRowCount, frozenColumnCount);

      if (clearFreeze) {
        spinner.success('Unfroze all rows and columns');
      } else {
        const parts = [];
        if (frozenRowCount !== undefined) parts.push(`${frozenRowCount} row${frozenRowCount !== 1 ? 's' : ''}`);
        if (frozenColumnCount !== undefined) parts.push(`${frozenColumnCount} column${frozenColumnCount !== 1 ? 's' : ''}`);
        spinner.success(`Froze ${parts.join(' and ')}`);
      }

      if (globalFlags.json) {
        output.json({
          frozenRows: clearFreeze ? 0 : (frozenRowCount ?? (targetSheet.properties.gridProperties?.frozenRowCount || 0)),
          frozenCols: clearFreeze ? 0 : (frozenColumnCount ?? (targetSheet.properties.gridProperties?.frozenColumnCount || 0)),
          sheet: targetSheet.properties.title,
        });
      }
    } catch (error) {
      spinner.fail('Failed to freeze');
      throw error;
    }
  },
};

const hideCommand: Command = {
  name: 'hide',
  description: 'Hide or show rows/columns',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
  ],
  options: [
    { name: 'cols', short: 'c', type: 'string', description: 'Column range to hide/show (e.g., B:D, C)' },
    { name: 'rows', short: 'r', type: 'string', description: 'Row range to hide/show (e.g., 5:10, 3)' },
    { name: 'show', short: 's', type: 'boolean', description: 'Show instead of hide' },
    { name: 'sheet', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets hide ID --cols B:D',
    'uni gsheets hide ID --rows 5:10',
    'uni gsheets hide ID --cols B:D --show',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const colRange = flags.cols as string | undefined;
    const rowRange = flags.rows as string | undefined;
    const showInstead = flags.show as boolean;
    const sheetName = flags.sheet as string | undefined;

    if (!colRange && !rowRange) {
      output.error('Specify --cols or --rows to hide/show');
      return;
    }

    const action = showInstead ? 'Showing' : 'Hiding';
    const spinner = output.spinner(`${action}...`);

    try {
      const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);

      if (!targetSheet) {
        spinner.fail(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      const sheetId = targetSheet.properties.sheetId;
      const results: string[] = [];
      const hidden = !showInstead;

      if (colRange) {
        const parsed = parseColRange(colRange);
        if (!parsed) {
          spinner.fail(`Invalid column range: ${colRange}. Use format like B:D or C`);
          return;
        }

        await gsheets.setDimensionVisibility(spreadsheetId, sheetId, 'COLUMNS', parsed.start, parsed.end, hidden);
        results.push(`${showInstead ? 'Showed' : 'Hid'} columns ${colRange}`);
      }

      if (rowRange) {
        const parsed = parseRowRange(rowRange);
        if (!parsed) {
          spinner.fail(`Invalid row range: ${rowRange}. Use format like 5:10 or 3`);
          return;
        }

        await gsheets.setDimensionVisibility(spreadsheetId, sheetId, 'ROWS', parsed.start, parsed.end, hidden);
        results.push(`${showInstead ? 'Showed' : 'Hid'} rows ${rowRange}`);
      }

      spinner.success(results.join(', '));

      if (globalFlags.json) {
        output.json({ columns: colRange, rows: rowRange, hidden });
      }
    } catch (error) {
      spinner.fail(`Failed to ${showInstead ? 'show' : 'hide'}`);
      throw error;
    }
  },
};

const wrapCommand: Command = {
  name: 'wrap',
  description: 'Set text wrapping strategy for cells',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Cell or range (e.g., A1, A1:D10)', required: true },
  ],
  options: [
    { name: 'strategy', short: 't', type: 'string', description: 'Wrap strategy: wrap, overflow, clip' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets wrap ID A1:D100 --strategy wrap',
    'uni gsheets wrap ID B2:B50 --strategy clip',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rangeDef = args.range as string;
    const strategy = flags.strategy as string | undefined;
    const sheetName = flags.sheet as string | undefined;

    if (!strategy) {
      output.error('--strategy is required. Options: wrap, overflow, clip');
      return;
    }

    const parsed = parseRange(rangeDef);
    if (!parsed) {
      output.error(`Invalid range: ${rangeDef}`);
      return;
    }

    const strategyMap: Record<string, 'OVERFLOW_CELL' | 'CLIP' | 'WRAP'> = {
      wrap: 'WRAP',
      overflow: 'OVERFLOW_CELL',
      clip: 'CLIP',
    };

    const mappedStrategy = strategyMap[strategy.toLowerCase()];
    if (!mappedStrategy) {
      output.error(`Invalid strategy: ${strategy}. Use wrap, overflow, or clip`);
      return;
    }

    const spinner = output.spinner(`Setting wrap strategy on ${rangeDef}...`);

    try {
      const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);

      if (!targetSheet) {
        spinner.fail(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      await gsheets.setWrapStrategy(
        spreadsheetId,
        {
          sheetId: targetSheet.properties.sheetId,
          startRowIndex: parsed.startRow,
          endRowIndex: parsed.endRow,
          startColumnIndex: parsed.startCol,
          endColumnIndex: parsed.endCol,
        },
        mappedStrategy
      );

      spinner.success(`Set ${strategy} wrapping on ${rangeDef}`);

      if (globalFlags.json) {
        output.json({ range: rangeDef, strategy });
      }
    } catch (error) {
      spinner.fail('Failed to set wrap strategy');
      throw error;
    }
  },
};

const rotateCommand: Command = {
  name: 'rotate',
  description: 'Rotate text in cells',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Cell or range (e.g., A1, A1:Z1)', required: true },
  ],
  options: [
    { name: 'angle', short: 'a', type: 'string', description: 'Rotation angle (-90 to 90 degrees)' },
    { name: 'vertical', short: 'v', type: 'boolean', description: 'Stack text vertically' },
    { name: 'clear', short: 'c', type: 'boolean', description: 'Clear rotation (reset to 0)' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets rotate ID A1:Z1 --angle 45',
    'uni gsheets rotate ID B1:B5 --vertical',
    'uni gsheets rotate ID A1:Z1 --clear',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rangeDef = args.range as string;
    const angleStr = flags.angle as string | undefined;
    const vertical = flags.vertical as boolean;
    const clear = flags.clear as boolean;
    const sheetName = flags.sheet as string | undefined;

    if (!angleStr && !vertical && !clear) {
      output.error('Specify --angle, --vertical, or --clear');
      return;
    }

    const parsed = parseRange(rangeDef);
    if (!parsed) {
      output.error(`Invalid range: ${rangeDef}`);
      return;
    }

    let angle: number | undefined;
    if (angleStr) {
      angle = parseInt(angleStr, 10);
      if (isNaN(angle) || angle < -90 || angle > 90) {
        output.error('Angle must be between -90 and 90 degrees');
        return;
      }
    }

    const spinner = output.spinner(`Setting text rotation on ${rangeDef}...`);

    try {
      const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);

      if (!targetSheet) {
        spinner.fail(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      await gsheets.setTextRotation(
        spreadsheetId,
        {
          sheetId: targetSheet.properties.sheetId,
          startRowIndex: parsed.startRow,
          endRowIndex: parsed.endRow,
          startColumnIndex: parsed.startCol,
          endColumnIndex: parsed.endCol,
        },
        clear ? 0 : angle,
        vertical
      );

      if (clear) {
        spinner.success(`Cleared rotation on ${rangeDef}`);
      } else if (vertical) {
        spinner.success(`Set vertical text on ${rangeDef}`);
      } else {
        spinner.success(`Rotated text ${angle}° on ${rangeDef}`);
      }

      if (globalFlags.json) {
        output.json({ range: rangeDef, angle: clear ? 0 : angle, vertical });
      }
    } catch (error) {
      spinner.fail('Failed to set text rotation');
      throw error;
    }
  },
};

const numberFormatCommand: Command = {
  name: 'number-format',
  description: 'Set number format on cells (currency, percent, date, etc.)',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Cell or range (e.g., A1, B1:B100)', required: true },
  ],
  options: [
    { name: 'type', short: 't', type: 'string', description: 'Format type: number, currency, percent, date, time, datetime, text, scientific' },
    { name: 'pattern', short: 'p', type: 'string', description: 'Custom pattern (e.g., "$#,##0.00", "0.00%")' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets number-format ID B1:B100 --type currency',
    'uni gsheets number-format ID C1:C50 --type percent',
    'uni gsheets number-format ID D1:D100 --type date',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rangeDef = args.range as string;
    const formatType = flags.type as string | undefined;
    const pattern = flags.pattern as string | undefined;
    const sheetName = flags.sheet as string | undefined;

    if (!formatType) {
      output.error('--type is required. Options: number, currency, percent, date, time, datetime, text, scientific');
      return;
    }

    const parsed = parseRange(rangeDef);
    if (!parsed) {
      output.error(`Invalid range: ${rangeDef}`);
      return;
    }

    const typeMap: Record<string, 'TEXT' | 'NUMBER' | 'PERCENT' | 'CURRENCY' | 'DATE' | 'TIME' | 'DATE_TIME' | 'SCIENTIFIC'> = {
      text: 'TEXT',
      number: 'NUMBER',
      percent: 'PERCENT',
      currency: 'CURRENCY',
      date: 'DATE',
      time: 'TIME',
      datetime: 'DATE_TIME',
      scientific: 'SCIENTIFIC',
    };

    const type = typeMap[formatType.toLowerCase()];
    if (!type) {
      output.error(`Unknown format type: ${formatType}`);
      return;
    }

    const spinner = output.spinner(`Setting ${formatType} format on ${rangeDef}...`);

    try {
      const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);

      if (!targetSheet) {
        spinner.fail(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      await gsheets.setNumberFormat(
        spreadsheetId,
        {
          sheetId: targetSheet.properties.sheetId,
          startRowIndex: parsed.startRow,
          endRowIndex: parsed.endRow,
          startColumnIndex: parsed.startCol,
          endColumnIndex: parsed.endCol,
        },
        type,
        pattern
      );

      spinner.success(`Set ${formatType} format on ${rangeDef}`);

      if (globalFlags.json) {
        output.json({ range: rangeDef, type: formatType, pattern });
      }
    } catch (error) {
      spinner.fail('Failed to set number format');
      throw error;
    }
  },
};

const resizeCommand: Command = {
  name: 'resize',
  description: 'Auto-resize or manually set row/column sizes',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
  ],
  options: [
    { name: 'cols', short: 'c', type: 'string', description: 'Column range to resize (e.g., A:D, A)' },
    { name: 'rows', short: 'r', type: 'string', description: 'Row range to resize (e.g., 1:10, 5)' },
    { name: 'size', short: 'p', type: 'string', description: 'Pixel size (if not specified, auto-fit to content)' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets resize ID --cols A:D',
    'uni gsheets resize ID --rows 1:10',
    'uni gsheets resize ID --cols B --size 200',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const colRange = flags.cols as string | undefined;
    const rowRange = flags.rows as string | undefined;
    const sizeStr = flags.size as string | undefined;
    const sheetName = flags.sheet as string | undefined;

    if (!colRange && !rowRange) {
      output.error('Specify --cols or --rows to resize');
      return;
    }

    const spinner = output.spinner('Resizing...');

    try {
      const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);

      if (!targetSheet) {
        spinner.fail(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      const sheetId = targetSheet.properties.sheetId;
      const results: string[] = [];

      if (colRange) {
        const parsed = parseColRange(colRange);
        if (!parsed) {
          spinner.fail(`Invalid column range: ${colRange}. Use format like A:D or A`);
          return;
        }

        if (sizeStr) {
          const size = parseInt(sizeStr, 10);
          await gsheets.setDimensionSize(spreadsheetId, sheetId, 'COLUMNS', parsed.start, parsed.end, size);
          results.push(`Set columns ${colRange} to ${size}px`);
        } else {
          await gsheets.autoResizeColumns(spreadsheetId, sheetId, parsed.start, parsed.end);
          results.push(`Auto-resized columns ${colRange}`);
        }
      }

      if (rowRange) {
        const parsed = parseRowRange(rowRange);
        if (!parsed) {
          spinner.fail(`Invalid row range: ${rowRange}. Use format like 1:10 or 5`);
          return;
        }

        if (sizeStr) {
          const size = parseInt(sizeStr, 10);
          await gsheets.setDimensionSize(spreadsheetId, sheetId, 'ROWS', parsed.start, parsed.end, size);
          results.push(`Set rows ${rowRange} to ${size}px`);
        } else {
          await gsheets.autoResizeRows(spreadsheetId, sheetId, parsed.start, parsed.end);
          results.push(`Auto-resized rows ${rowRange}`);
        }
      }

      spinner.success(results.join(', '));

      if (globalFlags.json) {
        output.json({ columns: colRange, rows: rowRange, size: sizeStr ? parseInt(sizeStr, 10) : 'auto' });
      }
    } catch (error) {
      spinner.fail('Failed to resize');
      throw error;
    }
  },
};

const bandingCommand: Command = {
  name: 'banding',
  description: 'Add, list, or delete banded (alternating color) ranges',
  args: [{ name: 'id', description: 'Spreadsheet ID or URL', required: true }],
  options: [
    { name: 'add', short: 'a', type: 'boolean', description: 'Add banding to a range' },
    { name: 'list', short: 'l', type: 'boolean', description: 'List all banded ranges' },
    { name: 'delete', short: 'd', type: 'string', description: 'Delete banding by ID' },
    { name: 'range', short: 'r', type: 'string', description: 'Range for banding (e.g., A1:D100)' },
    { name: 'header-color', type: 'string', description: 'Header row color (name or #hex)' },
    { name: 'first-color', type: 'string', description: 'First band color (name or #hex)' },
    { name: 'second-color', type: 'string', description: 'Second band color (name or #hex)' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets banding ID --list',
    'uni gsheets banding ID --add --range A1:D100 --first-color white --second-color lightgray',
  ],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const addBanding = flags.add as boolean;
    const listBanding = flags.list as boolean;
    const deleteBandingId = flags.delete as string | undefined;
    const sheetName = flags.sheet as string | undefined;

    if (listBanding) {
      const spinner = output.spinner('Fetching banded ranges...');
      const bands = await gsheets.listBandedRanges(spreadsheetId);
      spinner.stop();
      if (globalFlags.json) { output.json(bands); return; }
      if (bands.length === 0) { output.text('No banded ranges found'); } else {
        output.text(c.bold('Banded Ranges:\n'));
        for (const b of bands) { output.text(`  ${c.cyan(b.bandedRangeId.toString())} - Sheet ${b.sheetId}`); }
      }
      return;
    }

    if (deleteBandingId) {
      const bandedRangeId = parseInt(deleteBandingId, 10);
      if (isNaN(bandedRangeId)) { output.error('Banded range ID must be a number'); return; }
      const spinner = output.spinner('Deleting banded range...');
      await gsheets.deleteBandedRange(spreadsheetId, bandedRangeId);
      spinner.success(`Deleted banded range ${bandedRangeId}`);
      if (globalFlags.json) { output.json({ bandedRangeId, deleted: true }); }
      return;
    }

    if (addBanding) {
      const rangeDef = flags.range as string | undefined;
      const headerColor = flags['header-color'] as string | undefined;
      const firstColor = flags['first-color'] as string | undefined;
      const secondColor = flags['second-color'] as string | undefined;
      if (!rangeDef) { output.error('--range is required when adding banding'); return; }
      if (!firstColor && !secondColor) { output.error('Specify at least --first-color or --second-color'); return; }
      const parsed = parseRange(rangeDef);
      if (!parsed) { output.error(`Invalid range: ${rangeDef}`); return; }
      const spinner = output.spinner('Adding banded range...');
      const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);
      if (!targetSheet) { spinner.fail(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets'); return; }
      const bandedRangeId = await gsheets.addBandedRange(spreadsheetId, {
        sheetId: targetSheet.properties.sheetId,
        startRowIndex: parsed.startRow, endRowIndex: parsed.endRow,
        startColumnIndex: parsed.startCol, endColumnIndex: parsed.endCol,
      }, headerColor ? parseColor(headerColor) : undefined, firstColor ? parseColor(firstColor) : undefined, secondColor ? parseColor(secondColor) : undefined);
      spinner.success(`Created banded range ${bandedRangeId} on ${rangeDef}`);
      if (globalFlags.json) { output.json({ bandedRangeId, range: rangeDef }); }
      return;
    }
    output.error('Specify --add, --list, or --delete');
  },
};

const condFormatCommand: Command = {
  name: 'cond-format',
  description: 'Apply or manage conditional formatting rules',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Range to format (e.g., B2:B100)', required: false },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
    { name: 'type', short: 't', type: 'string', description: 'Rule type: gt, lt, eq, ne, empty, not-empty, contains, between' },
    { name: 'value', short: 'v', type: 'string', description: 'Value to compare' },
    { name: 'value2', type: 'string', description: 'Second value (for "between" type)' },
    { name: 'bg', type: 'string', description: 'Background color' },
    { name: 'color', type: 'string', description: 'Text color' },
    { name: 'bold', type: 'boolean', description: 'Make text bold' },
    { name: 'list', short: 'l', type: 'boolean', description: 'List all rules' },
    { name: 'remove', short: 'r', type: 'string', description: 'Remove rule by index' },
  ],
  examples: [
    'uni gsheets cond-format ID B2:B100 --type gt --value 100 --bg green',
    'uni gsheets cond-format ID --list',
  ],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rangeStr = args.range as string | undefined;
    const sheetName = flags.sheet as string | undefined;
    const listRules = flags.list as boolean;
    const removeIndex = flags.remove as string | undefined;

    if (listRules) {
      const spinner = output.spinner('Fetching conditional formatting rules...');
      const rules = await gsheets.listConditionalFormats(spreadsheetId);
      spinner.stop();
      if (globalFlags.json) { output.json({ spreadsheetId, rules }); return; }
      if (rules.length === 0) { console.log(c.dim('No conditional formatting rules found.')); } else {
        console.log(c.bold(`Conditional Formatting Rules (${rules.length}):`));
        for (const rule of rules) {
          console.log(`  ${c.cyan(`Index: ${rule.ruleIndex}`)} Range: ${rule.ranges} Condition: ${rule.condition}`);
        }
      }
      return;
    }

    if (removeIndex !== undefined) {
      const spinner = output.spinner('Removing rule...');
      const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);
      if (!targetSheet) { spinner.fail('Sheet not found'); return; }
      const ruleIndex = parseInt(removeIndex, 10);
      await gsheets.deleteConditionalFormat(spreadsheetId, targetSheet.properties.sheetId, ruleIndex);
      spinner.success(`Removed rule at index ${ruleIndex}`);
      if (globalFlags.json) { output.json({ spreadsheetId, removed: ruleIndex }); }
      return;
    }

    if (!rangeStr) { output.error('Range is required when adding a rule'); return; }
    const ruleType = (flags.type as string) || 'gt';
    const value = flags.value as string | undefined;
    const value2 = flags.value2 as string | undefined;
    const bgColor = flags.bg as string | undefined;
    const textColor = flags.color as string | undefined;
    const makeBold = flags.bold as boolean;

    const spinner = output.spinner('Applying conditional formatting...');
    const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);
    if (!targetSheet) { spinner.fail('Sheet not found'); return; }

    const cellPart = rangeStr.includes('!') ? rangeStr.split('!')[1] : rangeStr;
    const parsed = parseRange(cellPart);
    if (!parsed) { spinner.fail(`Invalid range: ${rangeStr}`); return; }

    await gsheets.addConditionalFormat(spreadsheetId, {
      sheetId: targetSheet.properties.sheetId,
      startRowIndex: parsed.startRow, endRowIndex: parsed.endRow,
      startColumnIndex: parsed.startCol, endColumnIndex: parsed.endCol,
    }, ruleType, value, value2, bgColor ? COLOR_MAP[bgColor] : undefined, textColor ? COLOR_MAP[textColor] : undefined, makeBold);
    spinner.success('Conditional formatting applied');
    if (globalFlags.json) { output.json({ spreadsheetId, range: rangeStr, type: ruleType }); }
  },
};

// ============================================================
// Chart Commands
// ============================================================

const chartCommand: Command = {
  name: 'chart',
  description: 'Create a chart in the spreadsheet',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Data range (e.g., A1:D10)', required: true },
  ],
  options: [
    { name: 'type', short: 't', type: 'string', description: 'Chart type: bar, line, pie, column, area, scatter' },
    { name: 'title', type: 'string', description: 'Chart title' },
    { name: 'position', short: 'p', type: 'string', description: 'Anchor cell (e.g., F2)' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name' },
  ],
  examples: [
    'uni gsheets chart ID A1:D10 --type bar --title "Sales"',
    'uni gsheets chart ID A1:B20 --type line --position F2',
  ],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rangeDef = args.range as string;
    const chartType = (flags.type as string) || 'bar';
    const title = flags.title as string | undefined;
    const position = flags.position as string | undefined;
    const sheetName = flags.sheet as string | undefined;

    const parsed = parseRange(rangeDef);
    if (!parsed) { output.error(`Invalid range: ${rangeDef}`); return; }

    const spinner = output.spinner(`Creating ${chartType} chart...`);
    const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);
    if (!targetSheet) { spinner.fail('Sheet not found'); return; }

    const anchorCell = position ? parseCell(position) : { row: 0, col: parsed.endCol + 1 };
    const typeMap: Record<string, string> = { bar: 'BAR', line: 'LINE', pie: 'PIE', column: 'COLUMN', area: 'AREA', scatter: 'SCATTER' };
    const mappedType = typeMap[chartType.toLowerCase()] || 'BAR';

    const chartId = await gsheets.createChart(spreadsheetId, targetSheet.properties.sheetId, {
      startRowIndex: parsed.startRow, endRowIndex: parsed.endRow,
      startColumnIndex: parsed.startCol, endColumnIndex: parsed.endCol,
    }, mappedType as Parameters<typeof gsheets.createChart>[3], title, undefined, {
      anchorCell: anchorCell ? { rowIndex: anchorCell.row, columnIndex: anchorCell.col } : undefined,
    });

    spinner.success(`Created ${chartType} chart (ID: ${chartId})`);
    if (globalFlags.json) { output.json({ chartId, type: chartType, range: rangeDef, title }); }
  },
};

const chartsCommand: Command = {
  name: 'charts',
  description: 'List all charts in a spreadsheet',
  args: [{ name: 'id', description: 'Spreadsheet ID or URL', required: true }],
  options: [{ name: 'sheet', short: 's', type: 'string', description: 'Filter by sheet name' }],
  examples: ['uni gsheets charts ID'],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const sheetFilter = flags.sheet as string | undefined;
    const spinner = output.spinner('Fetching charts...');
    let charts = await gsheets.listCharts(spreadsheetId);
    if (sheetFilter) { charts = charts.filter(ch => ch.sheetName.toLowerCase() === sheetFilter.toLowerCase()); }
    spinner.success(`Found ${charts.length} chart(s)`);
    if (globalFlags.json) { output.json({ spreadsheetId, charts }); return; }
    if (charts.length === 0) { console.log(c.dim('No charts found.')); return; }
    console.log(c.bold('Charts:'));
    for (const chart of charts) {
      console.log(`  ${c.green(`ID: ${chart.chartId}`)} ${chart.title || '(untitled)'} - ${chart.chartType || 'unknown'}`);
    }
  },
};

const chartDeleteCommand: Command = {
  name: 'chart-delete',
  description: 'Delete a chart from spreadsheet',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'chartId', description: 'Chart ID to delete', required: true },
  ],
  options: [],
  examples: ['uni gsheets chart-delete ID 123456789'],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const chartId = parseInt(args.chartId as string, 10);
    if (isNaN(chartId)) { output.error('Invalid chart ID'); return; }
    const spinner = output.spinner('Deleting chart...');
    await gsheets.deleteChart(spreadsheetId, chartId);
    spinner.success(`Deleted chart ${chartId}`);
    if (globalFlags.json) { output.json({ spreadsheetId, chartId, deleted: true }); }
  },
};

const chartMoveCommand: Command = {
  name: 'chart-move',
  description: 'Move or resize an existing chart',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'chartId', description: 'Chart ID to move', required: true },
    { name: 'position', description: 'New anchor cell (e.g., I2)', required: true },
  ],
  options: [
    { name: 'width', short: 'w', type: 'number', description: 'New width in pixels' },
    { name: 'height', short: 'h', type: 'number', description: 'New height in pixels' },
  ],
  examples: ['uni gsheets chart-move ID 123456789 I2'],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const chartId = parseInt(args.chartId as string, 10);
    const positionStr = args.position as string;
    const width = flags.width as number | undefined;
    const height = flags.height as number | undefined;
    if (isNaN(chartId)) { output.error('Invalid chart ID'); return; }
    const charts = await gsheets.listCharts(spreadsheetId);
    const chart = charts.find(ch => ch.chartId === chartId);
    if (!chart) { output.error(`Chart ${chartId} not found`); return; }
    const spinner = output.spinner('Moving chart...');
    const anchorCell = parseCell(positionStr);
    if (!anchorCell) { spinner.fail(`Invalid position: ${positionStr}`); return; }
    await gsheets.moveChart(spreadsheetId, chartId, chart.sheetId, { rowIndex: anchorCell.row, columnIndex: anchorCell.col }, width, height);
    spinner.success(`Moved chart ${chartId} to ${positionStr}`);
    if (globalFlags.json) { output.json({ spreadsheetId, chartId, newPosition: positionStr }); }
  },
};

const chartUpdateCommand: Command = {
  name: 'chart-update',
  description: 'Update chart title',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'chartId', description: 'Chart ID to update', required: true },
  ],
  options: [{ name: 'title', short: 't', type: 'string', description: 'New chart title' }],
  examples: ['uni gsheets chart-update ID 123456 --title "Sales Report 2024"'],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const chartId = parseInt(args.chartId as string, 10);
    const title = flags.title as string | undefined;
    if (isNaN(chartId)) { output.error('Chart ID must be a number'); return; }
    if (!title) { output.error('Specify --title to update'); return; }
    const spinner = output.spinner('Updating chart...');
    await gsheets.updateChartTitle(spreadsheetId, chartId, title);
    spinner.success(`Updated chart ${chartId} title to "${title}"`);
    if (globalFlags.json) { output.json({ chartId, title }); }
  },
};

// ============================================================
// Dimension Operations
// ============================================================

const insertCommand: Command = {
  name: 'insert',
  description: 'Insert rows or columns',
  args: [{ name: 'id', description: 'Spreadsheet ID or URL', required: true }],
  options: [
    { name: 'rows', short: 'r', type: 'string', description: 'Row number to insert at (1-indexed)' },
    { name: 'cols', short: 'c', type: 'string', description: 'Column letter to insert at' },
    { name: 'count', short: 'n', type: 'string', description: 'Number to insert (default: 1)' },
    { name: 'inherit', short: 'i', type: 'boolean', description: 'Inherit formatting' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name' },
  ],
  examples: ['uni gsheets insert ID --rows 5', 'uni gsheets insert ID --cols B --count 2'],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rowAt = flags.rows as string | undefined;
    const colAt = flags.cols as string | undefined;
    const count = parseInt(flags.count as string || '1', 10);
    const inherit = flags.inherit as boolean;
    const sheetName = flags.sheet as string | undefined;
    if (!rowAt && !colAt) { output.error('Specify --rows or --cols'); return; }
    if (rowAt && colAt) { output.error('Specify either --rows or --cols, not both'); return; }
    const spinner = output.spinner('Inserting...');
    const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);
    if (!targetSheet) { spinner.fail('Sheet not found'); return; }
    const sheetId = targetSheet.properties.sheetId;
    if (rowAt) {
      const rowIndex = parseInt(rowAt, 10) - 1;
      await gsheets.insertDimension(spreadsheetId, sheetId, 'ROWS', rowIndex, rowIndex + count, inherit);
      spinner.success(`Inserted ${count} row(s) at row ${rowAt}`);
      if (globalFlags.json) { output.json({ type: 'rows', at: parseInt(rowAt, 10), count }); }
    }
    if (colAt) {
      const colIndex = colAt.split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
      await gsheets.insertDimension(spreadsheetId, sheetId, 'COLUMNS', colIndex, colIndex + count, inherit);
      spinner.success(`Inserted ${count} column(s) at column ${colAt}`);
      if (globalFlags.json) { output.json({ type: 'columns', at: colAt, count }); }
    }
  },
};

const deleteRowsCommand: Command = {
  name: 'delete-rows',
  description: 'Delete rows from spreadsheet',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Row range to delete (e.g., 5:10, 3)', required: true },
  ],
  options: [{ name: 'sheet', short: 's', type: 'string', description: 'Sheet name' }],
  examples: ['uni gsheets delete-rows ID 5:10'],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rowRange = args.range as string;
    const sheetName = flags.sheet as string | undefined;
    const parsed = parseRowRange(rowRange);
    if (!parsed) { output.error(`Invalid row range: ${rowRange}`); return; }
    const spinner = output.spinner(`Deleting rows ${rowRange}...`);
    const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);
    if (!targetSheet) { spinner.fail('Sheet not found'); return; }
    await gsheets.deleteDimension(spreadsheetId, targetSheet.properties.sheetId, 'ROWS', parsed.start, parsed.end);
    const count = parsed.end - parsed.start;
    spinner.success(`Deleted ${count} row(s)`);
    if (globalFlags.json) { output.json({ deletedRows: rowRange, count }); }
  },
};

const deleteColsCommand: Command = {
  name: 'delete-cols',
  description: 'Delete columns from spreadsheet',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Column range to delete (e.g., B:D, C)', required: true },
  ],
  options: [{ name: 'sheet', short: 's', type: 'string', description: 'Sheet name' }],
  examples: ['uni gsheets delete-cols ID B:D'],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const colRange = args.range as string;
    const sheetName = flags.sheet as string | undefined;
    const parsed = parseColRange(colRange);
    if (!parsed) { output.error(`Invalid column range: ${colRange}`); return; }
    const spinner = output.spinner(`Deleting columns ${colRange}...`);
    const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);
    if (!targetSheet) { spinner.fail('Sheet not found'); return; }
    await gsheets.deleteDimension(spreadsheetId, targetSheet.properties.sheetId, 'COLUMNS', parsed.start, parsed.end);
    const count = parsed.end - parsed.start;
    spinner.success(`Deleted ${count} column(s)`);
    if (globalFlags.json) { output.json({ deletedCols: colRange, count }); }
  },
};

const moveDimCommand: Command = {
  name: 'move-dim',
  description: 'Move rows or columns to a new position',
  args: [{ name: 'id', description: 'Spreadsheet ID or URL', required: true }],
  options: [
    { name: 'rows', short: 'r', type: 'boolean', description: 'Move rows' },
    { name: 'cols', short: 'c', type: 'boolean', description: 'Move columns' },
    { name: 'start', type: 'string', description: 'Start index (1-based)' },
    { name: 'end', type: 'string', description: 'End index (1-based, inclusive)' },
    { name: 'to', type: 'string', description: 'Destination index (1-based)' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name' },
  ],
  examples: ['uni gsheets move-dim ID --rows --start 5 --end 7 --to 2'],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const moveRows = flags.rows as boolean;
    const moveCols = flags.cols as boolean;
    const startStr = flags.start as string | undefined;
    const endStr = flags.end as string | undefined;
    const toStr = flags.to as string | undefined;
    const sheetName = flags.sheet as string | undefined;
    if (!moveRows && !moveCols) { output.error('Specify --rows or --cols'); return; }
    if (!startStr || !endStr || !toStr) { output.error('--start, --end, and --to are required'); return; }
    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);
    const to = parseInt(toStr, 10);
    const dimension = moveRows ? 'ROWS' : 'COLUMNS';
    const spinner = output.spinner(`Moving ${moveRows ? 'rows' : 'columns'} ${start}-${end} to position ${to}...`);
    const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);
    if (!targetSheet) { spinner.fail('Sheet not found'); return; }
    await gsheets.moveDimension(spreadsheetId, targetSheet.properties.sheetId, dimension, start - 1, end, to - 1);
    spinner.success(`Moved ${moveRows ? 'rows' : 'columns'} ${start}-${end} to position ${to}`);
    if (globalFlags.json) { output.json({ dimension: moveRows ? 'rows' : 'columns', start, end, to }); }
  },
};

const groupCommand: Command = {
  name: 'group',
  description: 'Create collapsible row/column groups',
  args: [{ name: 'id', description: 'Spreadsheet ID or URL', required: true }],
  options: [
    { name: 'rows', short: 'r', type: 'string', description: 'Row range to group (e.g., 5:10)' },
    { name: 'cols', short: 'c', type: 'string', description: 'Column range to group (e.g., B:D)' },
    { name: 'ungroup', short: 'u', type: 'boolean', description: 'Remove group' },
    { name: 'collapse', type: 'boolean', description: 'Collapse the group' },
    { name: 'expand', type: 'boolean', description: 'Expand the group' },
    { name: 'list', short: 'l', type: 'boolean', description: 'List all groups' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name' },
  ],
  examples: ['uni gsheets group ID --rows 5:10', 'uni gsheets group ID --list'],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rowRange = flags.rows as string | undefined;
    const colRange = flags.cols as string | undefined;
    const ungroup = flags.ungroup as boolean;
    const collapse = flags.collapse as boolean;
    const expand = flags.expand as boolean;
    const list = flags.list as boolean;
    const sheetName = flags.sheet as string | undefined;
    const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);
    if (!targetSheet) { output.error('Sheet not found'); return; }
    const sheetId = targetSheet.properties.sheetId;

    if (list) {
      const spinner = output.spinner('Fetching groups...');
      const groups = await gsheets.listDimensionGroups(spreadsheetId, sheetId);
      spinner.stop();
      if (globalFlags.json) { output.json(groups); return; }
      console.log(c.bold('Row Groups:')); console.log(groups.rowGroups.length === 0 ? c.dim('  None') : groups.rowGroups.map(g => `  Rows ${g.startIndex + 1}:${g.endIndex}`).join('\n'));
      console.log(c.bold('Column Groups:')); console.log(groups.columnGroups.length === 0 ? c.dim('  None') : groups.columnGroups.map(g => `  Cols ${colToLetter(g.startIndex)}:${colToLetter(g.endIndex - 1)}`).join('\n'));
      return;
    }

    if (!rowRange && !colRange) { output.error('Specify --rows or --cols, or use --list'); return; }
    if (rowRange) {
      const parsed = parseRowRange(rowRange);
      if (!parsed) { output.error(`Invalid row range: ${rowRange}`); return; }
      const spinner = output.spinner(`${collapse ? 'Collapsing' : expand ? 'Expanding' : ungroup ? 'Removing' : 'Creating'} row group...`);
      if (collapse || expand) { await gsheets.updateDimensionGroup(spreadsheetId, sheetId, 'ROWS', parsed.start, parsed.end, collapse); }
      else if (ungroup) { await gsheets.deleteDimensionGroup(spreadsheetId, sheetId, 'ROWS', parsed.start, parsed.end); }
      else { await gsheets.addDimensionGroup(spreadsheetId, sheetId, 'ROWS', parsed.start, parsed.end); }
      spinner.success(`${collapse ? 'Collapsed' : expand ? 'Expanded' : ungroup ? 'Removed' : 'Created'} row group ${rowRange}`);
    }
    if (colRange) {
      const parsed = parseColRange(colRange);
      if (!parsed) { output.error(`Invalid column range: ${colRange}`); return; }
      const spinner = output.spinner(`${collapse ? 'Collapsing' : expand ? 'Expanding' : ungroup ? 'Removing' : 'Creating'} column group...`);
      if (collapse || expand) { await gsheets.updateDimensionGroup(spreadsheetId, sheetId, 'COLUMNS', parsed.start, parsed.end, collapse); }
      else if (ungroup) { await gsheets.deleteDimensionGroup(spreadsheetId, sheetId, 'COLUMNS', parsed.start, parsed.end); }
      else { await gsheets.addDimensionGroup(spreadsheetId, sheetId, 'COLUMNS', parsed.start, parsed.end); }
      spinner.success(`${collapse ? 'Collapsed' : expand ? 'Expanded' : ungroup ? 'Removed' : 'Created'} column group ${colRange}`);
    }
  },
};

// ============================================================
// Protection Commands
// ============================================================

const protectCommand: Command = {
  name: 'protect',
  description: 'Protect a sheet or range from editing',
  args: [{ name: 'id', description: 'Spreadsheet ID or URL', required: true }],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name to protect' },
    { name: 'range', short: 'r', type: 'string', description: 'Range to protect' },
    { name: 'description', short: 'd', type: 'string', description: 'Description for the protection' },
    { name: 'warning', short: 'w', type: 'boolean', description: 'Show warning instead of blocking' },
    { name: 'list', short: 'l', type: 'boolean', description: 'List existing protections' },
  ],
  examples: ['uni gsheets protect ID --sheet "Data"', 'uni gsheets protect ID --list'],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const sheetName = flags.sheet as string | undefined;
    const rangeStr = flags.range as string | undefined;
    const description = flags.description as string | undefined;
    const warningOnly = flags.warning as boolean;
    const listProtections = flags.list as boolean;
    const spinner = output.spinner(listProtections ? 'Fetching protections...' : 'Adding protection...');
    const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);
    if (!targetSheet) { spinner.fail('Sheet not found'); return; }

    if (listProtections) {
      const protections = await gsheets.listProtections(spreadsheetId);
      spinner.stop();
      if (globalFlags.json) { output.json({ spreadsheetId, protections }); return; }
      if (protections.length === 0) { console.log(c.dim('No protections found.')); } else {
        console.log(c.bold(`Protections (${protections.length}):`));
        for (const p of protections) { console.log(`  ${c.cyan(`ID: ${p.protectedRangeId}`)} ${p.description || ''}`); }
      }
      return;
    }

    let range: { sheetId: number; startRowIndex?: number; endRowIndex?: number; startColumnIndex?: number; endColumnIndex?: number; } | undefined;
    if (rangeStr) {
      const parsed = parseRange(rangeStr);
      if (!parsed) { spinner.fail(`Invalid range: ${rangeStr}`); return; }
      range = { sheetId: targetSheet.properties.sheetId, startRowIndex: parsed.startRow, endRowIndex: parsed.endRow, startColumnIndex: parsed.startCol, endColumnIndex: parsed.endCol };
    }
    await gsheets.addProtection(spreadsheetId, targetSheet.properties.sheetId, range, description, warningOnly);
    spinner.success(`Protected ${rangeStr || targetSheet.properties.title}`);
    if (globalFlags.json) { output.json({ spreadsheetId, sheet: targetSheet.properties.title, range: rangeStr, description, warningOnly }); }
  },
};

const unprotectCommand: Command = {
  name: 'unprotect',
  description: 'Remove protection from a range',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'protectedRangeId', description: 'Protected range ID to remove', required: false },
  ],
  options: [{ name: 'list', short: 'l', type: 'boolean', description: 'List all protected ranges' }],
  examples: ['uni gsheets unprotect ID --list', 'uni gsheets unprotect ID 123456'],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const listOnly = flags.list as boolean;
    if (listOnly) {
      const spinner = output.spinner('Fetching protected ranges...');
      const spreadsheet = await gsheets.getSpreadsheet(spreadsheetId);
      const protectedRanges: Array<{ id: number; sheetTitle: string; description?: string }> = [];
      for (const sheet of spreadsheet.sheets || []) {
        for (const pr of sheet.protectedRanges || []) {
          protectedRanges.push({ id: pr.protectedRangeId, sheetTitle: sheet.properties.title, description: pr.description });
        }
      }
      spinner.stop();
      if (globalFlags.json) { output.json(protectedRanges); return; }
      if (protectedRanges.length === 0) { output.text('No protected ranges found'); } else {
        output.text(c.bold('Protected Ranges:\n'));
        for (const pr of protectedRanges) { output.text(`  ${c.cyan(pr.id.toString())} - ${pr.sheetTitle}${pr.description ? ` - ${pr.description}` : ''}`); }
      }
      return;
    }
    if (!args.protectedRangeId) { output.error('Protected range ID is required. Use --list to see IDs.'); return; }
    const protectedRangeId = parseInt(args.protectedRangeId as string, 10);
    if (isNaN(protectedRangeId)) { output.error('Protected range ID must be a number'); return; }
    const spinner = output.spinner('Removing protection...');
    await gsheets.deleteProtectedRange(spreadsheetId, protectedRangeId);
    spinner.success(`Removed protected range ${protectedRangeId}`);
    if (globalFlags.json) { output.json({ protectedRangeId, removed: true }); }
  },
};

// ============================================================
// Content Features
// ============================================================

const noteCommand: Command = {
  name: 'note',
  description: 'Add, view, or remove cell notes',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'cell', description: 'Cell reference (e.g., A1)', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name' },
    { name: 'set', type: 'string', description: 'Set note text' },
    { name: 'remove', short: 'r', type: 'boolean', description: 'Remove note' },
  ],
  examples: ['uni gsheets note ID A1', 'uni gsheets note ID B2 --set "Remember this"', 'uni gsheets note ID C3 --remove'],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const cellRef = (args.cell as string).toUpperCase();
    const sheetName = flags.sheet as string | undefined;
    const noteText = flags.set as string | undefined;
    const removeNote = flags.remove as boolean;
    const spinner = output.spinner(noteText ? 'Setting note...' : removeNote ? 'Removing note...' : 'Getting note...');
    const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);
    if (!targetSheet) { spinner.fail('Sheet not found'); return; }
    const range = parseRange(cellRef);
    if (!range) { spinner.fail(`Invalid cell: ${cellRef}`); return; }

    if (noteText !== undefined || removeNote) {
      await gsheets.setNote(spreadsheetId, targetSheet.properties.sheetId, range.startRow, range.startCol, removeNote ? '' : noteText || '');
      spinner.success(`${removeNote ? 'Removed note from' : 'Set note on'} ${cellRef}`);
      if (globalFlags.json) { output.json({ spreadsheetId, cell: cellRef, action: removeNote ? 'removed' : 'set', note: removeNote ? null : noteText }); }
    } else {
      const note = await gsheets.getNote(spreadsheetId, targetSheet.properties.title, range.startRow, range.startCol);
      spinner.stop();
      if (globalFlags.json) { output.json({ spreadsheetId, cell: cellRef, note: note || null }); return; }
      if (note) { console.log(`${c.cyan('Cell:')} ${cellRef}\n${c.cyan('Note:')} ${note}`); } else { console.log(c.dim(`No note on cell ${cellRef}`)); }
    }
  },
};

const hyperlinkCommand: Command = {
  name: 'hyperlink',
  description: 'Add or remove hyperlinks from cells',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Cell or range (e.g., A1)', required: true },
  ],
  options: [
    { name: 'url', short: 'u', type: 'string', description: 'URL to link to' },
    { name: 'clear', short: 'c', type: 'boolean', description: 'Remove hyperlink' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name' },
  ],
  examples: ['uni gsheets hyperlink ID A1 --url "https://example.com"', 'uni gsheets hyperlink ID A1 --clear'],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rangeDef = args.range as string;
    const url = flags.url as string | undefined;
    const clear = flags.clear as boolean;
    const sheetName = flags.sheet as string | undefined;
    if (!url && !clear) { output.error('Specify --url to add a link or --clear to remove'); return; }
    const parsed = parseRange(rangeDef);
    if (!parsed) { output.error(`Invalid range: ${rangeDef}`); return; }
    const spinner = output.spinner(clear ? 'Removing hyperlink...' : 'Adding hyperlink...');
    const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);
    if (!targetSheet) { spinner.fail('Sheet not found'); return; }
    const range = { sheetId: targetSheet.properties.sheetId, startRowIndex: parsed.startRow, endRowIndex: parsed.endRow, startColumnIndex: parsed.startCol, endColumnIndex: parsed.endCol };
    if (clear) { await gsheets.clearHyperlink(spreadsheetId, range); spinner.success(`Removed hyperlink from ${rangeDef}`); }
    else { await gsheets.setHyperlink(spreadsheetId, range, url!); spinner.success(`Added hyperlink to ${rangeDef}`); }
    if (globalFlags.json) { output.json({ range: rangeDef, url: clear ? null : url, cleared: clear }); }
  },
};

const imageCommand: Command = {
  name: 'image',
  description: 'Insert an image into a cell',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'cell', description: 'Target cell (e.g., A1)', required: true },
    { name: 'url', description: 'Image URL', required: true },
  ],
  options: [
    { name: 'mode', short: 'm', type: 'string', description: 'Insert mode: 1 (fit), 2 (stretch), 3 (original), 4 (custom)' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name' },
  ],
  examples: ['uni gsheets image ID A1 "https://example.com/logo.png"'],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const cellDef = args.cell as string;
    const imageUrl = args.url as string;
    const modeStr = flags.mode as string | undefined;
    const sheetName = flags.sheet as string | undefined;
    const cell = parseCell(cellDef);
    if (!cell) { output.error(`Invalid cell: ${cellDef}`); return; }
    let mode: 1 | 2 | 3 | 4 | undefined;
    if (modeStr) { const m = parseInt(modeStr, 10); if (m >= 1 && m <= 4) mode = m as 1 | 2 | 3 | 4; }
    const spinner = output.spinner(`Inserting image into ${cellDef}...`);
    const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);
    if (!targetSheet) { spinner.fail('Sheet not found'); return; }
    await gsheets.insertImage(spreadsheetId, { sheetId: targetSheet.properties.sheetId, rowIndex: cell.row, columnIndex: cell.col }, imageUrl, mode);
    spinner.success(`Inserted image into ${cellDef}`);
    if (globalFlags.json) { output.json({ cell: cellDef, url: imageUrl, mode }); }
  },
};

const validateCommand: Command = {
  name: 'validate',
  description: 'Set data validation rules on cells',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Cell range (e.g., A1:A100)', required: true },
  ],
  options: [
    { name: 'type', short: 't', type: 'string', description: 'Type: list, number, date, checkbox, text, custom' },
    { name: 'values', short: 'v', type: 'string', description: 'Comma-separated values for list validation' },
    { name: 'min', type: 'string', description: 'Minimum value for number validation' },
    { name: 'max', type: 'string', description: 'Maximum value for number validation' },
    { name: 'formula', short: 'f', type: 'string', description: 'Custom formula' },
    { name: 'clear', short: 'c', type: 'boolean', description: 'Clear validation' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name' },
  ],
  examples: ['uni gsheets validate ID A1:A100 --type list --values "Yes,No,Maybe"', 'uni gsheets validate ID B1:B50 --type number --min 0 --max 100'],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rangeDef = args.range as string;
    const sheetName = flags.sheet as string | undefined;
    const clearValidation = flags.clear as boolean;
    const validationType = flags.type as string | undefined;
    const values = flags.values as string | undefined;
    const min = flags.min as string | undefined;
    const max = flags.max as string | undefined;
    const formula = flags.formula as string | undefined;
    const spinner = output.spinner(clearValidation ? 'Clearing validation...' : 'Setting validation...');
    const parsed = parseRange(rangeDef);
    if (!parsed) { spinner.fail(`Invalid range: ${rangeDef}`); return; }
    const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);
    if (!targetSheet) { spinner.fail('Sheet not found'); return; }
    const range = { sheetId: targetSheet.properties.sheetId, startRowIndex: parsed.startRow, endRowIndex: parsed.endRow, startColumnIndex: parsed.startCol, endColumnIndex: parsed.endCol };
    if (clearValidation) {
      await gsheets.setDataValidation(spreadsheetId, range, null);
      spinner.success(`Cleared validation from ${rangeDef}`);
      if (globalFlags.json) { output.json({ cleared: rangeDef }); }
      return;
    }
    if (!validationType) { spinner.fail('--type is required'); return; }
    let rule: Parameters<typeof gsheets.setDataValidation>[2];
    switch (validationType) {
      case 'list': rule = { type: 'list', values: values ? values.split(',').map(v => v.trim()) : [], strict: true, showDropdown: true }; break;
      case 'number': rule = { type: 'number', min: min ? parseFloat(min) : undefined, max: max ? parseFloat(max) : undefined, strict: true }; break;
      case 'checkbox': rule = { type: 'checkbox', strict: true }; break;
      case 'custom': rule = { type: 'custom', formula: formula || '', strict: true }; break;
      default: spinner.fail(`Unknown type: ${validationType}`); return;
    }
    await gsheets.setDataValidation(spreadsheetId, range, rule);
    spinner.success(`Set ${validationType} validation on ${rangeDef}`);
    if (globalFlags.json) { output.json({ range: rangeDef, type: validationType }); }
  },
};

const namedRangeCommand: Command = {
  name: 'named-range',
  description: 'Manage named ranges',
  args: [{ name: 'id', description: 'Spreadsheet ID or URL', required: true }],
  options: [
    { name: 'list', short: 'l', type: 'boolean', description: 'List all named ranges' },
    { name: 'add', short: 'a', type: 'string', description: 'Add named range (name)' },
    { name: 'range', short: 'r', type: 'string', description: 'Range for add/update' },
    { name: 'remove', type: 'string', description: 'Remove named range by name or ID' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name' },
  ],
  examples: ['uni gsheets named-range ID --list', 'uni gsheets named-range ID --add "DataRange" --range A1:D100'],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const list = flags.list as boolean;
    const addName = flags.add as string | undefined;
    const rangeDef = flags.range as string | undefined;
    const removeName = flags.remove as string | undefined;
    const sheetName = flags.sheet as string | undefined;

    if (list || (!addName && !removeName)) {
      const spinner = output.spinner('Fetching named ranges...');
      const ranges = await gsheets.listNamedRanges(spreadsheetId);
      spinner.stop();
      if (globalFlags.json) { output.json({ namedRanges: ranges }); return; }
      if (ranges.length === 0) { console.log(c.dim('No named ranges defined')); return; }
      console.log(c.bold('Named Ranges:'));
      for (const nr of ranges) { console.log(`  ${c.cyan(nr.name)}: ${nr.range}`); }
      return;
    }

    const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);
    if (!targetSheet) { output.error('Sheet not found'); return; }

    if (addName) {
      if (!rangeDef) { output.error('--range is required'); return; }
      const parsed = parseRange(rangeDef);
      if (!parsed) { output.error(`Invalid range: ${rangeDef}`); return; }
      const spinner = output.spinner(`Adding named range "${addName}"...`);
      const namedRangeId = await gsheets.addNamedRange(spreadsheetId, addName, { sheetId: targetSheet.properties.sheetId, startRowIndex: parsed.startRow, endRowIndex: parsed.endRow, startColumnIndex: parsed.startCol, endColumnIndex: parsed.endCol });
      spinner.success(`Added named range "${addName}"`);
      if (globalFlags.json) { output.json({ namedRangeId, name: addName, range: rangeDef }); }
      return;
    }

    if (removeName) {
      const spinner = output.spinner(`Removing named range "${removeName}"...`);
      const ranges = await gsheets.listNamedRanges(spreadsheetId);
      const found = ranges.find(r => r.name === removeName || r.namedRangeId === removeName);
      if (!found) { spinner.fail(`Named range "${removeName}" not found`); return; }
      await gsheets.deleteNamedRange(spreadsheetId, found.namedRangeId);
      spinner.success(`Removed named range "${found.name}"`);
      if (globalFlags.json) { output.json({ removed: found.name, namedRangeId: found.namedRangeId }); }
    }
  },
};

// ============================================================
// Advanced Features
// ============================================================

const filterViewCommand: Command = {
  name: 'filter-view',
  description: 'Manage saved filter views',
  args: [{ name: 'id', description: 'Spreadsheet ID or URL', required: true }],
  options: [
    { name: 'list', short: 'l', type: 'boolean', description: 'List all filter views' },
    { name: 'add', short: 'a', type: 'string', description: 'Add filter view with name' },
    { name: 'range', short: 'r', type: 'string', description: 'Range for new filter view' },
    { name: 'remove', type: 'string', description: 'Remove filter view by ID' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name' },
  ],
  examples: ['uni gsheets filter-view ID --list', 'uni gsheets filter-view ID --add "My Filter" --range A1:E100'],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const list = flags.list as boolean;
    const addName = flags.add as string | undefined;
    const rangeDef = flags.range as string | undefined;
    const removeId = flags.remove as string | undefined;
    const sheetName = flags.sheet as string | undefined;

    if (list || (!addName && !removeId)) {
      const spinner = output.spinner('Fetching filter views...');
      const views = await gsheets.listFilterViews(spreadsheetId);
      spinner.stop();
      if (globalFlags.json) { output.json({ filterViews: views }); return; }
      if (views.length === 0) { console.log(c.dim('No filter views defined')); return; }
      console.log(c.bold('Filter Views:'));
      for (const fv of views) { console.log(`  ${c.cyan(fv.title)}: ${fv.range}`); }
      return;
    }

    const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);
    if (!targetSheet) { output.error('Sheet not found'); return; }

    if (addName) {
      if (!rangeDef) { output.error('--range is required'); return; }
      const parsed = parseRange(rangeDef);
      if (!parsed) { output.error(`Invalid range: ${rangeDef}`); return; }
      const spinner = output.spinner(`Adding filter view "${addName}"...`);
      const filterViewId = await gsheets.addFilterView(spreadsheetId, addName, { sheetId: targetSheet.properties.sheetId, startRowIndex: parsed.startRow, endRowIndex: parsed.endRow, startColumnIndex: parsed.startCol, endColumnIndex: parsed.endCol });
      spinner.success(`Added filter view "${addName}"`);
      if (globalFlags.json) { output.json({ filterViewId, name: addName, range: rangeDef }); }
      return;
    }

    if (removeId) {
      const spinner = output.spinner('Removing filter view...');
      await gsheets.deleteFilterView(spreadsheetId, parseInt(removeId, 10));
      spinner.success(`Removed filter view ${removeId}`);
      if (globalFlags.json) { output.json({ removed: parseInt(removeId, 10) }); }
    }
  },
};

const pivotCommand: Command = {
  name: 'pivot',
  description: 'Create a pivot table',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'source', description: 'Source data range (e.g., A1:E100)', required: true },
    { name: 'dest', description: 'Destination cell (e.g., G1)', required: true },
  ],
  options: [
    { name: 'rows', short: 'r', type: 'string', description: 'Row grouping columns (0-indexed, comma-separated)' },
    { name: 'cols', short: 'c', type: 'string', description: 'Column grouping columns' },
    { name: 'values', short: 'v', type: 'string', description: 'Value columns with function (e.g., "2:SUM,3:AVERAGE")' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name' },
  ],
  examples: ['uni gsheets pivot ID A1:E100 G1 --rows 0 --values "2:SUM"'],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const sourceRange = args.source as string;
    const destCell = args.dest as string;
    const rowsStr = flags.rows as string | undefined;
    const colsStr = flags.cols as string | undefined;
    const valuesStr = flags.values as string | undefined;
    const sheetName = flags.sheet as string | undefined;

    const sourceParsed = parseRange(sourceRange);
    if (!sourceParsed) { output.error(`Invalid source range: ${sourceRange}`); return; }
    const destParsed = parseCell(destCell);
    if (!destParsed) { output.error(`Invalid destination cell: ${destCell}`); return; }
    if (!valuesStr) { output.error('--values is required'); return; }

    const spinner = output.spinner('Creating pivot table...');
    const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);
    if (!targetSheet) { spinner.fail('Sheet not found'); return; }
    const sheetId = targetSheet.properties.sheetId;

    const rows = rowsStr ? rowsStr.split(',').map(r => ({ sourceColumnOffset: parseInt(r.trim(), 10) })) : [];
    const columns = colsStr ? colsStr.split(',').map(col => ({ sourceColumnOffset: parseInt(col.trim(), 10) })) : [];
    const funcMap: Record<string, 'SUM' | 'COUNT' | 'AVERAGE' | 'MAX' | 'MIN'> = { SUM: 'SUM', COUNT: 'COUNT', AVERAGE: 'AVERAGE', AVG: 'AVERAGE', MAX: 'MAX', MIN: 'MIN' };
    const values = valuesStr.split(',').map(v => {
      const [col, func] = v.trim().split(':');
      return { sourceColumnOffset: parseInt(col, 10), summarizeFunction: funcMap[func?.toUpperCase() || 'SUM'] || 'SUM' };
    });

    await gsheets.createPivotTable(spreadsheetId, { sheetId, startRowIndex: sourceParsed.startRow, endRowIndex: sourceParsed.endRow, startColumnIndex: sourceParsed.startCol, endColumnIndex: sourceParsed.endCol }, { sheetId, rowIndex: destParsed.row, columnIndex: destParsed.col }, rows, columns, values);
    spinner.success(`Created pivot table at ${destCell}`);
    if (globalFlags.json) { output.json({ source: sourceRange, destination: destCell }); }
  },
};

const slicerCommand: Command = {
  name: 'slicer',
  description: 'Add, list, or delete slicers',
  args: [{ name: 'id', description: 'Spreadsheet ID or URL', required: true }],
  options: [
    { name: 'add', short: 'a', type: 'boolean', description: 'Add a new slicer' },
    { name: 'list', short: 'l', type: 'boolean', description: 'List all slicers' },
    { name: 'delete', short: 'd', type: 'string', description: 'Delete slicer by ID' },
    { name: 'anchor', type: 'string', description: 'Anchor cell for slicer' },
    { name: 'data-range', type: 'string', description: 'Data range to filter' },
    { name: 'column', short: 'c', type: 'string', description: 'Column index to filter (0-based)' },
    { name: 'title', short: 't', type: 'string', description: 'Slicer title' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name' },
  ],
  examples: ['uni gsheets slicer ID --list', 'uni gsheets slicer ID --add --anchor E1 --data-range A1:D100 --column 0'],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const addSlicer = flags.add as boolean;
    const listSlicers = flags.list as boolean;
    const deleteSlicerId = flags.delete as string | undefined;
    const sheetName = flags.sheet as string | undefined;

    if (listSlicers) {
      const spinner = output.spinner('Fetching slicers...');
      const slicers = await gsheets.listSlicers(spreadsheetId);
      spinner.stop();
      if (globalFlags.json) { output.json(slicers); return; }
      if (slicers.length === 0) { output.text('No slicers found'); } else {
        output.text(c.bold('Slicers:\n'));
        for (const s of slicers) { output.text(`  ${c.cyan(s.slicerId.toString())} - ${s.title || '(no title)'}`); }
      }
      return;
    }

    if (deleteSlicerId) {
      const slicerId = parseInt(deleteSlicerId, 10);
      const spinner = output.spinner('Deleting slicer...');
      await gsheets.deleteSlicer(spreadsheetId, slicerId);
      spinner.success(`Deleted slicer ${slicerId}`);
      if (globalFlags.json) { output.json({ slicerId, deleted: true }); }
      return;
    }

    if (addSlicer) {
      const anchor = flags.anchor as string | undefined;
      const dataRange = flags['data-range'] as string | undefined;
      const columnStr = flags.column as string | undefined;
      const title = flags.title as string | undefined;
      if (!anchor || !dataRange || columnStr === undefined) { output.error('--anchor, --data-range, and --column are required'); return; }
      const anchorCell = parseCell(anchor);
      const range = parseRange(dataRange);
      if (!anchorCell || !range) { output.error('Invalid anchor or range'); return; }
      const filterColumnIndex = parseInt(columnStr, 10);
      const spinner = output.spinner('Adding slicer...');
      const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);
      if (!targetSheet) { spinner.fail('Sheet not found'); return; }
      const sheetId = targetSheet.properties.sheetId;
      const slicerId = await gsheets.addSlicer(spreadsheetId, sheetId, { columnIndex: anchorCell.col, rowIndex: anchorCell.row }, { sheetId, startRowIndex: range.startRow, endRowIndex: range.endRow, startColumnIndex: range.startCol, endColumnIndex: range.endCol }, filterColumnIndex, title);
      spinner.success(`Created slicer ${slicerId}`);
      if (globalFlags.json) { output.json({ slicerId, anchor, dataRange, filterColumnIndex, title }); }
      return;
    }

    output.error('Specify --add, --list, or --delete');
  },
};

const textToColsCommand: Command = {
  name: 'text-to-cols',
  description: 'Split text in cells into multiple columns',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Source range (e.g., A1:A100)', required: true },
  ],
  options: [
    { name: 'delimiter', short: 'd', type: 'string', description: 'Delimiter: comma, semicolon, period, space, custom' },
    { name: 'custom', short: 'c', type: 'string', description: 'Custom delimiter string' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name' },
  ],
  examples: ['uni gsheets text-to-cols ID A1:A100 --delimiter comma'],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rangeDef = args.range as string;
    const delimiter = flags.delimiter as string | undefined;
    const customDelimiter = flags.custom as string | undefined;
    const sheetName = flags.sheet as string | undefined;
    if (!delimiter) { output.error('--delimiter is required'); return; }
    const parsed = parseRange(rangeDef);
    if (!parsed) { output.error(`Invalid range: ${rangeDef}`); return; }
    const delimiterMap: Record<string, 'COMMA' | 'SEMICOLON' | 'PERIOD' | 'SPACE' | 'CUSTOM'> = { comma: 'COMMA', semicolon: 'SEMICOLON', period: 'PERIOD', space: 'SPACE', custom: 'CUSTOM' };
    const delimiterType = delimiterMap[delimiter.toLowerCase()];
    if (!delimiterType) { output.error(`Invalid delimiter: ${delimiter}`); return; }
    const spinner = output.spinner(`Splitting text by ${delimiter}...`);
    const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);
    if (!targetSheet) { spinner.fail('Sheet not found'); return; }
    await gsheets.textToColumns(spreadsheetId, { sheetId: targetSheet.properties.sheetId, startRowIndex: parsed.startRow, endRowIndex: parsed.endRow, startColumnIndex: parsed.startCol, endColumnIndex: parsed.endCol }, delimiterType, customDelimiter);
    spinner.success(`Split text in ${rangeDef}`);
    if (globalFlags.json) { output.json({ range: rangeDef, delimiter }); }
  },
};

const autofillCommand: Command = {
  name: 'autofill',
  description: 'Auto-fill cells based on a pattern',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'source', description: 'Source range with pattern (e.g., A1:A2)', required: true },
  ],
  options: [
    { name: 'count', short: 'n', type: 'string', description: 'Number of cells to fill' },
    { name: 'direction', short: 'd', type: 'string', description: 'Direction: down, right (default: down)' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name' },
  ],
  examples: ['uni gsheets autofill ID A1:A2 --count 10'],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const sourceDef = args.source as string;
    const countStr = flags.count as string | undefined;
    const direction = (flags.direction as string | undefined) || 'down';
    const sheetName = flags.sheet as string | undefined;
    if (!countStr) { output.error('--count is required'); return; }
    const count = parseInt(countStr, 10);
    const parsed = parseRange(sourceDef);
    if (!parsed) { output.error(`Invalid source range: ${sourceDef}`); return; }
    const dimension = direction.toLowerCase() === 'right' ? 'COLUMNS' : 'ROWS';
    const spinner = output.spinner(`Auto-filling ${count} cells ${direction}...`);
    const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);
    if (!targetSheet) { spinner.fail('Sheet not found'); return; }
    await gsheets.autoFill(spreadsheetId, { sheetId: targetSheet.properties.sheetId, startRowIndex: parsed.startRow, endRowIndex: parsed.endRow, startColumnIndex: parsed.startCol, endColumnIndex: parsed.endCol }, count, dimension);
    spinner.success(`Auto-filled ${count} cells ${direction} from ${sourceDef}`);
    if (globalFlags.json) { output.json({ source: sourceDef, count, direction }); }
  },
};

const copyPasteCommand: Command = {
  name: 'copy-paste',
  description: 'Copy and paste a range to another location',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'source', description: 'Source range (e.g., A1:B10)', required: true },
    { name: 'dest', description: 'Destination cell (e.g., D1)', required: true },
  ],
  options: [
    { name: 'type', short: 't', type: 'string', description: 'Paste type: normal, values, format, formula' },
    { name: 'sheet', short: 's', type: 'string', description: 'Source sheet name' },
    { name: 'dest-sheet', type: 'string', description: 'Destination sheet name' },
  ],
  examples: ['uni gsheets copy-paste ID A1:B10 D1', 'uni gsheets copy-paste ID A1:C5 A10 --type values'],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const sourceRange = args.source as string;
    const destCell = args.dest as string;
    const pasteType = flags.type as string | undefined;
    const sheetName = flags.sheet as string | undefined;
    const destSheetName = flags['dest-sheet'] as string | undefined;

    const sourceParsed = parseRange(sourceRange);
    if (!sourceParsed) { output.error(`Invalid source range: ${sourceRange}`); return; }
    const destParsed = parseCell(destCell);
    if (!destParsed) { output.error(`Invalid destination cell: ${destCell}`); return; }

    const spinner = output.spinner(`Copying ${sourceRange} to ${destCell}...`);
    const { sheets } = await getTargetSheet(spreadsheetId);
    const sourceSheet = sheetName ? sheets.find(s => s.properties.title.toLowerCase() === sheetName.toLowerCase()) : sheets[0];
    const destSheet = destSheetName ? sheets.find(s => s.properties.title.toLowerCase() === destSheetName.toLowerCase()) : sourceSheet;

    if (!sourceSheet || !destSheet) { spinner.fail('Sheet not found'); return; }

    const typeMap: Record<string, string> = { normal: 'PASTE_NORMAL', values: 'PASTE_VALUES', format: 'PASTE_FORMAT', formula: 'PASTE_FORMULA' };
    const mappedType = pasteType ? (typeMap[pasteType] || 'PASTE_NORMAL') : undefined;

    await gsheets.copyPaste(spreadsheetId, { sheetId: sourceSheet.properties.sheetId, startRowIndex: sourceParsed.startRow, endRowIndex: sourceParsed.endRow, startColumnIndex: sourceParsed.startCol, endColumnIndex: sourceParsed.endCol }, { sheetId: destSheet.properties.sheetId, startRowIndex: destParsed.row, startColumnIndex: destParsed.col }, mappedType as Parameters<typeof gsheets.copyPaste>[3]);
    spinner.success(`Copied ${sourceRange} to ${destCell}`);
    if (globalFlags.json) { output.json({ source: sourceRange, destination: destCell, pasteType: pasteType || 'normal' }); }
  },
};

// ============================================================
// Import/Export Commands
// ============================================================

const exportCommand: Command = {
  name: 'export',
  description: 'Export spreadsheet data to CSV/TSV file',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'output', description: 'Output file path (e.g., data.csv)', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name' },
    { name: 'range', short: 'r', type: 'string', description: 'Range to export' },
    { name: 'format', short: 'f', type: 'string', description: 'Format: csv, tsv' },
  ],
  examples: ['uni gsheets export ID data.csv', 'uni gsheets export ID data.tsv --sheet "Sales"'],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const outputPath = args.output as string;
    const sheetName = flags.sheet as string | undefined;
    const rangeArg = flags.range as string | undefined;
    let format = flags.format as string | undefined;
    if (!format) { format = outputPath.endsWith('.tsv') ? 'tsv' : 'csv'; }
    const delimiter = format === 'tsv' ? '\t' : ',';
    const spinner = output.spinner('Exporting data...');
    const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);
    if (!targetSheet) { spinner.fail('Sheet not found'); return; }
    const range = rangeArg ? (rangeArg.includes('!') ? rangeArg : `${targetSheet.properties.title}!${rangeArg}`) : `${targetSheet.properties.title}!A1:ZZ10000`;
    const values = await gsheets.getValues(spreadsheetId, range);
    if (values.length === 0) { spinner.fail('No data to export'); return; }
    const escapeCell = (cell: string) => { if (format === 'csv' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) { return `"${cell.replace(/"/g, '""')}"`; } return cell; };
    const content = values.map(row => row.map(cell => escapeCell(cell || '')).join(delimiter)).join('\n');
    fs.writeFileSync(outputPath, content, 'utf-8');
    output.pipe(outputPath);
    spinner.success(`Exported ${values.length} rows to ${outputPath}`);
    if (globalFlags.json) { output.json({ spreadsheetId, outputPath, format, rows: values.length }); }
  },
};

const importCommand: Command = {
  name: 'import',
  description: 'Import CSV/TSV file into spreadsheet',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'file', description: 'Path to CSV or TSV file', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name' },
    { name: 'range', short: 'r', type: 'string', description: 'Starting cell (default: A1)' },
    { name: 'delimiter', short: 'd', type: 'string', description: 'Delimiter: comma, tab, pipe' },
    { name: 'append', short: 'a', type: 'boolean', description: 'Append to existing data' },
  ],
  examples: ['uni gsheets import ID data.csv', 'uni gsheets import ID data.tsv --range B2'],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gsheets.isAuthenticated()) { output.error('Not authenticated. Run "uni gsheets auth" first.'); return; }
    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const filePath = args.file as string;
    const sheetName = flags.sheet as string | undefined;
    const startRange = (flags.range as string) || 'A1';
    const delimiterFlag = flags.delimiter as string | undefined;
    const appendMode = flags.append as boolean;
    if (!fs.existsSync(filePath)) { output.error(`File not found: ${filePath}`); return; }
    const spinner = output.spinner(`Importing ${filePath}...`);
    const content = fs.readFileSync(filePath, 'utf-8');
    let delimiter = ',';
    if (delimiterFlag) { delimiter = delimiterFlag === 'tab' ? '\t' : delimiterFlag === 'pipe' ? '|' : delimiterFlag; }
    else if (filePath.endsWith('.tsv')) { delimiter = '\t'; }
    const rows = parseDelimited(content, delimiter);
    if (rows.length === 0) { spinner.fail('No data found in file'); return; }
    const { targetSheet } = await getTargetSheet(spreadsheetId, sheetName);
    if (!targetSheet) { spinner.fail('Sheet not found'); return; }
    let range = startRange;
    if (!range.includes('!')) { range = `${targetSheet.properties.title}!${range}`; }
    if (appendMode) { await gsheets.appendRows(spreadsheetId, range, rows); }
    else { await gsheets.setValues(spreadsheetId, range, rows); }
    const cellCount = rows.reduce((sum, row) => sum + row.length, 0);
    output.pipe(`${rows.length}`);
    spinner.success(`Imported ${rows.length} rows (${cellCount} cells)`);
    if (globalFlags.json) { output.json({ spreadsheetId, file: filePath, rows: rows.length, cells: cellCount, range, mode: appendMode ? 'append' : 'overwrite' }); }
  },
};

// ============================================================
// Export All Commands
// ============================================================
export const commands: Command[] = [
  // CRUD
  createCommand, listCommand, getCommand, setCommand, deleteCommand,
  renameCommand, copyCommand, shareCommand, clearCommand, appendCommand,
  // Sheets
  sheetsCommand,
  // Search & Sort
  findCommand, sortCommand, filterCommand, statsCommand, compareCommand,
  // Formatting
  formatCommand, alignCommand, borderCommand, mergeCommand, freezeCommand,
  hideCommand, wrapCommand, rotateCommand, numberFormatCommand, resizeCommand,
  bandingCommand, condFormatCommand,
  // Charts
  chartCommand, chartsCommand, chartDeleteCommand, chartMoveCommand, chartUpdateCommand,
  // Dimensions
  insertCommand, deleteRowsCommand, deleteColsCommand, moveDimCommand, groupCommand,
  // Protection
  protectCommand, unprotectCommand,
  // Content
  noteCommand, hyperlinkCommand, imageCommand, validateCommand, namedRangeCommand,
  // Advanced
  filterViewCommand, pivotCommand, slicerCommand, textToColsCommand, autofillCommand, copyPasteCommand,
  // Import/Export
  exportCommand, importCommand,
  // Auth
  authCommand,
];
