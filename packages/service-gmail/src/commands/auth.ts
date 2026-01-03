import { createGoogleAuthCommand } from '@uni/shared';
import { gmail } from '../api';

export const authCommand = createGoogleAuthCommand({
  serviceName: 'Gmail',
  serviceKey: 'gmail',
  client: gmail,
});
