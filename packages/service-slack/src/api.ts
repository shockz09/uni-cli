/**
 * Slack API Client
 *
 * Uses Slack Bot Token for authentication.
 * Set SLACK_BOT_TOKEN environment variable.
 */

const SLACK_API = 'https://slack.com/api';

interface SlackResponse {
  ok: boolean;
  error?: string;
}

interface Channel {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
  topic?: { value: string };
  purpose?: { value: string };
  num_members?: number;
}

interface Message {
  type: string;
  user?: string;
  text: string;
  ts: string;
  thread_ts?: string;
  reply_count?: number;
}

interface User {
  id: string;
  name: string;
  real_name: string;
  is_bot: boolean;
  profile: {
    display_name: string;
    email?: string;
    image_48?: string;
  };
}

export class SlackClient {
  private token: string;

  constructor() {
    this.token = process.env.SLACK_BOT_TOKEN || '';
  }

  hasToken(): boolean {
    return Boolean(this.token);
  }

  private async request<T extends SlackResponse>(
    method: string,
    params: Record<string, string | number | boolean> = {}
  ): Promise<T> {
    const url = new URL(`${SLACK_API}/${method}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(params),
    });

    const data = (await response.json()) as T;

    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error || 'Unknown error'}`);
    }

    return data;
  }

  /**
   * List channels
   */
  async listChannels(options: { limit?: number; types?: string } = {}): Promise<Channel[]> {
    const { limit = 100, types = 'public_channel,private_channel' } = options;

    const response = await this.request<SlackResponse & { channels: Channel[] }>(
      'conversations.list',
      { limit, types }
    );

    return response.channels || [];
  }

  /**
   * Get channel history
   */
  async getMessages(
    channel: string,
    options: { limit?: number } = {}
  ): Promise<Message[]> {
    const { limit = 20 } = options;

    const response = await this.request<SlackResponse & { messages: Message[] }>(
      'conversations.history',
      { channel, limit }
    );

    return response.messages || [];
  }

  /**
   * Send a message
   */
  async sendMessage(
    channel: string,
    text: string,
    options: { thread_ts?: string } = {}
  ): Promise<{ ts: string; channel: string }> {
    const response = await this.request<SlackResponse & { ts: string; channel: string }>(
      'chat.postMessage',
      { channel, text, ...options }
    );

    return { ts: response.ts, channel: response.channel };
  }

  /**
   * Search messages
   */
  async searchMessages(
    query: string,
    options: { count?: number } = {}
  ): Promise<{ messages: Message[]; total: number }> {
    const { count = 20 } = options;

    // Note: search.messages requires a user token, not bot token
    // This may not work with bot tokens
    const response = await this.request<
      SlackResponse & { messages: { matches: Message[]; total: number } }
    >('search.messages', { query, count });

    return {
      messages: response.messages?.matches || [],
      total: response.messages?.total || 0,
    };
  }

  /**
   * List users
   */
  async listUsers(options: { limit?: number } = {}): Promise<User[]> {
    const { limit = 100 } = options;

    const response = await this.request<SlackResponse & { members: User[] }>(
      'users.list',
      { limit }
    );

    return response.members || [];
  }

  /**
   * Get user info
   */
  async getUser(userId: string): Promise<User> {
    const response = await this.request<SlackResponse & { user: User }>(
      'users.info',
      { user: userId }
    );

    return response.user;
  }

  /**
   * Set channel topic
   */
  async setTopic(channel: string, topic: string): Promise<void> {
    await this.request('conversations.setTopic', { channel, topic });
  }

  /**
   * Get channel info
   */
  async getChannel(channel: string): Promise<Channel> {
    const response = await this.request<SlackResponse & { channel: Channel }>(
      'conversations.info',
      { channel }
    );

    return response.channel;
  }
}

export const slack = new SlackClient();
