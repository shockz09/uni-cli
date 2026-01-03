/**
 * Google Contacts Service
 */

import type { UniService } from '@uni/shared';
import { createGoogleServiceSetup } from '@uni/shared';
import { listCommand } from './commands/list';
import { searchCommand } from './commands/search';
import { getCommand } from './commands/get';
import { addCommand } from './commands/add';
import { updateCommand } from './commands/update';
import { deleteCommand } from './commands/delete';
import { authCommand } from './commands/auth';
import { gcontacts } from './api';

const gcontactsService: UniService = {
  name: 'gcontacts',
  description: 'Google Contacts - manage contacts',
  version: '0.1.0',

  commands: [listCommand, searchCommand, getCommand, addCommand, updateCommand, deleteCommand, authCommand],

  auth: {
    type: 'oauth',
    flow: 'browser',
    envVar: 'GOOGLE_CLIENT_ID',
  },

  setup: createGoogleServiceSetup('gcontacts', gcontacts),
};

export default gcontactsService;
