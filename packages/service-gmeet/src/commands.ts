/**
 * Google Meet Commands
 *
 * Consolidated command definitions for gmeet service.
 */

import type { Command, CommandContext } from '@uni/shared';
import { timestamp, c, createGoogleAuthCommand } from '@uni/shared';
import { gmeet } from './api';

// ============================================================
// Auth Command
// ============================================================

export const authCommand = createGoogleAuthCommand({
  serviceName: 'Meet',
  serviceKey: 'gmeet',
  client: gmeet,
});

// ============================================================
// Create Command - Instant meeting
// ============================================================

const createCommand: Command = {
  name: 'create',
  description: 'Create an instant meeting link',
  aliases: ['new', 'now'],
  options: [
    { name: 'title', short: 't', type: 'string', description: 'Meeting title', default: 'Quick Meeting' },
    { name: 'duration', short: 'd', type: 'number', description: 'Duration in minutes', default: 30 },
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

// ============================================================
// Schedule Command
// ============================================================

const scheduleCommand: Command = {
  name: 'schedule',
  description: 'Schedule a meeting for later',
  aliases: ['plan'],
  args: [{ name: 'title', description: 'Meeting title', required: true }],
  options: [
    { name: 'date', short: 'd', type: 'string', description: 'Date (today, tomorrow, YYYY-MM-DD)', default: 'today' },
    { name: 'time', short: 't', type: 'string', description: 'Time (e.g., 2pm, 14:00)', required: true },
    { name: 'duration', type: 'number', description: 'Duration in minutes', default: 30 },
    { name: 'invite', short: 'i', type: 'string', description: 'Comma-separated emails to invite' },
  ],
  examples: [
    'uni gmeet schedule "Team Sync" --date tomorrow --time 10am',
    'uni gmeet schedule "1:1" --time 3pm --invite john@example.com',
    'uni gmeet schedule "Review" --date 2026-01-10 --time 2pm --duration 60',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gmeet.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmeet auth" first.');
      return;
    }

    const title = args.title as string;
    const spinner = output.spinner(`Scheduling "${title}"...`);

    try {
      // Parse date
      let date = new Date();
      const dateStr = flags.date as string;

      if (dateStr === 'tomorrow') {
        date.setDate(date.getDate() + 1);
      } else if (dateStr !== 'today' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        date = new Date(dateStr);
      }

      // Parse time
      const timeStr = flags.time as string;
      const timeMatch = timeStr.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)?$/i);

      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2] || '0', 10);
        const ampm = timeMatch[3]?.toLowerCase();

        if (ampm === 'pm' && hours < 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;

        date.setHours(hours, minutes, 0, 0);
      } else {
        spinner.fail('Invalid time format. Use: 2pm, 14:00, 10:30am');
        return;
      }

      // Parse attendees
      const attendees = flags.invite
        ? (flags.invite as string).split(',').map(e => e.trim())
        : undefined;

      const event = await gmeet.scheduleMeeting({
        title,
        date,
        durationMinutes: flags.duration as number,
        attendees,
      });

      const meetLink = gmeet.getMeetLink(event);
      spinner.success('Meeting scheduled');

      if (globalFlags.json) {
        output.json({
          title: event.summary,
          link: meetLink,
          start: event.start.dateTime,
          end: event.end.dateTime,
          attendees: event.attendees?.map(a => a.email),
        });
        return;
      }

      console.log('');
      console.log(`  ${c.bold(event.summary)}`);
      if (meetLink) {
        console.log(`  ${c.cyan(meetLink)}`);
      }

      const startDate = new Date(event.start.dateTime!);
      const endDate = new Date(event.end.dateTime!);
      console.log(`  ${c.dim(`${startDate.toLocaleString()} - ${endDate.toLocaleTimeString()}`)}`);

      if (event.attendees && event.attendees.length > 0) {
        console.log(`  ${c.dim(`Invited: ${event.attendees.map(a => a.email).join(', ')}`)}`);
      }
      console.log('');
      console.log(c.dim(timestamp()));
    } catch (error) {
      spinner.fail('Failed to schedule meeting');
      throw error;
    }
  },
};

// ============================================================
// List Command
// ============================================================

