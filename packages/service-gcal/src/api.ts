/**
 * Google Calendar API Client
 *
 * Extends GoogleAuthClient for OAuth handling.
 * Tokens are stored in ~/.uni/tokens/gcal.json
 */

import { GoogleAuthClient } from '@uni/shared';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ email: string; responseStatus?: string; displayName?: string; organizer?: boolean; self?: boolean }>;
  htmlLink: string;
  status: string;
  recurrence?: string[];
  recurringEventId?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: string; minutes: number }>;
  };
}

interface EventsResponse {
  items: CalendarEvent[];
  nextPageToken?: string;
}

interface Calendar {
  id: string;
  summary: string;
  description?: string;
  timeZone?: string;
  colorId?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  selected?: boolean;
  primary?: boolean;
  accessRole?: string;
}

interface CalendarListResponse {
  items: Calendar[];
  nextPageToken?: string;
}

interface FreeBusyResponse {
  calendars: Record<string, {
    busy: Array<{ start: string; end: string }>;
    errors?: Array<{ domain: string; reason: string }>;
  }>;
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

  // ============================================
  // CALENDAR MANAGEMENT
  // ============================================

  /**
   * List all calendars
   */
  async listCalendars(): Promise<Calendar[]> {
    const response = await this.request<CalendarListResponse>('/users/me/calendarList');
    return response.items || [];
  }

  /**
   * Get calendar details
   */
  async getCalendar(calendarId: string): Promise<Calendar> {
    return this.request<Calendar>(`/users/me/calendarList/${encodeURIComponent(calendarId)}`);
  }

  /**
   * Create a new calendar
   */
  async createCalendar(summary: string, options: { description?: string; timeZone?: string } = {}): Promise<Calendar> {
    return this.request<Calendar>('/calendars', {
      method: 'POST',
      body: JSON.stringify({
        summary,
        description: options.description,
        timeZone: options.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });
  }

  /**
   * Delete a calendar
   */
  async deleteCalendar(calendarId: string): Promise<void> {
    await this.request(`/calendars/${encodeURIComponent(calendarId)}`, { method: 'DELETE' });
  }

  // ============================================
  // QUICK ADD & FREE/BUSY
  // ============================================

  /**
   * Quick add event using natural language
   */
  async quickAdd(text: string, calendarId = 'primary'): Promise<CalendarEvent> {
    return this.request<CalendarEvent>(
      `/calendars/${encodeURIComponent(calendarId)}/events/quickAdd?text=${encodeURIComponent(text)}`,
      { method: 'POST' }
    );
  }

  /**
   * Check free/busy times
   */
  async getFreeBusy(
    timeMin: Date,
    timeMax: Date,
    calendarIds: string[] = ['primary']
  ): Promise<FreeBusyResponse> {
    return this.request<FreeBusyResponse>('/freeBusy', {
      method: 'POST',
      body: JSON.stringify({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: calendarIds.map(id => ({ id })),
      }),
    });
  }

  // ============================================
  // EVENT OPERATIONS
  // ============================================

  /**
   * Move event to another calendar
   */
  async moveEvent(eventId: string, fromCalendarId: string, toCalendarId: string): Promise<CalendarEvent> {
    return this.request<CalendarEvent>(
      `/calendars/${encodeURIComponent(fromCalendarId)}/events/${encodeURIComponent(eventId)}/move?destination=${encodeURIComponent(toCalendarId)}`,
      { method: 'POST' }
    );
  }

  /**
   * Add attendees to event
   */
  async addAttendees(eventId: string, emails: string[], calendarId = 'primary'): Promise<CalendarEvent> {
    const existing = await this.getEvent(eventId, calendarId);
    const currentAttendees = existing.attendees || [];
    const newAttendees = emails.map(email => ({ email }));

    return this.request<CalendarEvent>(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          attendees: [...currentAttendees, ...newAttendees],
        }),
      }
    );
  }

  /**
   * Remove attendee from event
   */
  async removeAttendee(eventId: string, email: string, calendarId = 'primary'): Promise<CalendarEvent> {
    const existing = await this.getEvent(eventId, calendarId);
    const updatedAttendees = (existing.attendees || []).filter(a => a.email !== email);

    return this.request<CalendarEvent>(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          attendees: updatedAttendees,
        }),
      }
    );
  }

  /**
   * Create recurring event
   */
  async createRecurringEvent(
    event: {
      summary: string;
      description?: string;
      location?: string;
      start: { dateTime: string; timeZone?: string };
      end: { dateTime: string; timeZone?: string };
      attendees?: Array<{ email: string }>;
    },
    recurrence: string[],
    calendarId = 'primary'
  ): Promise<CalendarEvent> {
    return this.request<CalendarEvent>(
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        body: JSON.stringify({
          ...event,
          recurrence,
        }),
      }
    );
  }

  /**
   * Set event reminders
   */
  async setReminders(
    eventId: string,
    reminders: Array<{ method: 'email' | 'popup'; minutes: number }>,
    calendarId = 'primary'
  ): Promise<CalendarEvent> {
    return this.request<CalendarEvent>(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          reminders: {
            useDefault: false,
            overrides: reminders,
          },
        }),
      }
    );
  }
}

// Singleton instance
export const gcal = new GoogleCalendarClient();
