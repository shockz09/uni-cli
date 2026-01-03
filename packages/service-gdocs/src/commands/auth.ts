import { createGoogleAuthCommand } from '@uni/shared';
import { gdocs } from '../api';

export const authCommand = createGoogleAuthCommand({
  serviceName: 'Docs',
  serviceKey: 'gdocs',
  client: gdocs,
});
