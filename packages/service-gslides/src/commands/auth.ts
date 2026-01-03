import { createGoogleAuthCommand } from '@uni/shared';
import { gslides } from '../api';

export const authCommand = createGoogleAuthCommand({
  serviceName: 'Slides',
  serviceKey: 'gslides',
  client: gslides,
});
