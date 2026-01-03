// @bun
// src/api.ts
var SLACK_API = "https://slack.com/api";

class SlackClient {
  token;
  constructor() {
    this.token = process.env.SLACK_BOT_TOKEN || "";
  }
  hasToken() {
    return Boolean(this.token);
  }
  async request(method, params = {}) {
    const url = new URL(`${SLACK_API}/${method}`);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(params)
    });
    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error || "Unknown error"}`);
    }
    return data;
  }
  async listChannels(options = {}) {
    const { limit = 100, types = "public_channel,private_channel" } = options;
    const response = await this.request("conversations.list", { limit, types });
    return response.channels || [];
  }
  async getMessages(channel, options = {}) {
    const { limit = 20 } = options;
    const response = await this.request("conversations.history", { channel, limit });
    return response.messages || [];
  }
  async sendMessage(channel, text, options = {}) {
    const response = await this.request("chat.postMessage", { channel, text, ...options });
    return { ts: response.ts, channel: response.channel };
  }
  async searchMessages(query, options = {}) {
    const { count = 20 } = options;
    const response = await this.request("search.messages", { query, count });
    return {
      messages: response.messages?.matches || [],
      total: response.messages?.total || 0
    };
  }
  async listUsers(options = {}) {
    const { limit = 100 } = options;
    const response = await this.request("users.list", { limit });
    return response.members || [];
  }
  async getUser(userId) {
    const response = await this.request("users.info", { user: userId });
    return response.user;
  }
  async setTopic(channel, topic) {
    await this.request("conversations.setTopic", { channel, topic });
  }
  async getChannel(channel) {
    const response = await this.request("conversations.info", { channel });
    return response.channel;
  }
}
var slack = new SlackClient;

// src/commands/channels.ts
var listCommand = {
  name: "list",
  description: "List channels",
  aliases: ["ls"],
  options: [
    {
      name: "limit",
      short: "l",
      type: "number",
      description: "Maximum number of channels",
      default: 20
    },
    {
      name: "private",
      short: "p",
      type: "boolean",
      description: "Include private channels",
      default: true
    }
  ],
  examples: [
    "uni slack channels list",
    "uni slack channels list --limit 50"
  ],
  async handler(ctx) {
    const { output, flags, globalFlags } = ctx;
    if (!slack.hasToken()) {
      output.error("Slack token not configured. Set SLACK_BOT_TOKEN environment variable.");
      return;
    }
    const spinner = output.spinner("Fetching channels...");
    try {
      const types = flags.private ? "public_channel,private_channel" : "public_channel";
      const channels = await slack.listChannels({
        limit: flags.limit,
        types
      });
      spinner.success(`Found ${channels.length} channels`);
      if (globalFlags.json) {
        output.json(channels);
        return;
      }
      console.log("");
      for (const channel of channels) {
        const prefix = channel.is_private ? "\uD83D\uDD12" : "#";
        const members = channel.num_members ? ` (${channel.num_members} members)` : "";
        console.log(`${prefix} \x1B[1m${channel.name}\x1B[0m${members}`);
        if (channel.purpose?.value) {
          console.log(`   \x1B[90m${channel.purpose.value.slice(0, 80)}\x1B[0m`);
        }
      }
      console.log("");
    } catch (error) {
      spinner.fail("Failed to fetch channels");
      throw error;
    }
  }
};
var infoCommand = {
  name: "info",
  description: "Get channel info",
  args: [
    {
      name: "channel",
      description: "Channel name or ID",
      required: true
    }
  ],
  examples: [
    "uni slack channels info general",
    "uni slack channels info C01234567"
  ],
  async handler(ctx) {
    const { output, args, globalFlags } = ctx;
    if (!slack.hasToken()) {
      output.error("Slack token not configured.");
      return;
    }
    const channelId = args.channel;
    const spinner = output.spinner(`Fetching channel info...`);
    try {
      const channel = await slack.getChannel(channelId);
      spinner.success(`#${channel.name}`);
      if (globalFlags.json) {
        output.json(channel);
        return;
      }
      const prefix = channel.is_private ? "\uD83D\uDD12" : "#";
      console.log("");
      console.log(`${prefix} \x1B[1m${channel.name}\x1B[0m`);
      console.log(`   ID: ${channel.id}`);
      if (channel.topic?.value) {
        console.log(`   Topic: ${channel.topic.value}`);
      }
      if (channel.purpose?.value) {
        console.log(`   Purpose: ${channel.purpose.value}`);
      }
      console.log("");
    } catch (error) {
      spinner.fail("Failed to fetch channel");
      throw error;
    }
  }
};
var channelsCommand = {
  name: "channels",
  description: "Manage channels",
  aliases: ["ch", "channel"],
  subcommands: [listCommand, infoCommand],
  examples: [
    "uni slack channels list",
    "uni slack channels info general"
  ],
  async handler(ctx) {
    await listCommand.handler(ctx);
  }
};

// src/commands/messages.ts
var messagesCommand = {
  name: "messages",
  description: "Read messages from a channel",
  aliases: ["msgs", "read"],
  args: [
    {
      name: "channel",
      description: "Channel name or ID",
      required: true
    }
  ],
  options: [
    {
      name: "limit",
      short: "l",
      type: "number",
      description: "Number of messages",
      default: 10
    }
  ],
  examples: [
    "uni slack messages general",
    "uni slack messages general --limit 20"
  ],
  async handler(ctx) {
    const { output, args, flags, globalFlags } = ctx;
    if (!slack.hasToken()) {
      output.error("Slack token not configured. Set SLACK_BOT_TOKEN environment variable.");
      return;
    }
    const channel = args.channel;
    if (!channel) {
      output.error("Please provide a channel");
      return;
    }
    const spinner = output.spinner("Fetching messages...");
    try {
      const messages = await slack.getMessages(channel, {
        limit: flags.limit
      });
      spinner.success(`Found ${messages.length} messages`);
      if (globalFlags.json) {
        output.json(messages);
        return;
      }
      console.log("");
      for (const msg of messages.reverse()) {
        const time = new Date(parseFloat(msg.ts) * 1000).toLocaleTimeString();
        const user = msg.user || "bot";
        const thread = msg.reply_count ? ` \x1B[90m(${msg.reply_count} replies)\x1B[0m` : "";
        console.log(`\x1B[36m${time}\x1B[0m \x1B[1m${user}\x1B[0m${thread}`);
        console.log(`  ${msg.text}`);
        console.log("");
      }
    } catch (error) {
      spinner.fail("Failed to fetch messages");
      throw error;
    }
  }
};

// src/commands/send.ts
var sendCommand = {
  name: "send",
  description: "Send a message to a channel",
  aliases: ["msg", "message"],
  args: [
    {
      name: "channel",
      description: "Channel name or ID",
      required: true
    },
    {
      name: "message",
      description: "Message text",
      required: true
    }
  ],
  options: [
    {
      name: "thread",
      short: "t",
      type: "string",
      description: "Thread timestamp to reply to"
    }
  ],
  examples: [
    'uni slack send general "Hello team!"',
    'uni slack send C01234567 "Update: deployment complete"',
    'uni slack send general "Reply" --thread 1234567890.123456'
  ],
  async handler(ctx) {
    const { output, args, flags, globalFlags } = ctx;
    if (!slack.hasToken()) {
      output.error("Slack token not configured. Set SLACK_BOT_TOKEN environment variable.");
      return;
    }
    const channel = args.channel;
    const message = args.message;
    if (!channel || !message) {
      output.error("Please provide channel and message");
      return;
    }
    const spinner = output.spinner("Sending message...");
    try {
      const result = await slack.sendMessage(channel, message, {
        thread_ts: flags.thread
      });
      spinner.success("Message sent");
      if (globalFlags.json) {
        output.json(result);
        return;
      }
      console.log(`\x1B[90mSent to ${result.channel} at ${result.ts}\x1B[0m`);
    } catch (error) {
      spinner.fail("Failed to send message");
      throw error;
    }
  }
};

// src/commands/users.ts
var listCommand2 = {
  name: "list",
  description: "List users",
  aliases: ["ls"],
  options: [
    {
      name: "limit",
      short: "l",
      type: "number",
      description: "Maximum number of users",
      default: 50
    }
  ],
  examples: [
    "uni slack users list",
    "uni slack users list --limit 100"
  ],
  async handler(ctx) {
    const { output, flags, globalFlags } = ctx;
    if (!slack.hasToken()) {
      output.error("Slack token not configured.");
      return;
    }
    const spinner = output.spinner("Fetching users...");
    try {
      const users = await slack.listUsers({ limit: flags.limit });
      const realUsers = users.filter((u) => !u.is_bot);
      spinner.success(`Found ${realUsers.length} users`);
      if (globalFlags.json) {
        output.json(realUsers);
        return;
      }
      console.log("");
      for (const user of realUsers) {
        const displayName = user.profile.display_name || user.real_name || user.name;
        const email = user.profile.email ? ` \x1B[90m<${user.profile.email}>\x1B[0m` : "";
        console.log(`\x1B[1m${displayName}\x1B[0m (@${user.name})${email}`);
      }
      console.log("");
    } catch (error) {
      spinner.fail("Failed to fetch users");
      throw error;
    }
  }
};
var infoCommand2 = {
  name: "info",
  description: "Get user info",
  args: [
    {
      name: "user",
      description: "User ID",
      required: true
    }
  ],
  examples: [
    "uni slack users info U01234567"
  ],
  async handler(ctx) {
    const { output, args, globalFlags } = ctx;
    if (!slack.hasToken()) {
      output.error("Slack token not configured.");
      return;
    }
    const userId = args.user;
    const spinner = output.spinner("Fetching user...");
    try {
      const user = await slack.getUser(userId);
      spinner.success(user.real_name);
      if (globalFlags.json) {
        output.json(user);
        return;
      }
      console.log("");
      console.log(`\x1B[1m${user.real_name}\x1B[0m (@${user.name})`);
      console.log(`ID: ${user.id}`);
      if (user.profile.email) {
        console.log(`Email: ${user.profile.email}`);
      }
      if (user.profile.display_name) {
        console.log(`Display: ${user.profile.display_name}`);
      }
      console.log("");
    } catch (error) {
      spinner.fail("Failed to fetch user");
      throw error;
    }
  }
};
var usersCommand = {
  name: "users",
  description: "Manage users",
  aliases: ["user", "u"],
  subcommands: [listCommand2, infoCommand2],
  examples: [
    "uni slack users list",
    "uni slack users info U01234567"
  ],
  async handler(ctx) {
    await listCommand2.handler(ctx);
  }
};

// src/index.ts
var slackService = {
  name: "slack",
  description: "Slack messaging - channels, messages, users",
  version: "0.1.0",
  commands: [channelsCommand, messagesCommand, sendCommand, usersCommand],
  auth: {
    type: "token",
    envVar: "SLACK_BOT_TOKEN",
    flow: "manual"
  },
  async setup() {
    if (!slack.hasToken()) {
      console.error("\x1B[33mWarning: SLACK_BOT_TOKEN not set.\x1B[0m");
    }
  }
};
var src_default = slackService;
export {
  src_default as default
};