const listCommand: Command = {
  name: 'list',
  description: 'List upcoming meetings with Meet links',
  aliases: ['ls'],
  options: [
    { name: 'days', short: 'd', type: 'number', description: 'Days to look ahead', default: 7 },
  ],
  examples: [
    'uni gmeet list',
    'uni gmeet list --days 14',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!gmeet.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmeet auth" first.');
      return;
    }

    const days = flags.days as number;
    const spinner = output.spinner(`Fetching meetings (next ${days} days)...`);

    try {
      const meetings = await gmeet.listMeetings(days);
      spinner.success(`Found ${meetings.length} meeting(s) with Meet links`);

      if (globalFlags.json) {
        output.json(meetings.map(m => ({
          title: m.summary,
          link: gmeet.getMeetLink(m),
          start: m.start.dateTime || m.start.date,
          end: m.end.dateTime || m.end.date,
        })));
        return;
      }

      if (meetings.length === 0) {
        console.log(c.dim('No upcoming meetings with Meet links'));
        return;
      }

      console.log('');

      // Group by date
      const byDate = new Map<string, typeof meetings>();
      for (const meeting of meetings) {
        const dateStr = (meeting.start.dateTime || meeting.start.date || '').split('T')[0];
        if (!byDate.has(dateStr)) {
          byDate.set(dateStr, []);
        }
        byDate.get(dateStr)!.push(meeting);
      }

      for (const [date, dayMeetings] of byDate) {
        const dateObj = new Date(date);
        const dateLabel = dateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        });
        console.log(c.bold(`📅 ${dateLabel}`));

        for (const meeting of dayMeetings) {
          const startTime = meeting.start.dateTime
            ? new Date(meeting.start.dateTime).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })
            : 'All day';

          const meetLink = gmeet.getMeetLink(meeting);

          console.log(`  ${c.cyan(startTime)} ${meeting.summary}`);
          if (meetLink) {
            console.log(`    ${c.dim(meetLink)}`);
          }
        }
        console.log('');
      }
      console.log(c.dim(timestamp()));
    } catch (error) {
      spinner.fail('Failed to fetch meetings');
      throw error;
    }
  },
};

// ============================================================
// Get Command
// ============================================================

const getCommand: Command = {
  name: 'get',
  aliases: ['view', 'show'],
  description: 'Get meeting details',
  args: [{ name: 'eventId', description: 'Meeting/event ID', required: true }],
  examples: ['uni gmeet get EVENT_ID'],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gmeet.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmeet auth" first.');
      return;
    }

    const eventId = args.eventId as string;

    const spinner = output.spinner('Fetching meeting...');
    try {
      const meeting = await gmeet.getMeeting(eventId);
      spinner.stop();

      if (globalFlags.json) {
        output.json(meeting);
        return;
      }

      const meetLink = gmeet.getMeetLink(meeting);
      const start = meeting.start.dateTime || meeting.start.date;
      const end = meeting.end.dateTime || meeting.end.date;

      output.info(`Meeting: ${meeting.summary}\n`);
      output.info(`  ID: ${meeting.id}`);
      if (start) output.info(`  Start: ${new Date(start).toLocaleString()}`);
      if (end) output.info(`  End: ${new Date(end).toLocaleString()}`);
      if (meetLink) output.info(`  Meet Link: ${meetLink}`);

      if (meeting.attendees && meeting.attendees.length > 0) {
        output.info(`\n  Attendees (${meeting.attendees.length}):`);
        for (const a of meeting.attendees) {
          const status = a.responseStatus || 'pending';
          output.info(`    - ${a.email} [${status}]`);
        }
      }

      if (meeting.htmlLink) output.info(`\n  Calendar: ${meeting.htmlLink}`);
    } catch (error) {
      spinner.fail('Failed to fetch meeting');
      throw error;
    }
  },
};

// ============================================================
// Update Command
// ============================================================

const updateCommand: Command = {
  name: 'update',
  aliases: ['edit'],
  description: 'Update meeting title or time',
  args: [{ name: 'eventId', description: 'Meeting/event ID', required: true }],
  options: [
    { name: 'title', short: 't', type: 'string', description: 'New title' },
    { name: 'date', short: 'd', type: 'string', description: 'New date/time (ISO format)' },
    { name: 'duration', type: 'string', description: 'Duration in minutes' },
  ],
  examples: [
    'uni gmeet update EVENT_ID --title "Updated Meeting"',
    'uni gmeet update EVENT_ID --date "2024-01-20T15:00:00"',
    'uni gmeet update EVENT_ID --date "2024-01-20T15:00:00" --duration 60',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gmeet.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmeet auth" first.');
      return;
    }

    const eventId = args.eventId as string;

    if (!flags.title && !flags.date) {
      output.error('Specify --title or --date');
      return;
    }

    const updates: { title?: string; date?: Date; durationMinutes?: number } = {};
    if (flags.title) updates.title = flags.title as string;
    if (flags.date) updates.date = new Date(flags.date as string);
    if (flags.duration) updates.durationMinutes = parseInt(flags.duration as string, 10);

    const spinner = output.spinner('Updating meeting...');
    try {
      const meeting = await gmeet.updateMeeting(eventId, updates);
      spinner.success(`Updated: ${meeting.summary}`);

      if (globalFlags.json) {
        output.json(meeting);
      }
    } catch (error) {
      spinner.fail('Failed to update meeting');
      throw error;
    }
  },
};

