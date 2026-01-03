/**
 * Google Calendar API Client
 *
 * Extends GoogleAuthClient for OAuth handling.
 * Tokens are stored in ~/.uni/tokens/gcal.json
 */

import { GoogleAuthClient } from '@uni/shared';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ email: string; responseStatus: string }>;
  htmlLink: string;
  status: string;
}

interface EventsResponse {
  items: CalendarEvent[];
  nextPageToken?: string;
}

export class GoogleCalendarClient extends GoogleAuthClient {
  constructor() {
    super({
      serviceName: 'gcal',
      scopes: SCOPES,
      apiBase: 'https://www.googleapis.com/calendar/v3',
    });
  }

  /**
   * List events from calendar
   */
  async listEvents(options: {
    calendarId?: string;
    timeMin?: Date;
    timeMax?: Date;
    maxResults?: number;
    singleEvents?: boolean;
    orderBy?: 'startTime' | 'updated';
  } = {}): Promise<CalendarEvent[]> {
    const {
      calendarId = 'primary',
      timeMin = new Date(),
      timeMax,
      maxResults = 10,
      singleEvents = true,
      orderBy = 'startTime',
    } = options;

    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      maxResults: String(maxResults),
      singleEvents: String(singleEvents),
      orderBy,
    });

    if (timeMax) {
      params.set('timeMax', timeMax.toISOString());
    }

    const response = await this.request<EventsResponse>(
      `/calendars/${encodeURIComponent(calendarId)}/events?${params}`
    );

    return response.items || [];
  }

  /**
   * Get a single event
   */
  async getEvent(eventId: string, calendarId = 'primary'): Promise<CalendarEvent> {
    return this.request<CalendarEvent>(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
    );
  }

  /**
   * Create an event
   */
  async createEvent(
    event: {
      summary: string;
      description?: string;
      location?: string;
      start: { dateTime: string; timeZone?: string };
      end: { dateTime: string; timeZone?: string };
      attendees?: Array<{ email: string }>;
    },
    calendarId = 'primary'
  ): Promise<CalendarEvent> {
    return this.request<CalendarEvent>(
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        body: JSON.stringify(event),
      }
    );
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string, calendarId = 'primary'): Promise<void> {
    await this.request(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Update an event
   */
  async updateEvent(
    eventId: string,
    updates: {
      summary?: string;
      description?: string;
      location?: string;
      start?: { dateTime: string; timeZone?: string };
      end?: { dateTime: string; timeZone?: string };
    },
    calendarId = 'primary'
  ): Promise<CalendarEvent> {
    // Get existing event first
    const existing = await this.getEvent(eventId, calendarId);

    // Merge updates
    const updated = {
      ...existing,
      ...updates,
    };

    return this.request<CalendarEvent>(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(updated),
      }
    );
  }
}

// Singleton instance
export const gcal = new GoogleCalendarClient();
