/**
 * Google Contacts API Client (People API)
 *
 * Extends GoogleAuthClient for OAuth handling.
 * Tokens stored in ~/.uni/tokens/gcontacts.json
 */

import { GoogleAuthClient } from '@uni/shared';

const SCOPES = [
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/contacts',
];

export interface Contact {
  resourceName: string;
  etag?: string;
  names?: Array<{ displayName: string; givenName?: string; familyName?: string }>;
  emailAddresses?: Array<{ value: string; type?: string }>;
  phoneNumbers?: Array<{ value: string; type?: string }>;
  organizations?: Array<{ name?: string; title?: string }>;
  photos?: Array<{ url: string }>;
}

interface ContactsResponse {
  connections?: Contact[];
  nextPageToken?: string;
  totalItems?: number;
}

interface SearchResponse {
  results?: Array<{ person: Contact }>;
}

export class GContactsClient extends GoogleAuthClient {
  constructor() {
    super({
      serviceName: 'gcontacts',
      scopes: SCOPES,
      apiBase: 'https://people.googleapis.com/v1',
    });
  }

  async listContacts(pageSize: number = 20): Promise<Contact[]> {
    const params = new URLSearchParams({
      pageSize: String(pageSize),
      personFields: 'names,emailAddresses,phoneNumbers,organizations,photos',
    });
    const response = await this.request<ContactsResponse>(`/people/me/connections?${params}`);
    return response.connections || [];
  }

  async searchContacts(query: string): Promise<Contact[]> {
    const params = new URLSearchParams({
      query,
      readMask: 'names,emailAddresses,phoneNumbers,organizations,photos',
    });
    const response = await this.request<SearchResponse>(`/people:searchContacts?${params}`);
    return response.results?.map((r) => r.person) || [];
  }

  async getContact(resourceName: string): Promise<Contact> {
    const params = new URLSearchParams({
      personFields: 'names,emailAddresses,phoneNumbers,organizations,photos',
    });
    return this.request<Contact>(`/${resourceName}?${params}`);
  }

  async createContact(contact: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
  }): Promise<Contact> {
    const nameParts = contact.name.split(' ');
    const givenName = nameParts[0];
    const familyName = nameParts.slice(1).join(' ') || undefined;

    const body: Record<string, unknown> = {
      names: [{ givenName, familyName }],
    };

    if (contact.email) {
      body.emailAddresses = [{ value: contact.email }];
    }
    if (contact.phone) {
      body.phoneNumbers = [{ value: contact.phone }];
    }
    if (contact.company) {
      body.organizations = [{ name: contact.company }];
    }

    return this.request<Contact>('/people:createContact', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async deleteContact(resourceName: string): Promise<void> {
    await this.request(`/${resourceName}:deleteContact`, { method: 'DELETE' });
  }

  async updateContact(
    resourceName: string,
    updates: {
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
    }
  ): Promise<Contact> {
    const current = await this.getContact(resourceName);

    const body: Record<string, unknown> = {};
    const updateMask: string[] = [];

    if (updates.name) {
      const nameParts = updates.name.split(' ');
      body.names = [{ givenName: nameParts[0], familyName: nameParts.slice(1).join(' ') || undefined }];
      updateMask.push('names');
    }
    if (updates.email) {
      body.emailAddresses = [{ value: updates.email }];
      updateMask.push('emailAddresses');
    }
    if (updates.phone) {
      body.phoneNumbers = [{ value: updates.phone }];
      updateMask.push('phoneNumbers');
    }
    if (updates.company) {
      body.organizations = [{ name: updates.company }];
      updateMask.push('organizations');
    }

    body.etag = current.etag;

    const params = new URLSearchParams({
      updatePersonFields: updateMask.join(','),
    });

    return this.request<Contact>(`/${resourceName}:updateContact?${params}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  getDisplayName(contact: Contact): string {
    return contact.names?.[0]?.displayName || 'Unknown';
  }

  getEmail(contact: Contact): string | undefined {
    return contact.emailAddresses?.[0]?.value;
  }

  getPhone(contact: Contact): string | undefined {
    return contact.phoneNumbers?.[0]?.value;
  }

  getCompany(contact: Contact): string | undefined {
    return contact.organizations?.[0]?.name;
  }

  // ============================================
  // CONTACT GROUPS
  // ============================================

  /**
   * List contact groups
   */
  async listGroups(): Promise<Array<{ resourceName: string; name: string; memberCount?: number }>> {
    const response = await this.request<{ contactGroups: Array<{ resourceName: string; name: string; memberCount?: number }> }>(
      '/contactGroups?pageSize=100'
    );
    return response.contactGroups || [];
  }

  /**
   * Create a contact group
   */
  async createGroup(name: string): Promise<{ resourceName: string; name: string }> {
    const response = await this.request<{ group: { resourceName: string; name: string } }>('/contactGroups', {
      method: 'POST',
      body: JSON.stringify({ contactGroup: { name } }),
    });
    return response.group;
  }

  /**
   * Delete a contact group
   */
  async deleteGroup(resourceName: string): Promise<void> {
    await this.request(`/${resourceName}`, { method: 'DELETE' });
  }

  /**
   * Add contact to group
   */
  async addToGroup(contactResourceName: string, groupResourceName: string): Promise<void> {
    await this.request(`/${groupResourceName}/members:modify`, {
      method: 'POST',
      body: JSON.stringify({
        resourceNamesToAdd: [contactResourceName],
      }),
    });
  }

  /**
   * Remove contact from group
   */
  async removeFromGroup(contactResourceName: string, groupResourceName: string): Promise<void> {
    await this.request(`/${groupResourceName}/members:modify`, {
      method: 'POST',
      body: JSON.stringify({
        resourceNamesToRemove: [contactResourceName],
      }),
    });
  }

  // ============================================
  // BATCH OPERATIONS
  // ============================================

  /**
   * Delete multiple contacts
   */
  async batchDelete(resourceNames: string[]): Promise<void> {
    await this.request('/people:batchDeleteContacts', {
      method: 'POST',
      body: JSON.stringify({ resourceNames }),
    });
  }

  /**
   * Export contacts as vCard-like format
   */
  async exportContacts(limit = 100): Promise<string> {
    const contacts = await this.listContacts(limit);
    const lines: string[] = [];

    for (const contact of contacts) {
      const name = this.getDisplayName(contact);
      const email = this.getEmail(contact);
      const phone = this.getPhone(contact);
      const company = this.getCompany(contact);

      lines.push(`BEGIN:VCARD`);
      lines.push(`VERSION:3.0`);
      lines.push(`FN:${name}`);
      if (email) lines.push(`EMAIL:${email}`);
      if (phone) lines.push(`TEL:${phone}`);
      if (company) lines.push(`ORG:${company}`);
      lines.push(`END:VCARD`);
      lines.push('');
    }

    return lines.join('\n');
  }
}

export const gcontacts = new GContactsClient();
