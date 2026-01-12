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
import { clearCommand } from './commands/clear';
import { copyCommand } from './commands/copy';
import { importCommand } from './commands/import';
import { compareCommand } from './commands/compare';
import { authCommand } from './commands/auth';
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
    compareCommand,
    importCommand,
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
