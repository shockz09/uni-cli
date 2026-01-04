/**
 * Google Photos Service
 *
 * Access Google Photos: list, search, download, upload, albums.
 */

import type { UniService } from '@uni/shared';
import { listCommand } from './commands/list';
import { searchCommand } from './commands/search';
import { downloadCommand } from './commands/download';
import { uploadCommand } from './commands/upload';
import { albumsCommand } from './commands/albums';
import { authCommand } from './commands/auth';

const gphotosService: UniService = {
  name: 'gphotos',
  description: 'Google Photos (photos, albums)',
  version: '0.1.0',
  commands: [
    listCommand,
    searchCommand,
    downloadCommand,
    uploadCommand,
    albumsCommand,
    authCommand,
  ],
};

export default gphotosService;
