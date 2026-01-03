import { createGoogleAuthCommand } from '@uni/shared';
import { gmeet } from '../api';

export const authCommand = createGoogleAuthCommand({
  serviceName: 'Meet',
  serviceKey: 'gmeet',
  client: gmeet,
});
