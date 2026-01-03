import { createGoogleAuthCommand } from '@uni/shared';
import { gcontacts } from '../api';

export const authCommand = createGoogleAuthCommand({
  serviceName: 'Contacts',
  serviceKey: 'gcontacts',
  client: gcontacts,
});
