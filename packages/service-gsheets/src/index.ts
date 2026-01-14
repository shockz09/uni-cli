/**
 * Google Sheets Service
 */

import type { UniService } from '@uni/shared';
import { createGoogleServiceSetup } from '@uni/shared';
import { listCommand } from './commands/list';
import { getCommand } from './commands/get';
import { createCommand } from './commands/create';
import { setCommand } from './commands/set';
import { appendCommand } from './commands/append';
import { shareCommand } from './commands/share';
import { sheetsCommand } from './commands/sheets';
import { formatCommand } from './commands/format';
import { chartCommand } from './commands/chart';
import { chartsCommand } from './commands/charts';
import { chartDeleteCommand } from './commands/chart-delete';
import { chartMoveCommand } from './commands/chart-move';
import { clearCommand } from './commands/clear';
import { copyCommand } from './commands/copy';
import { importCommand } from './commands/import';
import { exportCommand } from './commands/export';
import { compareCommand } from './commands/compare';
import { deleteCommand } from './commands/delete';
import { renameCommand } from './commands/rename';
import { sortCommand } from './commands/sort';
import { statsCommand } from './commands/stats';
import { findCommand } from './commands/find';
import { noteCommand } from './commands/note';
import { condFormatCommand } from './commands/cond-format';
import { mergeCommand } from './commands/merge';
import { protectCommand } from './commands/protect';
import { authCommand } from './commands/auth';
// New commands
import { namedRangeCommand } from './commands/named-range';
import { validateCommand } from './commands/validate';
import { freezeCommand } from './commands/freeze';
import { borderCommand } from './commands/border';
import { resizeCommand } from './commands/resize';
import { hideCommand } from './commands/hide';
import { insertCommand } from './commands/insert';
import { deleteRowsCommand, deleteColsCommand } from './commands/delete-dim';
import { filterCommand } from './commands/filter';
import { filterViewCommand } from './commands/filter-view';
import { copyPasteCommand } from './commands/copy-paste';
import { groupCommand } from './commands/group';
// Batch 2 commands
import { pivotCommand } from './commands/pivot';
import { hyperlinkCommand } from './commands/hyperlink';
import { numberFormatCommand } from './commands/number-format';
import { alignCommand } from './commands/align';
import { wrapCommand } from './commands/wrap';
import { rotateCommand } from './commands/rotate';
import { chartUpdateCommand } from './commands/chart-update';
import { unprotectCommand } from './commands/unprotect';
import { slicerCommand } from './commands/slicer';
import { textToColsCommand } from './commands/text-to-cols';
import { autofillCommand } from './commands/autofill';
import { moveDimCommand } from './commands/move-dim';
import { bandingCommand } from './commands/banding';
import { imageCommand } from './commands/image';
import { gsheets } from './api';

const gsheetsService: UniService = {
  name: 'gsheets',
  description: 'Google Sheets - spreadsheets',
  version: '0.1.0',

  commands: [
    listCommand,
    getCommand,
    createCommand,
    setCommand,
    appendCommand,
    clearCommand,
    shareCommand,
    copyCommand,
    sheetsCommand,
    formatCommand,
    chartCommand,
    chartsCommand,
    chartDeleteCommand,
    chartMoveCommand,
    compareCommand,
    importCommand,
    exportCommand,
    deleteCommand,
    renameCommand,
    sortCommand,
    statsCommand,
    findCommand,
    noteCommand,
    condFormatCommand,
    mergeCommand,
    protectCommand,
    // New commands
    namedRangeCommand,
    validateCommand,
    freezeCommand,
    borderCommand,
    resizeCommand,
    hideCommand,
    insertCommand,
    deleteRowsCommand,
    deleteColsCommand,
    filterCommand,
    filterViewCommand,
    copyPasteCommand,
    groupCommand,
    // Batch 2 commands
    pivotCommand,
    hyperlinkCommand,
    numberFormatCommand,
    alignCommand,
    wrapCommand,
    rotateCommand,
    chartUpdateCommand,
    unprotectCommand,
    slicerCommand,
    textToColsCommand,
    autofillCommand,
    moveDimCommand,
    bandingCommand,
    imageCommand,
    authCommand,
  ],

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  setup: createGoogleServiceSetup('gsheets', gsheets),
};

export default gsheetsService;
