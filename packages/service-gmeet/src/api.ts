/**
 * Google Meet API Client (uses Calendar API)
 *
 * Extends GoogleAuthClient for OAuth handling.
 * Tokens stored in ~/.uni/tokens/gmeet.json
 */

import { GoogleAuthClient } from '@uni/shared';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

export interface MeetEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
      label?: string;
    }>;
    conferenceSolution?: {
      name: string;
      iconUri: string;
    };
  };
  attendees?: Array<{ email: string; responseStatus?: string }>;
  htmlLink?: string;
}

interface EventsResponse {
  items?: MeetEvent[];
  nextPageToken?: string;
}

export class GMeetClient extends GoogleAuthClient {
  constructor() {
    super({
      serviceName: 'gmeet',
      scopes: SCOPES,
      apiBase: 'https://www.googleapis.com/calendar/v3',
    });
  }

  /**
   * Create an instant meeting (starts now)
   */
  async createInstantMeeting(title: string = 'Quick Meeting', durationMinutes: number = 30): Promise<MeetEvent> {
    const now = new Date();
    const end = new Date(now.getTime() + durationMinutes * 60 * 1000);

    return this.request<MeetEvent>('/calendars/primary/events?conferenceDataVersion=1', {
      method: 'POST',
      body: JSON.stringify({
        summary: title,
        start: { dateTime: now.toISOString() },
        end: { dateTime: end.toISOString() },
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      }),
    });
  }

  /**
   * Schedule a meeting for later
   */
  async scheduleMeeting(options: {
    title: string;
    date: Date;
    durationMinutes: number;
    attendees?: string[];
  }): Promise<MeetEvent> {
    const end = new Date(options.date.getTime() + options.durationMinutes * 60 * 1000);

    const eventData: Record<string, unknown> = {
      summary: options.title,
      start: { dateTime: options.date.toISOString() },
      end: { dateTime: end.toISOString() },
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };

    if (options.attendees && options.attendees.length > 0) {
      eventData.attendees = options.attendees.map((email) => ({ email }));
    }

    return this.request<MeetEvent>('/calendars/primary/events?conferenceDataVersion=1', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  /**
   * List upcoming events with Meet links
   */
  async listMeetings(days: number = 7): Promise<MeetEvent[]> {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const params = new URLSearchParams({
      timeMin: now.toISOString(),
      timeMax: future.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '50',
    });

    const response = await this.request<EventsResponse>(`/calendars/primary/events?${params}`);
    const events = response.items || [];

    return events.filter(
      (e) => e.hangoutLink || e.conferenceData?.entryPoints?.some((ep) => ep.entryPointType === 'video')
    );
  }

  /**
   * Get the Meet link from an event
   */
  getMeetLink(event: MeetEvent): string | undefined {
    if (event.hangoutLink) return event.hangoutLink;
    const videoEntry = event.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === 'video');
    return videoEntry?.uri;
  }

  /**
   * Delete/cancel a meeting
   */
  async deleteMeeting(eventId: string): Promise<void> {
    await this.request(`/calendars/primary/events/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get meeting details
   */
  async getMeeting(eventId: string): Promise<MeetEvent> {
    return this.request<MeetEvent>(`/calendars/primary/events/${encodeURIComponent(eventId)}`);
  }

  /**
   * Update meeting
   */
  async updateMeeting(
    eventId: string,
    updates: { title?: string; date?: Date; durationMinutes?: number }
  ): Promise<MeetEvent> {
    const existing = await this.getMeeting(eventId);
    const body: Record<string, unknown> = { ...existing };

    if (updates.title) body.summary = updates.title;
    if (updates.date) {
      body.start = { dateTime: updates.date.toISOString() };
      const duration = updates.durationMinutes || 30;
      body.end = { dateTime: new Date(updates.date.getTime() + duration * 60 * 1000).toISOString() };
    }

    return this.request<MeetEvent>(
      `/calendars/primary/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1`,
      {
        method: 'PUT',
        body: JSON.stringify(body),
      }
    );
  }

  /**
   * Add attendees to meeting
   */
  async addAttendees(eventId: string, emails: string[]): Promise<MeetEvent> {
    const existing = await this.getMeeting(eventId);
    const currentAttendees = existing.attendees || [];
    const newAttendees = emails.map(email => ({ email }));

    return this.request<MeetEvent>(
      `/calendars/primary/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          attendees: [...currentAttendees, ...newAttendees],
        }),
      }
    );
  }

  /**
   * Remove attendee from meeting
   */
  async removeAttendee(eventId: string, email: string): Promise<MeetEvent> {
    const existing = await this.getMeeting(eventId);
    const updatedAttendees = (existing.attendees || []).filter(a => a.email !== email);

    return this.request<MeetEvent>(
      `/calendars/primary/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          attendees: updatedAttendees,
        }),
      }
    );
  }
}

export const gmeet = new GMeetClient();
