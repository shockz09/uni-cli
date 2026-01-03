// @bun
// src/api.ts
import * as fs from "fs";
import * as path from "path";
import * as http from "http";
var SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify"
];
var TOKEN_PATH = path.join(process.env.HOME || "~", ".uni/tokens/gmail.json");
var GMAIL_API = "https://gmail.googleapis.com/gmail/v1";

class GmailClient {
  clientId;
  clientSecret;
  tokens = null;
  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || "";
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
    this.loadTokens();
  }
  hasCredentials() {
    return Boolean(this.clientId && this.clientSecret);
  }
  isAuthenticated() {
    return Boolean(this.tokens?.access_token);
  }
  loadTokens() {
    try {
      if (fs.existsSync(TOKEN_PATH)) {
        const data = fs.readFileSync(TOKEN_PATH, "utf-8");
        this.tokens = JSON.parse(data);
      }
    } catch {
      this.tokens = null;
    }
  }
  saveTokens(tokens) {
    const dir = path.dirname(TOKEN_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    this.tokens = tokens;
  }
  async getAccessToken() {
    if (!this.tokens) {
      throw new Error('Not authenticated. Run "uni gmail auth" first.');
    }
    if (this.tokens.expires_at && Date.now() > this.tokens.expires_at - 300000) {
      await this.refreshToken();
    }
    return this.tokens.access_token;
  }
  async refreshToken() {
    if (!this.tokens?.refresh_token) {
      throw new Error('No refresh token. Run "uni gmail auth" to re-authenticate.');
    }
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.tokens.refresh_token,
        grant_type: "refresh_token"
      })
    });
    if (!response.ok) {
      throw new Error("Failed to refresh token.");
    }
    const data = await response.json();
    this.saveTokens({
      ...this.tokens,
      access_token: data.access_token,
      expires_at: Date.now() + data.expires_in * 1000
    });
  }
  getAuthUrl(redirectUri) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES.join(" "),
      access_type: "offline",
      prompt: "consent"
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }
  async exchangeCode(code, redirectUri) {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });
    if (!response.ok) {
      throw new Error("OAuth failed");
    }
    const data = await response.json();
    this.saveTokens({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000
    });
  }
  async authenticate() {
    return new Promise((resolve, reject) => {
      const port = 8086;
      const redirectUri = `http://localhost:${port}/callback`;
      const server = http.createServer(async (req, res) => {
        const url = new URL(req.url || "", `http://localhost:${port}`);
        if (url.pathname === "/callback") {
          const code = url.searchParams.get("code");
          const error = url.searchParams.get("error");
          if (error) {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end(`<h1>Authentication failed</h1><p>${error}</p>`);
            server.close();
            reject(new Error(error));
            return;
          }
          if (code) {
            try {
              await this.exchangeCode(code, redirectUri);
              res.writeHead(200, { "Content-Type": "text/html" });
              res.end("<h1>Gmail authenticated!</h1><p>You can close this window.</p>");
              server.close();
              resolve();
            } catch (err) {
              res.writeHead(500, { "Content-Type": "text/html" });
              res.end(`<h1>Failed</h1><p>${err}</p>`);
              server.close();
              reject(err);
            }
            return;
          }
        }
        res.writeHead(404);
        res.end("Not found");
      });
      server.listen(port, () => {
        const authUrl = this.getAuthUrl(redirectUri);
        console.log(`
Open this URL in your browser:

\x1B[36m${authUrl}\x1B[0m
`);
        const cmd = process.platform === "darwin" ? "open" : "xdg-open";
        Bun.spawn([cmd, authUrl], { stdout: "ignore", stderr: "ignore" });
      });
      setTimeout(() => {
        server.close();
        reject(new Error("Authentication timed out"));
      }, 120000);
    });
  }
  async request(endpoint, options = {}) {
    const token = await this.getAccessToken();
    const response = await fetch(`${GMAIL_API}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers
      }
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gmail API error: ${response.status} - ${error}`);
    }
    return response.json();
  }
  async listEmails(options = {}) {
    const { maxResults = 20, q, labelIds } = options;
    const params = new URLSearchParams({ maxResults: String(maxResults) });
    if (q)
      params.set("q", q);
    if (labelIds)
      params.set("labelIds", labelIds.join(","));
    const response = await this.request(`/users/me/messages?${params}`);
    return response.messages || [];
  }
  async getEmail(id) {
    return this.request(`/users/me/messages/${id}`);
  }
  async sendEmail(to, subject, body) {
    const raw = this.createRawEmail(to, subject, body);
    return this.request("/users/me/messages/send", {
      method: "POST",
      body: JSON.stringify({ raw })
    });
  }
  createRawEmail(to, subject, body) {
    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      body
    ].join(`\r
`);
    return Buffer.from(email).toString("base64url");
  }
  getHeader(email, name) {
    return email.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
  }
  decodeBody(email) {
    if (email.payload?.body?.data) {
      return Buffer.from(email.payload.body.data, "base64url").toString("utf-8");
    }
    const textPart = email.payload?.parts?.find((p) => p.mimeType === "text/plain");
    if (textPart?.body?.data) {
      return Buffer.from(textPart.body.data, "base64url").toString("utf-8");
    }
    return email.snippet || "";
  }
}
var gmail = new GmailClient;

