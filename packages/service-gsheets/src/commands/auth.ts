import { createGoogleAuthCommand } from '@uni/shared';
import { gsheets } from '../api';

export const authCommand = createGoogleAuthCommand({
  serviceName: 'Sheets',
  serviceKey: 'gsheets',
  client: gsheets,
});
