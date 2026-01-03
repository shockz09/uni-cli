/**
 * uni gmeet create - Create instant meeting
 */

import type { Command, CommandContext } from '@uni/shared';
import { timestamp, c } from '@uni/shared';
import { gmeet } from '../api';

export const createCommand: Command = {
  name: 'create',
  description: 'Create an instant meeting link',
  aliases: ['new', 'now'],
  options: [
    {
      name: 'title',
      short: 't',
      type: 'string',
      description: 'Meeting title',
      default: 'Quick Meeting',
    },
    {
      name: 'duration',
      short: 'd',
      type: 'number',
      description: 'Duration in minutes',
      default: 30,
    },
  ],
  examples: [
    'uni gmeet create',
    'uni gmeet create --title "Standup"',
    'uni gmeet create --title "Interview" --duration 60',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!gmeet.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmeet auth" first.');
      return;
    }

    const title = flags.title as string;
    const duration = flags.duration as number;
    const spinner = output.spinner(`Creating meeting "${title}"...`);

    try {
      const event = await gmeet.createInstantMeeting(title, duration);
      const meetLink = gmeet.getMeetLink(event);

      spinner.success('Meeting created');

      if (globalFlags.json) {
        output.json({
          title: event.summary,
          link: meetLink,
          start: event.start.dateTime,
          end: event.end.dateTime,
        });
        return;
      }

      console.log('');
      console.log(`  ${c.bold(event.summary)}`);
      if (meetLink) {
        console.log(`  ${c.cyan(meetLink)}`);
      }
      console.log(`  ${c.dim(`Now - ${duration} mins`)}`);
      console.log('');
      console.log(c.dim(timestamp()));
    } catch (error) {
      spinner.fail('Failed to create meeting');
      throw error;
    }
  },
};
