/**
 * uni linear labels - Manage issue labels
 */

import type { Command, CommandContext } from '@uni/shared';
import { linear, linearOAuth } from '../api';

export const labelsCommand: Command = {
  name: 'labels',
  aliases: ['label', 'tag', 'tags'],
  description: 'List, create, and manage labels',
  options: [
    { name: 'team', short: 't', type: 'string', description: 'Filter by team ID' },
    { name: 'create', short: 'c', type: 'string', description: 'Create a new label (name)' },
    { name: 'color', type: 'string', description: 'Label color for creation (hex without #)' },
    { name: 'description', short: 'd', type: 'string', description: 'Label description' },
    { name: 'add-to', short: 'a', type: 'string', description: 'Add label to issue (issue ID)' },
    { name: 'label', short: 'l', type: 'string', description: 'Label ID for add-to operation' },
  ],
  examples: [
    'uni linear labels',
    'uni linear labels --team TEAM_ID',
    'uni linear labels --create "Bug" --team TEAM_ID --color "ff0000"',
    'uni linear labels --add-to ISSUE_ID --label LABEL_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!linearOAuth.isAuthenticated()) {
      output.error('Not authenticated. Run "uni linear auth" first.');
      return;
    }

    const teamId = flags.team as string | undefined;

    // Create a label
    if (flags.create) {
      if (!teamId) {
        output.error('--team is required when creating a label');
        return;
      }

      const spinner = output.spinner('Creating label...');
      try {
        const label = await linear.createLabel({
          teamId,
          name: flags.create as string,
          color: flags.color as string | undefined,
          description: flags.description as string | undefined,
        });
        spinner.success(`Created label: ${label.name}`);

        if (globalFlags.json) {
          output.json(label);
        } else {
          output.info(`  ID: ${label.id}`);
          output.info(`  Color: ${label.color}`);
        }
        return;
      } catch (error) {
        spinner.fail('Failed to create label');
        throw error;
      }
    }

    // Add label to issue
    if (flags['add-to'] && flags.label) {
      const spinner = output.spinner('Adding label to issue...');
      try {
        const issue = await linear.addLabelToIssue(flags['add-to'] as string, flags.label as string);
        spinner.success(`Added label to: ${issue.identifier}`);

        if (globalFlags.json) {
          output.json(issue);
        }
        return;
      } catch (error) {
        spinner.fail('Failed to add label');
        throw error;
      }
    }

    // List labels
    const spinner = output.spinner('Fetching labels...');
    try {
      const labels = await linear.listLabels(teamId);
      spinner.stop();

      if (globalFlags.json) {
        output.json(labels);
        return;
      }

      if (labels.length === 0) {
        output.info('No labels found.');
        return;
      }

      output.info(`Labels (${labels.length}):\n`);
      for (const label of labels) {
        const team = label.team ? ` [${label.team.key}]` : '';
        output.info(`  ${label.name}${team}`);
        output.info(`    Color: #${label.color} | ID: ${label.id}`);
        if (label.description) {
          output.info(`    ${label.description}`);
        }
      }
    } catch (error) {
      spinner.fail('Failed to fetch labels');
      throw error;
    }
  },
};
