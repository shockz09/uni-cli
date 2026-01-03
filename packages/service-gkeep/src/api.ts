/**
 * Google Keep API Client
 *
 * Extends GoogleAuthClient for OAuth handling.
 * Tokens stored in ~/.uni/tokens/gkeep.json
 */

import { GoogleAuthClient } from '@uni/shared';

const SCOPES = ['https://www.googleapis.com/auth/keep'];

export interface Note {
  name: string;
  title?: string;
  body?: {
    text?: { text: string };
    list?: { listItems: ListItem[] };
  };
  createTime: string;
  updateTime: string;
  trashed?: boolean;
  archived?: boolean;
  pinned?: boolean;
  attachments?: Attachment[];
}

interface ListItem {
  text: { text: string };
  checked?: boolean;
  childListItems?: ListItem[];
}

interface Attachment {
  name: string;
  mimeType: string[];
}

export class GoogleKeepClient extends GoogleAuthClient {
  constructor() {
    super({
      serviceName: 'gkeep',
      scopes: SCOPES,
      apiBase: 'https://keep.googleapis.com/v1',
    });
  }

  /**
   * List notes
   */
  async listNotes(filter?: { trashed?: boolean; archived?: boolean }): Promise<Note[]> {
    let endpoint = '/notes';
    const params: string[] = [];

    if (filter?.trashed !== undefined) {
      params.push(`filter=trashed=${filter.trashed}`);
    }

    if (params.length > 0) {
      endpoint += `?${params.join('&')}`;
    }

    const response = await this.request<{ notes?: Note[] }>(endpoint);
    let notes = response.notes || [];

    if (filter?.archived !== undefined) {
      notes = notes.filter((n) => n.archived === filter.archived);
    }

    return notes;
  }

  /**
   * Get a specific note
   */
  async getNote(noteId: string): Promise<Note> {
    const name = noteId.startsWith('notes/') ? noteId : `notes/${noteId}`;
    return this.request<Note>(`/${name}`);
  }

  /**
   * Create a new note
   */
  async createNote(title: string, content: string): Promise<Note> {
    return this.request<Note>('/notes', {
      method: 'POST',
      body: JSON.stringify({
        title,
        body: {
          text: { text: content },
        },
      }),
    });
  }

  /**
   * Create a list note
   */
  async createListNote(title: string, items: string[]): Promise<Note> {
    return this.request<Note>('/notes', {
      method: 'POST',
      body: JSON.stringify({
        title,
        body: {
          list: {
            listItems: items.map((text) => ({
              text: { text },
              checked: false,
            })),
          },
        },
      }),
    });
  }

  /**
   * Delete a note (moves to trash)
   */
  async deleteNote(noteId: string): Promise<void> {
    const name = noteId.startsWith('notes/') ? noteId : `notes/${noteId}`;
    await this.request(`/${name}`, {
      method: 'DELETE',
    });
  }

  /**
   * Extract text content from a note
   */
  extractContent(note: Note): string {
    if (note.body?.text?.text) {
      return note.body.text.text;
    }

    if (note.body?.list?.listItems) {
      return note.body.list.listItems
        .map((item) => {
          const checkbox = item.checked ? '[x]' : '[ ]';
          return `${checkbox} ${item.text.text}`;
        })
        .join('\n');
    }

    return '';
  }

  /**
   * Extract note ID from full name
   */
  extractNoteId(name: string): string {
    return name.replace('notes/', '');
  }
}

export const gkeep = new GoogleKeepClient();
