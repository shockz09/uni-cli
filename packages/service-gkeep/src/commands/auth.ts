import { createGoogleAuthCommand } from '@uni/shared';
import { gkeep } from '../api';

export const authCommand = createGoogleAuthCommand({
  serviceName: 'Keep',
  serviceKey: 'gkeep',
  client: gkeep,
});
