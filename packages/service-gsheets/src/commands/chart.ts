/**
 * uni gsheets chart - Create charts from data
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

/**
 * Parse A1 notation cell into row/column indices
 */
function parseCell(cell: string): { rowIndex: number; columnIndex: number } {
  const match = cell.match(/^([A-Z]+)(\d+)$/i);
  if (!match) {
    throw new Error(`Invalid cell: ${cell}`);
  }

  const colToIndex = (col: string) => {
    let index = 0;
    for (let i = 0; i < col.length; i++) {
      index = index * 26 + (col.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
    }
    return index - 1;
  };

  return {
    columnIndex: colToIndex(match[1].toUpperCase()),
    rowIndex: parseInt(match[2], 10) - 1,
  };
}

/**
 * Parse A1 notation range into row/column indices
 */
function parseRange(range: string): { startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number } {
  const cellPart = range.includes('!') ? range.split('!')[1] : range;

  const match = cellPart.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/i);
  if (!match) {
    throw new Error(`Invalid range: ${range}`);
  }

  const colToIndex = (col: string) => {
    let index = 0;
    for (let i = 0; i < col.length; i++) {
      index = index * 26 + (col.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
    }
    return index - 1;
  };

  const startCol = colToIndex(match[1].toUpperCase());
  const startRow = parseInt(match[2], 10) - 1;
  const endCol = match[3] ? colToIndex(match[3].toUpperCase()) + 1 : startCol + 1;
  const endRow = match[4] ? parseInt(match[4], 10) : startRow + 1;

  return {
    startRowIndex: startRow,
    endRowIndex: endRow,
    startColumnIndex: startCol,
    endColumnIndex: endCol,
  };
}

const CHART_TYPES = ['bar', 'line', 'pie', 'column', 'area', 'scatter'] as const;
type ChartType = typeof CHART_TYPES[number];

const LEGEND_POSITIONS = ['top', 'bottom', 'left', 'right', 'none'] as const;
type LegendPosition = typeof LEGEND_POSITIONS[number];

export const chartCommand: Command = {
  name: 'chart',
  description: 'Create a chart from data range',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Data range for values (e.g., B1:B10)', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
    { name: 'type', short: 't', type: 'string', description: 'Chart type: bar, line, pie, column, area, scatter (default: column)' },
    { name: 'title', type: 'string', description: 'Chart title' },
    { name: 'labels', short: 'l', type: 'string', description: 'Labels/x-axis range (e.g., A1:A10)' },
    { name: 'position', short: 'p', type: 'string', description: 'Anchor cell for chart position (e.g., I2)' },
    { name: 'width', short: 'w', type: 'number', description: 'Chart width in pixels (default: 600)' },
    { name: 'height', short: 'h', type: 'number', description: 'Chart height in pixels (default: 371)' },
    { name: 'legend', type: 'string', description: 'Legend position: top, bottom, left, right, none (default: bottom)' },
  ],
  examples: [
    'uni gsheets chart ID B1:B10 --labels A1:A10',
    'uni gsheets chart ID B1:C20 --labels A1:A20 --type bar --title "Sales"',
    'uni gsheets chart ID --sheet "Data" E1:E50 -l D1:D50 --type line',
    'uni gsheets chart ID B1:B5 --labels A1:A5 --type pie --title "Distribution"',
    'uni gsheets chart ID B1:C10 --position I2 --width 800 --height 400',
    'uni gsheets chart ID B1:B10 --sheet "Charts" --legend right --title "Revenue"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rangeStr = args.range as string;
    const labelsStr = flags.labels as string | undefined;
    const sheetName = flags.sheet as string | undefined;
    const chartTypeArg = ((flags.type as string) || 'column').toLowerCase() as ChartType;
    const title = flags.title as string | undefined;
    const positionStr = flags.position as string | undefined;
    const width = (flags.width as number) || 600;
    const height = (flags.height as number) || 371;
    const legendArg = ((flags.legend as string) || 'bottom').toLowerCase() as LegendPosition;

    // Validate chart type
    if (!CHART_TYPES.includes(chartTypeArg)) {
      output.error(`Invalid chart type: ${chartTypeArg}. Use: ${CHART_TYPES.join(', ')}`);
      return;
    }

    // Validate legend position
    if (!LEGEND_POSITIONS.includes(legendArg)) {
      output.error(`Invalid legend position: ${legendArg}. Use: ${LEGEND_POSITIONS.join(', ')}`);
      return;
    }

    const chartTypeMap: Record<ChartType, string> = {
      bar: 'BAR',
      line: 'LINE',
      pie: 'PIE',
      column: 'COLUMN',
      area: 'AREA',
      scatter: 'SCATTER',
    };

    const legendMap: Record<LegendPosition, string> = {
      top: 'TOP_LEGEND',
      bottom: 'BOTTOM_LEGEND',
      left: 'LEFT_LEGEND',
      right: 'RIGHT_LEGEND',
      none: 'NO_LEGEND',
    };

    const spinner = output.spinner(`Creating ${chartTypeArg} chart...`);

    try {
      // Get sheet ID (sort by index, fallback to sheetId 0 = first created)
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

      // Parse ranges
      const dataRange = parseRange(rangeStr);
      const labelsRange = labelsStr ? parseRange(labelsStr) : undefined;

      // Parse position or use default
      let anchorCell: { rowIndex: number; columnIndex: number };
      if (positionStr) {
        anchorCell = parseCell(positionStr);
      } else {
        // Default: place chart to the right of data
        anchorCell = { rowIndex: 0, columnIndex: dataRange.endColumnIndex + 1 };
      }

      // Create chart with all options
      const chartId = await gsheets.createChart(
        spreadsheetId,
        targetSheet.properties.sheetId,
        dataRange,
        chartTypeMap[chartTypeArg],
        title,
        labelsRange,
        {
          anchorCell,
          width,
          height,
          legendPosition: legendMap[legendArg],
        }
      );

      output.pipe(String(chartId));
      spinner.success(`${chartTypeArg.charAt(0).toUpperCase() + chartTypeArg.slice(1)} chart created`);

      if (globalFlags.json) {
        output.json({
          spreadsheetId,
          chartId,
          type: chartTypeArg,
          dataRange: rangeStr,
          labelsRange: labelsStr,
          title,
          position: positionStr || 'auto',
          width,
          height,
          legend: legendArg,
          success: true,
        });
        return;
      }

      if (!output.isPiped()) {
        console.log('');
        console.log(`${c.green('Chart created:')} ID ${chartId}`);
        const parts = [`Type: ${chartTypeArg}`, `Data: ${rangeStr}`];
        if (labelsStr) parts.push(`Labels: ${labelsStr}`);
        if (title) parts.push(`Title: ${title}`);
        console.log(c.dim(parts.join(', ')));
        console.log(c.dim(`Position: ${positionStr || 'auto'}, Size: ${width}x${height}, Legend: ${legendArg}`));
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to create chart');
      throw error;
    }
  },
};
