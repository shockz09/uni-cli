import { createGoogleAuthCommand } from '@uni/shared';
import { gdrive } from '../api';

export const authCommand = createGoogleAuthCommand({
  serviceName: 'Drive',
  serviceKey: 'gdrive',
  client: gdrive,
});
