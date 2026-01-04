import { createGoogleAuthCommand } from '@uni/shared';
import { gphotos } from '../api';

export const authCommand = createGoogleAuthCommand({
  serviceName: 'Photos',
  serviceKey: 'gphotos',
  client: gphotos,
});
