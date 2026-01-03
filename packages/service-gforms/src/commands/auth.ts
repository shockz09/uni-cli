import { createGoogleAuthCommand } from '@uni/shared';
import { gforms } from '../api';

export const authCommand = createGoogleAuthCommand({
  serviceName: 'Forms',
  serviceKey: 'gforms',
  client: gforms,
});