// src/commands/list.ts
var listCommand = {
  name: "list",
  description: "List emails",
  aliases: ["ls", "inbox"],
  options: [
    {
      name: "limit",
      short: "l",
      type: "number",
      description: "Number of emails",
      default: 10
    },
    {
      name: "query",
      short: "q",
      type: "string",
      description: "Search query (Gmail search syntax)"
    },
    {
      name: "unread",
      short: "u",
      type: "boolean",
      description: "Only unread emails",
      default: false
    }
  ],
  examples: [
    "uni gmail list",
    "uni gmail list --limit 20",
    'uni gmail list --query "from:github.com"',
    "uni gmail list --unread"
  ],
  async handler(ctx) {
    const { output, flags, globalFlags } = ctx;
    if (!gmail.hasCredentials()) {
      output.error("Google credentials not configured.");
      return;
    }
    if (!gmail.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmail auth" first.');
      return;
    }
    const spinner = output.spinner("Fetching emails...");
    try {
      let query = flags.query;
      if (flags.unread) {
        query = query ? `${query} is:unread` : "is:unread";
      }
      const messages = await gmail.listEmails({
        maxResults: flags.limit,
        q: query
      });
      if (messages.length === 0) {
        spinner.success("No emails found");
        return;
      }
      const emails = await Promise.all(messages.slice(0, flags.limit).map((m) => gmail.getEmail(m.id)));
      spinner.success(`Found ${emails.length} emails`);
      if (globalFlags.json) {
        output.json(emails);
        return;
      }
      console.log("");
      for (const email of emails) {
        const from = gmail.getHeader(email, "From") || "Unknown";
        const subject = gmail.getHeader(email, "Subject") || "(no subject)";
        const date = email.internalDate ? new Date(parseInt(email.internalDate)).toLocaleDateString() : "";
        const isUnread = email.labelIds?.includes("UNREAD");
        const marker = isUnread ? "\x1B[1m\u25CF\x1B[0m " : "  ";
        const fromMatch = from.match(/^(.+?)\s*<.+>$/);
        const fromName = fromMatch ? fromMatch[1].replace(/"/g, "") : from;
        console.log(`${marker}\x1B[1m${subject}\x1B[0m`);
        console.log(`   \x1B[36m${fromName}\x1B[0m  \x1B[90m${date}\x1B[0m`);
        console.log(`   \x1B[90m${email.snippet?.slice(0, 80)}...\x1B[0m`);
        console.log("");
      }
    } catch (error) {
      spinner.fail("Failed to fetch emails");
      throw error;
    }
  }
};

// src/commands/read.ts
var readCommand = {
  name: "read",
  description: "Read an email",
  aliases: ["view", "show"],
  args: [
    {
      name: "id",
      description: "Email ID",
      required: true
    }
  ],
  examples: [
    "uni gmail read abc123"
  ],
  async handler(ctx) {
    const { output, args, globalFlags } = ctx;
    if (!gmail.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmail auth" first.');
      return;
    }
    const id = args.id;
    if (!id) {
      output.error("Please provide an email ID");
      return;
    }
    const spinner = output.spinner("Fetching email...");
    try {
      const email = await gmail.getEmail(id);
      spinner.success("Email loaded");
      if (globalFlags.json) {
        output.json(email);
        return;
      }
      const from = gmail.getHeader(email, "From") || "Unknown";
      const to = gmail.getHeader(email, "To") || "";
      const subject = gmail.getHeader(email, "Subject") || "(no subject)";
      const date = gmail.getHeader(email, "Date") || "";
      const body = gmail.decodeBody(email);
      console.log("");
      console.log(`\x1B[1m${subject}\x1B[0m`);
      console.log(`\x1B[36mFrom:\x1B[0m ${from}`);
      console.log(`\x1B[36mTo:\x1B[0m ${to}`);
      console.log(`\x1B[36mDate:\x1B[0m ${date}`);
      console.log(`
\x1B[90m\u2500\u2500\u2500 Body \u2500\u2500\u2500\x1B[0m
`);
      console.log(body);
      console.log("");
    } catch (error) {
      spinner.fail("Failed to fetch email");
      throw error;
    }
  }
};

// src/commands/send.ts
var sendCommand = {
  name: "send",
  description: "Send an email",
  aliases: ["compose", "new"],
  options: [
    {
      name: "to",
      short: "t",
      type: "string",
      description: "Recipient email",
      required: true
    },
    {
      name: "subject",
      short: "s",
      type: "string",
      description: "Email subject",
      required: true
    },
    {
      name: "body",
      short: "b",
      type: "string",
      description: "Email body",
      required: true
    }
  ],
  examples: [
    'uni gmail send --to user@example.com --subject "Hello" --body "Message"'
  ],
  async handler(ctx) {
    const { output, flags, globalFlags } = ctx;
    if (!gmail.hasCredentials()) {
      output.error("Google credentials not configured.");
      return;
    }
    if (!gmail.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmail auth" first.');
      return;
    }
    const to = flags.to;
    const subject = flags.subject;
    const body = flags.body;
    if (!to || !subject || !body) {
      output.error("Please provide --to, --subject, and --body");
      return;
    }
    const spinner = output.spinner("Sending email...");
    try {
      const result = await gmail.sendEmail(to, subject, body);
      spinner.success("Email sent");
      if (globalFlags.json) {
        output.json(result);
        return;
      }
      console.log(`\x1B[90mMessage ID: ${result.id}\x1B[0m`);
    } catch (error) {
      spinner.fail("Failed to send email");
      throw error;
    }
  }
};

// src/commands/auth.ts
var authCommand = {
  name: "auth",
  description: "Authenticate with Gmail",
  aliases: ["login"],
  options: [
    {
      name: "status",
      short: "s",
      type: "boolean",
      description: "Check authentication status",
      default: false
    }
  ],
  examples: [
    "uni gmail auth",
    "uni gmail auth --status"
  ],
  async handler(ctx) {
    const { output, flags, globalFlags } = ctx;
    if (flags.status) {
      if (globalFlags.json) {
        output.json({
          hasCredentials: gmail.hasCredentials(),
          isAuthenticated: gmail.isAuthenticated()
        });
        return;
      }
      if (!gmail.hasCredentials()) {
        output.warn("Credentials not configured");
        return;
      }
      if (gmail.isAuthenticated()) {
        output.success("Authenticated with Gmail");
      } else {
        output.warn('Not authenticated. Run "uni gmail auth"');
      }
      return;
    }
    if (!gmail.hasCredentials()) {
      output.error("Google credentials not configured.");
      output.info("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET");
      return;
    }
    output.info("Starting Gmail authentication...");
    try {
      await gmail.authenticate();
      output.success("Successfully authenticated with Gmail!");
    } catch (error) {
      output.error("Authentication failed");
      throw error;
    }
  }
};

// src/index.ts
var gmailService = {
  name: "gmail",
  description: "Gmail - read, send, and search emails",
  version: "0.1.0",
  commands: [listCommand, readCommand, sendCommand, authCommand],
  auth: {
    type: "oauth",
    flow: "browser",
    envVar: "GOOGLE_CLIENT_ID"
  },
  async setup() {
    if (!gmail.hasCredentials()) {
      console.error("\x1B[33mWarning: Google credentials not configured.\x1B[0m");
    } else if (!gmail.isAuthenticated()) {
      console.error('\x1B[33mWarning: Not authenticated. Run "uni gmail auth".\x1B[0m');
    }
  }
};
var src_default = gmailService;
export {
  src_default as default
};
