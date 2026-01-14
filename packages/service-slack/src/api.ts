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

  /**
   * Get thread replies
   */
  async getThreadReplies(channel: string, threadTs: string, limit = 20): Promise<Message[]> {
    const response = await this.request<SlackResponse & { messages: Message[] }>(
      'conversations.replies',
      { channel, ts: threadTs, limit }
    );

    return response.messages || [];
  }

  /**
   * Add reaction to a message
   */
  async addReaction(channel: string, timestamp: string, emoji: string): Promise<void> {
    await this.request('reactions.add', { channel, timestamp, name: emoji });
  }

  /**
   * Remove reaction from a message
   */
  async removeReaction(channel: string, timestamp: string, emoji: string): Promise<void> {
    await this.request('reactions.remove', { channel, timestamp, name: emoji });
  }

  /**
   * Pin a message
   */
  async pinMessage(channel: string, timestamp: string): Promise<void> {
    await this.request('pins.add', { channel, timestamp });
  }

  /**
   * Unpin a message
   */
  async unpinMessage(channel: string, timestamp: string): Promise<void> {
    await this.request('pins.remove', { channel, timestamp });
  }

  /**
   * List pinned messages
   */
  async listPins(channel: string): Promise<Array<{ message: Message }>> {
    const response = await this.request<SlackResponse & { items: Array<{ message: Message }> }>(
      'pins.list',
      { channel }
    );

    return response.items || [];
  }

  /**
   * Schedule a message
   */
  async scheduleMessage(
    channel: string,
    text: string,
    postAt: number,
    options: { thread_ts?: string } = {}
  ): Promise<{ scheduled_message_id: string; post_at: number }> {
    const response = await this.request<SlackResponse & { scheduled_message_id: string; post_at: number }>(
      'chat.scheduleMessage',
      { channel, text, post_at: postAt, ...options }
    );

    return { scheduled_message_id: response.scheduled_message_id, post_at: response.post_at };
  }

  /**
   * List scheduled messages
   */
  async listScheduledMessages(channel?: string): Promise<Array<{ id: string; channel_id: string; post_at: number; text: string }>> {
    const params: Record<string, string | number | boolean> = {};
    if (channel) params.channel = channel;

    const response = await this.request<SlackResponse & { scheduled_messages: Array<{ id: string; channel_id: string; post_at: number; text: string }> }>(
      'chat.scheduledMessages.list',
      params
    );

    return response.scheduled_messages || [];
  }

  /**
   * Delete a scheduled message
   */
  async deleteScheduledMessage(channel: string, scheduledMessageId: string): Promise<void> {
    await this.request('chat.deleteScheduledMessage', { channel, scheduled_message_id: scheduledMessageId });
  }
}

export const slack = new SlackClient();
