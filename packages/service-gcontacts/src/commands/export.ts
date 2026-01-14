/**
 * uni gcontacts export - Export contacts
 */

import type { Command, CommandContext } from '@uni/shared';
import { gcontacts } from '../api';

export const exportCommand: Command = {
  name: 'export',
  description: 'Export contacts as vCard format',
  options: [
    { name: 'limit', short: 'n', type: 'string', description: 'Number of contacts to export (default: 100)' },
  ],
  examples: [
    'uni gcontacts export',
    'uni gcontacts export --limit 50',
    'uni gcontacts export > contacts.vcf',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!gcontacts.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gcontacts auth" first.');
      return;
    }

    const limit = parseInt((flags.limit as string) || '100', 10);

    const spinner = output.spinner('Exporting contacts...');
    try {
      const vcfData = await gcontacts.exportContacts(limit);
      spinner.stop();

      if (globalFlags.json) {
        output.json({ format: 'vcard', data: vcfData });
        return;
      }

      output.info(vcfData);
    } catch (error) {
      spinner.fail('Failed to export contacts');
      throw error;
    }
  },
};
