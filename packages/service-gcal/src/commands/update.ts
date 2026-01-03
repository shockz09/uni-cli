/**
 * uni gcal update - Update a calendar event
 */

import type { Command, CommandContext } from '@uni/shared';
import { gcal } from '../api';

/**
 * Parse a time string like "10am", "2:30pm", "14:00" into hours and minutes
 */
function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  // Try 24-hour format (14:00)
  let match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    return { hours: parseInt(match[1]), minutes: parseInt(match[2]) };
  }

  // Try 12-hour format (10am, 2:30pm)
  match = timeStr.toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const period = match[3];

    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;

    return { hours, minutes };
  }

  return null;
}

/**
 * Parse duration string like "30m", "1h", "1h30m" into minutes
 */
function parseDuration(durationStr: string): number | null {
  let totalMinutes = 0;

  const hoursMatch = durationStr.match(/(\d+)\s*h/i);
  if (hoursMatch) {
    totalMinutes += parseInt(hoursMatch[1]) * 60;
  }

  const minsMatch = durationStr.match(/(\d+)\s*m/i);
  if (minsMatch) {
    totalMinutes += parseInt(minsMatch[1]);
  }

  if (!hoursMatch && !minsMatch) {
    const num = parseInt(durationStr);
    if (!isNaN(num)) {
      totalMinutes = num;
    }
  }

  return totalMinutes > 0 ? totalMinutes : null;
}

export const updateCommand: Command = {
  name: 'update',
  description: 'Update a calendar event',
  aliases: ['edit', 'rename', 'reschedule'],
  args: [
    {
      name: 'search',
      required: true,
      description: 'Event name/ID to search for',
    },
  ],
  options: [
    {
      name: 'title',
      short: 't',
      type: 'string',
      description: 'New event title',
    },
    {
      name: 'location',
      short: 'l',
      type: 'string',
      description: 'New location',
    },
    {
      name: 'description',
      type: 'string',
      description: 'New description',
    },
    {
      name: 'time',
      type: 'string',
      description: 'New start time (e.g., 10am, 14:30)',
    },
    {
      name: 'date',
      type: 'string',
      description: 'New date (today, tomorrow, YYYY-MM-DD)',
    },
    {
      name: 'duration',
      short: 'd',
      type: 'string',
      description: 'New duration (e.g., 30m, 1h)',
    },
  ],
  examples: [
    'uni gcal update "Flight Check-in" --title "Web Check-in: 6E 906"',
    'uni gcal update "Meeting" --location "Room B"',
    'uni gcal update "Standup" -t "Daily Standup"',
    'uni gcal update "Check-in" --date 2026-01-05 --time 10:45am',
    'uni gcal update "Meeting" --time 3pm --duration 1h',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, flags, output, globalFlags } = ctx;

    const search = args.search as string;
    const newTitle = flags.title as string | undefined;
    const newLocation = flags.location as string | undefined;
    const newDescription = flags.description as string | undefined;
    const newTime = flags.time as string | undefined;
    const newDate = flags.date as string | undefined;
    const newDuration = flags.duration as string | undefined;

    if (!newTitle && !newLocation && !newDescription && !newTime && !newDate && !newDuration) {
      output.error('Provide at least one update: --title, --location, --description, --time, --date, or --duration');
      return;
    }

    // Search for event in next 14 days (extended range for rescheduling)
    const now = new Date();
    const searchEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const events = await gcal.listEvents({
      timeMin: now,
      timeMax: searchEnd,
      maxResults: 50,
    });

    // Find matching event (by ID or title substring)
    const event = events.find(
      e => e.id === search || e.summary?.toLowerCase().includes(search.toLowerCase())
    );

    if (!event) {
      output.error(`No event found matching "${search}" in the next 14 days`);
      return;
    }

    // Build updates
    const updates: {
      summary?: string;
      location?: string;
      description?: string;
      start?: { dateTime: string; timeZone?: string };
      end?: { dateTime: string; timeZone?: string };
    } = {};

    if (newTitle) updates.summary = newTitle;
    if (newLocation) updates.location = newLocation;
    if (newDescription) updates.description = newDescription;

    // Handle time/date changes
    if (newTime || newDate || newDuration) {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Get existing start/end times
      let startTime = new Date(event.start.dateTime || event.start.date || new Date());
      let endTime = new Date(event.end.dateTime || event.end.date || new Date());
      const originalDuration = endTime.getTime() - startTime.getTime();

      // Update date if specified
      if (newDate) {
        let targetDate: Date;
        if (newDate === 'today') {
          targetDate = new Date();
        } else if (newDate === 'tomorrow') {
          targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + 1);
        } else if (newDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          targetDate = new Date(newDate);
        } else {
          output.error(`Invalid date format: ${newDate}. Use today, tomorrow, or YYYY-MM-DD`);
          return;
        }
        startTime.setFullYear(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      }

      // Update time if specified
      if (newTime) {
        const parsed = parseTime(newTime);
        if (!parsed) {
          output.error(`Invalid time format: ${newTime}. Use formats like 10am, 2:30pm, or 14:00`);
          return;
        }
        startTime.setHours(parsed.hours, parsed.minutes, 0, 0);
      }

      // Calculate end time
      if (newDuration) {
        const durationMins = parseDuration(newDuration);
        if (!durationMins) {
          output.error(`Invalid duration: ${newDuration}. Use formats like 30m, 1h, or 1h30m`);
          return;
        }
        endTime = new Date(startTime.getTime() + durationMins * 60 * 1000);
      } else {
        // Keep original duration
        endTime = new Date(startTime.getTime() + originalDuration);
      }

      updates.start = { dateTime: startTime.toISOString(), timeZone };
      updates.end = { dateTime: endTime.toISOString(), timeZone };
    }

    const updated = await gcal.updateEvent(event.id, updates);

    if (globalFlags.json) {
      output.json({
        id: updated.id,
        title: updated.summary,
        location: updated.location,
        start: updated.start,
        end: updated.end,
        updated: true,
      });
      return;
    }

    output.success(`Updated event: ${updated.summary}`);
    if (newTitle) output.text(`  Title: ${event.summary} → ${updated.summary}`);
    if (newLocation) output.text(`  Location: ${updated.location}`);
    if (newDescription) output.text(`  Description: ${updated.description}`);
    if (newTime || newDate) {
      const startStr = new Date(updated.start.dateTime!).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      output.text(`  When: ${startStr}`);
    }
  },
};
