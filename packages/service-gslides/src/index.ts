/**
 * Google Slides Service
 */

import type { UniService } from '@uni/shared';
import { createGoogleServiceSetup } from '@uni/shared';
import { listCommand } from './commands/list';
import { getCommand } from './commands/get';
import { createCommand } from './commands/create';
import { addSlideCommand } from './commands/add-slide';
import { addTextCommand } from './commands/add-text';
import { addImageCommand } from './commands/add-image';
import { duplicateSlideCommand } from './commands/duplicate-slide';
import { deleteSlideCommand } from './commands/delete-slide';
import { clearSlideCommand } from './commands/clear-slide';
import { replaceTextCommand } from './commands/replace-text';
import { copyCommand } from './commands/copy';
import { shareCommand } from './commands/share';
import { exportCommand } from './commands/export';
import { deleteCommand } from './commands/delete';
import { renameCommand } from './commands/rename';
import { authCommand } from './commands/auth';
// New commands
import { addShapeCommand } from './commands/add-shape';
import { addLineCommand } from './commands/add-line';
import { notesCommand } from './commands/notes';
import { reorderCommand } from './commands/reorder';
import { addTableCommand } from './commands/add-table';
import { backgroundCommand } from './commands/background';
import { formatTextCommand } from './commands/format-text';
import { deleteElementCommand } from './commands/delete-element';
import { transformCommand } from './commands/transform';
// Enhanced commands
import { statsCommand } from './commands/stats';
import { commentsCommand } from './commands/comments';
import { moveCommand } from './commands/move';
import { versionsCommand } from './commands/versions';
import { addVideoCommand } from './commands/add-video';
import { linkCommand } from './commands/link';
import { groupCommand } from './commands/group';
import { layoutsCommand } from './commands/layouts';
import { mastersCommand } from './commands/masters';
import { gslides } from './api';

const gslidesService: UniService = {
  name: 'gslides',
  description: 'Google Slides - presentations',
  version: '0.1.0',

  commands: [
    listCommand,
    getCommand,
    createCommand,
    addSlideCommand,
    addTextCommand,
    addImageCommand,
    duplicateSlideCommand,
    deleteSlideCommand,
    clearSlideCommand,
    replaceTextCommand,
    copyCommand,
    shareCommand,
    exportCommand,
    deleteCommand,
    renameCommand,
    // New commands
    addShapeCommand,
    addLineCommand,
    notesCommand,
    reorderCommand,
    addTableCommand,
    backgroundCommand,
    formatTextCommand,
    deleteElementCommand,
    transformCommand,
    // Enhanced commands
    statsCommand,
    commentsCommand,
    moveCommand,
    versionsCommand,
    addVideoCommand,
    linkCommand,
    groupCommand,
    layoutsCommand,
    mastersCommand,
    authCommand,
  ],

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  setup: createGoogleServiceSetup('gslides', gslides),
};

export default gslidesService;
