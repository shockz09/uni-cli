/**
 * Google Docs Service
 */

import type { UniService } from '@uni/shared';
import { createGoogleServiceSetup } from '@uni/shared';
import { listCommand } from './commands/list';
import { getCommand } from './commands/get';
import { createCommand } from './commands/create';
import { appendCommand } from './commands/append';
import { replaceCommand } from './commands/replace';
import { insertCommand } from './commands/insert';
import { findCommand } from './commands/find';
import { clearCommand } from './commands/clear';
import { importCommand } from './commands/import';
import { shareCommand } from './commands/share';
import { exportCommand } from './commands/export';
import { deleteCommand } from './commands/delete';
import { renameCommand } from './commands/rename';
import { authCommand } from './commands/auth';
// New commands
import { formatCommand } from './commands/format';
import { styleCommand } from './commands/style';
import { bulletsCommand } from './commands/bullets';
import { tableCommand } from './commands/table';
import { linkCommand } from './commands/link';
import { pageBreakCommand } from './commands/page-break';
import { headerCommand } from './commands/header';
import { footerCommand } from './commands/footer';
// Enhanced commands
import { statsCommand } from './commands/stats';
import { commentsCommand } from './commands/comments';
import { copyCommand } from './commands/copy';
import { moveCommand } from './commands/move';
import { versionsCommand } from './commands/versions';
import { bookmarkCommand } from './commands/bookmark';
import { footnoteCommand } from './commands/footnote';
import { marginCommand } from './commands/margin';
import { columnsCommand } from './commands/columns';
import { gdocs } from './api';

const gdocsService: UniService = {
  name: 'gdocs',
  description: 'Google Docs - documents',
  version: '0.1.0',

  commands: [
    listCommand,
    getCommand,
    createCommand,
    appendCommand,
    replaceCommand,
    insertCommand,
    findCommand,
    clearCommand,
    importCommand,
    shareCommand,
    exportCommand,
    deleteCommand,
    renameCommand,
    // New commands
    formatCommand,
    styleCommand,
    bulletsCommand,
    tableCommand,
    linkCommand,
    pageBreakCommand,
    headerCommand,
    footerCommand,
    // Enhanced commands
    statsCommand,
    commentsCommand,
    copyCommand,
    moveCommand,
    versionsCommand,
    bookmarkCommand,
    footnoteCommand,
    marginCommand,
    columnsCommand,
    authCommand,
  ],

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  setup: createGoogleServiceSetup('gdocs', gdocs),
};

export default gdocsService;
