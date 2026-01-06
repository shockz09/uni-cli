/**
 * Google Service Setup Factory
 *
 * Creates a standardized setup function for Google services.
 * Checks credentials and auth status, shows warnings if needed.
 */

import type { GoogleAuthClient } from './google-auth';
import { c } from './colors';

/**
 * Create a setup function for a Google service.
 *
 * @example
 * ```typescript
 * import { createGoogleServiceSetup } from '@uni/shared';
 * import { gcal } from './api';
 *
 * const gcalService: UniService = {
 *   name: 'gcal',
 *   // ...
 *   setup: createGoogleServiceSetup('gcal', gcal),
 * };
 * ```
 */
export function createGoogleServiceSetup(
  serviceKey: string,
  client: GoogleAuthClient
): () => Promise<void> {
  return async () => {
    // If already authenticated, service works - no warning needed
    if (client.isAuthenticated()) return;

    // Not authenticated - check if they can authenticate
    if (client.hasCredentials()) {
      console.error(c.yellow(`Warning: Not authenticated. Run "uni ${serviceKey} auth".`));
    } else {
      console.error(c.yellow('Warning: Google credentials not configured.'));
      console.error(c.yellow('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then run auth.'));
    }
  };
}