// ============================================================
// Delete Command
// ============================================================

const deleteCommand: Command = {
  name: 'delete',
  description: 'Cancel/delete a scheduled meeting',
  aliases: ['cancel', 'remove', 'rm'],
  args: [{ name: 'search', required: true, description: 'Meeting name to search for' }],
  options: [
    { name: 'days', short: 'd', type: 'number', description: 'Days to search ahead', default: 14 },
  ],
  examples: [
    'uni gmeet delete "Team Sync"',
    'uni gmeet cancel "1:1 with John"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, flags, output, globalFlags } = ctx;

    if (!gmeet.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmeet auth" first.');
      return;
    }

    const search = args.search as string;
    const days = (flags.days as number) || 14;

    const meetings = await gmeet.listMeetings(days);

    // Find matching meeting
    const meeting = meetings.find(
      m => m.id === search || m.summary?.toLowerCase().includes(search.toLowerCase())
    );

    if (!meeting) {
      output.error(`No meeting found matching "${search}" in the next ${days} days`);
      return;
    }

    await gmeet.deleteMeeting(meeting.id);

    if (globalFlags.json) {
      output.json({
        id: meeting.id,
        title: meeting.summary,
        deleted: true,
      });
      return;
    }

    output.success(`Cancelled meeting: ${meeting.summary}`);
    console.log(c.dim(timestamp()));
  },
};

// ============================================================
// Invite Command
// ============================================================

const inviteCommand: Command = {
  name: 'invite',
  aliases: ['attendees'],
  description: 'Add or remove meeting attendees',
  args: [{ name: 'eventId', description: 'Meeting/event ID', required: true }],
  options: [
    { name: 'add', short: 'a', type: 'string', description: 'Email(s) to add (comma-separated)' },
    { name: 'remove', short: 'r', type: 'string', description: 'Email to remove' },
  ],
  examples: [
    'uni gmeet invite EVENT_ID --add "user@example.com"',
    'uni gmeet invite EVENT_ID --add "alice@example.com,bob@example.com"',
    'uni gmeet invite EVENT_ID --remove "user@example.com"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gmeet.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmeet auth" first.');
      return;
    }

    const eventId = args.eventId as string;

    if (!flags.add && !flags.remove) {
      // Show current attendees
      const meeting = await gmeet.getMeeting(eventId);
      if (globalFlags.json) {
        output.json({ attendees: meeting.attendees || [] });
        return;
      }

      output.info(`Attendees for: ${meeting.summary}\n`);
      if (!meeting.attendees || meeting.attendees.length === 0) {
        output.info('  No attendees');
        return;
      }

      for (const a of meeting.attendees) {
        const status = a.responseStatus || 'pending';
        output.info(`  - ${a.email} [${status}]`);
      }
      return;
    }

    // Add attendees
    if (flags.add) {
      const emails = (flags.add as string).split(',').map(e => e.trim());
      const spinner = output.spinner(`Adding ${emails.length} attendee(s)...`);
      try {
        const meeting = await gmeet.addAttendees(eventId, emails);
        spinner.success(`Added attendees to: ${meeting.summary}`);
        if (globalFlags.json) output.json({ added: emails, meeting });
        return;
      } catch (error) {
        spinner.fail('Failed to add attendees');
        throw error;
      }
    }

    // Remove attendee
    if (flags.remove) {
      const email = flags.remove as string;
      const spinner = output.spinner(`Removing ${email}...`);
      try {
        const meeting = await gmeet.removeAttendee(eventId, email);
        spinner.success(`Removed ${email}`);
        if (globalFlags.json) output.json({ removed: email, meeting });
      } catch (error) {
        spinner.fail('Failed to remove attendee');
        throw error;
      }
    }
  },
};

// ============================================================
// Export All Commands
// ============================================================

export const commands: Command[] = [
  createCommand,
  scheduleCommand,
  listCommand,
  getCommand,
  updateCommand,
  deleteCommand,
  inviteCommand,
  authCommand,
];
