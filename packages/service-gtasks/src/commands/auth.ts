import { createGoogleAuthCommand } from '@uni/shared';
import { gtasks } from '../api';

export const authCommand = createGoogleAuthCommand({
  serviceName: 'Tasks',
  serviceKey: 'gtasks',
  client: gtasks,
});
