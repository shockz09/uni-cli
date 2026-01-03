import { createGoogleAuthCommand } from '@uni/shared';
import { gcal } from '../api';

export const authCommand = createGoogleAuthCommand({
  serviceName: 'Calendar',
  serviceKey: 'gcal',
  client: gcal,
});
