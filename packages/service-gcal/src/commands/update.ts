/**
 * uni gcal update - Update a calendar event
 */

import type { Command, CommandContext } from '@uni/shared';
import { gcal } from '../api';

export const updateCommand: Command = {
  name: 'update',
  description: 'Update a calendar event',
  aliases: ['edit', 'rename'],
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
      short: 'd',
      type: 'string',
      description: 'New description',
    },
  ],
  examples: [
    'uni gcal update "Flight Check-in" --title "Web Check-in: 6E 906"',
    'uni gcal update "Meeting" --location "Room B"',
    'uni gcal update "Standup" -t "Daily Standup"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, flags, output, globalFlags } = ctx;

    const search = args.search as string;
    const newTitle = flags.title as string | undefined;
    const newLocation = flags.location as string | undefined;
    const newDescription = flags.description as string | undefined;

    if (!newTitle && !newLocation && !newDescription) {
      output.error('Provide at least one update: --title, --location, or --description');
      return;
    }

    // Search for event in next 7 days
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const events = await gcal.listEvents({
      timeMin: now,
      timeMax: nextWeek,
      maxResults: 50,
    });

    // Find matching event (by ID or title substring)
    const event = events.find(
      e => e.id === search || e.summary?.toLowerCase().includes(search.toLowerCase())
    );

    if (!event) {
      output.error(`No event found matching "${search}" in the next 7 days`);
      return;
    }

    // Build updates
    const updates: { summary?: string; location?: string; description?: string } = {};
    if (newTitle) updates.summary = newTitle;
    if (newLocation) updates.location = newLocation;
    if (newDescription) updates.description = newDescription;

    const updated = await gcal.updateEvent(event.id, updates);

    if (globalFlags.json) {
      output.json({
        id: updated.id,
        title: updated.summary,
        location: updated.location,
        updated: true,
      });
      return;
    }

    output.success(`Updated event: ${updated.summary}`);
    if (newTitle) output.text(`  Title: ${event.summary} → ${updated.summary}`);
    if (newLocation) output.text(`  Location: ${updated.location}`);
    if (newDescription) output.text(`  Description: ${updated.description}`);
  },
};
