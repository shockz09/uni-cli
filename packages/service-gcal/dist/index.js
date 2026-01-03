// @bun
// src/api.ts
import * as fs from "fs";
import * as path from "path";
import * as http from "http";
var SCOPES = ["https://www.googleapis.com/auth/calendar.readonly", "https://www.googleapis.com/auth/calendar.events"];
var TOKEN_PATH = path.join(process.env.HOME || "~", ".uni/tokens/gcal.json");
var CALENDAR_API = "https://www.googleapis.com/calendar/v3";

class GoogleCalendarClient {
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
      throw new Error('Not authenticated. Run "uni gcal auth" first.');
    }
    if (this.tokens.expires_at && Date.now() > this.tokens.expires_at - 300000) {
      await this.refreshToken();
    }
    return this.tokens.access_token;
  }
  async refreshToken() {
    if (!this.tokens?.refresh_token) {
      throw new Error('No refresh token. Run "uni gcal auth" to re-authenticate.');
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
      throw new Error('Failed to refresh token. Run "uni gcal auth" to re-authenticate.');
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
      const error = await response.text();
      throw new Error(`OAuth failed: ${error}`);
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
      const port = 8085;
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
              res.end("<h1>Authentication successful!</h1><p>You can close this window.</p>");
              server.close();
              resolve();
            } catch (err) {
              res.writeHead(500, { "Content-Type": "text/html" });
              res.end(`<h1>Authentication failed</h1><p>${err}</p>`);
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
        const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
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
    const response = await fetch(`${CALENDAR_API}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers
      }
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }
    return response.json();
  }
  async listEvents(options = {}) {
    const {
      calendarId = "primary",
      timeMin = new Date,
      timeMax,
      maxResults = 10,
      singleEvents = true,
      orderBy = "startTime"
    } = options;
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      maxResults: String(maxResults),
      singleEvents: String(singleEvents),
      orderBy
    });
    if (timeMax) {
      params.set("timeMax", timeMax.toISOString());
    }
    const response = await this.request(`/calendars/${encodeURIComponent(calendarId)}/events?${params}`);
    return response.items || [];
  }
  async getEvent(eventId, calendarId = "primary") {
    return this.request(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`);
  }
  async createEvent(event, calendarId = "primary") {
    return this.request(`/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: "POST",
      body: JSON.stringify(event)
    });
  }
  async deleteEvent(eventId, calendarId = "primary") {
    await this.request(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });
  }
}
var gcal = new GoogleCalendarClient;

// src/commands/list.ts
var listCommand = {
  name: "list",
  description: "List calendar events",
  aliases: ["ls", "events"],
  options: [
    {
      name: "date",
      short: "d",
      type: "string",
      description: "Date to show events for (today, tomorrow, YYYY-MM-DD)",
      default: "today"
    },
    {
      name: "days",
      short: "n",
      type: "number",
      description: "Number of days to show",
      default: 1
    },
    {
      name: "limit",
      short: "l",
      type: "number",
      description: "Maximum number of events",
      default: 20
    }
  ],
  examples: [
    "uni gcal list",
    "uni gcal list --date tomorrow",
    "uni gcal list --days 7",
    "uni gcal list --date 2025-01-15"
  ],
  async handler(ctx) {
    const { output, flags, globalFlags } = ctx;
    if (!gcal.hasCredentials()) {
      output.error("Google Calendar credentials not configured.");
      output.info("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.");
      output.info("Create credentials at: https://console.cloud.google.com/apis/credentials");
      return;
    }
    if (!gcal.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gcal auth" first.');
      return;
    }
    const spinner = output.spinner("Fetching events...");
    try {
      let startDate = new Date;
      const dateStr = flags.date;
      if (dateStr === "tomorrow") {
        startDate.setDate(startDate.getDate() + 1);
      } else if (dateStr !== "today" && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        startDate = new Date(dateStr);
      }
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + flags.days);
      endDate.setHours(23, 59, 59, 999);
      const events = await gcal.listEvents({
        timeMin: startDate,
        timeMax: endDate,
        maxResults: flags.limit
      });
      spinner.success(`Found ${events.length} event${events.length === 1 ? "" : "s"}`);
      if (globalFlags.json) {
        output.json(events);
        return;
      }
      if (events.length === 0) {
        output.info("No events scheduled");
        return;
      }
      console.log("");
      const byDate = new Map;
      for (const event of events) {
        const eventDate = event.start.dateTime || event.start.date || "";
        const dateKey = eventDate.split("T")[0];
        if (!byDate.has(dateKey)) {
          byDate.set(dateKey, []);
        }
        byDate.get(dateKey).push(event);
      }
      for (const [date, dayEvents] of byDate) {
        const dateObj = new Date(date);
        const dateLabel = dateObj.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric"
        });
        console.log(`\x1B[1m\uD83D\uDCC5 ${dateLabel}\x1B[0m`);
        for (const event of dayEvents) {
          const isAllDay = !event.start.dateTime;
          let timeStr = "All day";
          if (!isAllDay && event.start.dateTime) {
            const start = new Date(event.start.dateTime);
            const end = event.end.dateTime ? new Date(event.end.dateTime) : null;
            timeStr = start.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true
            });
            if (end) {
              timeStr += ` - ${end.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true
              })}`;
            }
          }
          const status = event.status === "cancelled" ? " \x1B[31m[cancelled]\x1B[0m" : "";
          console.log(`  \x1B[36m${timeStr}\x1B[0m ${event.summary}${status}`);
          if (event.location) {
            console.log(`    \x1B[90m\uD83D\uDCCD ${event.location}\x1B[0m`);
          }
        }
        console.log("");
      }
    } catch (error) {
      spinner.fail("Failed to fetch events");
      throw error;
    }
  }
};

// src/commands/add.ts
function parseTime(timeStr) {
  let match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    return { hours: parseInt(match[1]), minutes: parseInt(match[2]) };
  }
  match = timeStr.toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const period = match[3];
    if (period === "pm" && hours !== 12)
      hours += 12;
    if (period === "am" && hours === 12)
      hours = 0;
    return { hours, minutes };
  }
  return null;
}
function parseDuration(durationStr) {
  let totalMinutes = 0;
  const hoursMatch = durationStr.match(/(\d+)\s*h/i);
  if (hoursMatch) {
    totalMinutes += parseInt(hoursMatch[1]) * 60;
  }
  const minsMatch = durationStr.match(/(\d+)\s*m/i);
  if (minsMatch) {
    totalMinutes += parseInt(minsMatch[1]);
  }
  if (!hoursMatch && !minsMatch) {
    const num = parseInt(durationStr);
    if (!isNaN(num)) {
      totalMinutes = num;
    }
  }
  return totalMinutes > 0 ? totalMinutes : null;
}
var addCommand = {
  name: "add",
  description: "Create a calendar event",
  aliases: ["create", "new"],
  args: [
    {
      name: "title",
      description: "Event title",
      required: true
    }
  ],
  options: [
    {
      name: "time",
      short: "t",
      type: "string",
      description: "Start time (e.g., 10am, 14:30)",
      required: true
    },
    {
      name: "duration",
      short: "d",
      type: "string",
      description: "Duration (e.g., 30m, 1h, 1h30m)",
      default: "1h"
    },
    {
      name: "date",
      type: "string",
      description: "Date (today, tomorrow, YYYY-MM-DD)",
      default: "today"
    },
    {
      name: "location",
      short: "l",
      type: "string",
      description: "Event location"
    },
    {
      name: "description",
      type: "string",
      description: "Event description"
    }
  ],
  examples: [
    'uni gcal add "Team standup" --time 10am --duration 30m',
    'uni gcal add "Lunch with Bob" --time 12:30pm --date tomorrow',
    'uni gcal add "Meeting" --time 2pm --location "Conference Room A"'
  ],
  async handler(ctx) {
    const { output, args, flags, globalFlags } = ctx;
    if (!gcal.hasCredentials()) {
      output.error("Google Calendar credentials not configured.");
      output.info("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.");
      return;
    }
    if (!gcal.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gcal auth" first.');
      return;
    }
    const title = args.title;
    if (!title) {
      output.error("Please provide an event title");
      return;
    }
    const timeStr = flags.time;
    const parsedTime = parseTime(timeStr);
    if (!parsedTime) {
      output.error(`Invalid time format: ${timeStr}. Use formats like 10am, 2:30pm, or 14:00`);
      return;
    }
    const durationStr = flags.duration;
    const durationMinutes = parseDuration(durationStr);
    if (!durationMinutes) {
      output.error(`Invalid duration: ${durationStr}. Use formats like 30m, 1h, or 1h30m`);
      return;
    }
    let eventDate = new Date;
    const dateStr = flags.date;
    if (dateStr === "tomorrow") {
      eventDate.setDate(eventDate.getDate() + 1);
    } else if (dateStr !== "today" && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      eventDate = new Date(dateStr);
    }
    const startTime = new Date(eventDate);
    startTime.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const spinner = output.spinner("Creating event...");
    try {
      const event = await gcal.createEvent({
        summary: title,
        description: flags.description,
        location: flags.location,
        start: { dateTime: startTime.toISOString(), timeZone },
        end: { dateTime: endTime.toISOString(), timeZone }
      });
      spinner.success("Event created");
      if (globalFlags.json) {
        output.json(event);
        return;
      }
      const startStr = startTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
      const endStr = endTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
      const dateLabel = startTime.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric"
      });
      console.log("");
      console.log(`\x1B[1m\uD83D\uDCC5 ${event.summary}\x1B[0m`);
      console.log(`   ${dateLabel}`);
      console.log(`   \x1B[36m${startStr} - ${endStr}\x1B[0m`);
      if (event.location) {
        console.log(`   \x1B[90m\uD83D\uDCCD ${event.location}\x1B[0m`);
      }
      console.log(`   \x1B[90m${event.htmlLink}\x1B[0m`);
      console.log("");
    } catch (error) {
      spinner.fail("Failed to create event");
      throw error;
    }
  }
};

// src/commands/next.ts
var nextCommand = {
  name: "next",
  description: "Show next upcoming event",
  aliases: ["upcoming"],
  options: [
    {
      name: "count",
      short: "n",
      type: "number",
      description: "Number of upcoming events to show",
      default: 1
    }
  ],
  examples: [
    "uni gcal next",
    "uni gcal next --count 3"
  ],
  async handler(ctx) {
    const { output, flags, globalFlags } = ctx;
    if (!gcal.hasCredentials()) {
      output.error("Google Calendar credentials not configured.");
      output.info("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.");
      return;
    }
    if (!gcal.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gcal auth" first.');
      return;
    }
    const spinner = output.spinner("Fetching next event...");
    try {
      const events = await gcal.listEvents({
        maxResults: flags.count
      });
      spinner.stop();
      if (globalFlags.json) {
        output.json(events);
        return;
      }
      if (events.length === 0) {
        output.info("No upcoming events");
        return;
      }
      console.log("");
      for (const event of events) {
        const isAllDay = !event.start.dateTime;
        const eventDate = new Date(event.start.dateTime || event.start.date || "");
        const dateLabel = eventDate.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric"
        });
        let timeStr = "All day";
        if (!isAllDay && event.start.dateTime) {
          const start = new Date(event.start.dateTime);
          const end = event.end.dateTime ? new Date(event.end.dateTime) : null;
          timeStr = start.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
          });
          if (end) {
            timeStr += ` - ${end.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true
            })}`;
          }
        }
        const now = Date.now();
        const eventTime = eventDate.getTime();
        const diffMs = eventTime - now;
        let untilStr = "";
        if (diffMs > 0) {
          const diffMins = Math.floor(diffMs / 60000);
          if (diffMins < 60) {
            untilStr = `in ${diffMins} minute${diffMins === 1 ? "" : "s"}`;
          } else if (diffMins < 1440) {
            const hours = Math.floor(diffMins / 60);
            untilStr = `in ${hours} hour${hours === 1 ? "" : "s"}`;
          } else {
            const days = Math.floor(diffMins / 1440);
            untilStr = `in ${days} day${days === 1 ? "" : "s"}`;
          }
        } else {
          untilStr = "now";
        }
        console.log(`\x1B[1m\uD83D\uDCC5 ${event.summary}\x1B[0m \x1B[33m(${untilStr})\x1B[0m`);
        console.log(`   ${dateLabel}`);
        console.log(`   \x1B[36m${timeStr}\x1B[0m`);
        if (event.location) {
          console.log(`   \x1B[90m\uD83D\uDCCD ${event.location}\x1B[0m`);
        }
        console.log("");
      }
    } catch (error) {
      spinner.fail("Failed to fetch events");
      throw error;
    }
  }
};

// src/commands/auth.ts
var authCommand = {
  name: "auth",
  description: "Authenticate with Google Calendar",
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
    "uni gcal auth",
    "uni gcal auth --status"
  ],
  async handler(ctx) {
    const { output, flags, globalFlags } = ctx;
    if (flags.status) {
      if (globalFlags.json) {
        output.json({
          hasCredentials: gcal.hasCredentials(),
          isAuthenticated: gcal.isAuthenticated()
        });
        return;
      }
      if (!gcal.hasCredentials()) {
        output.warn("Credentials not configured");
        output.info("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.");
        output.info("Create credentials at: https://console.cloud.google.com/apis/credentials");
        return;
      }
      if (gcal.isAuthenticated()) {
        output.success("Authenticated with Google Calendar");
      } else {
        output.warn('Not authenticated. Run "uni gcal auth" to login.');
      }
      return;
    }
    if (!gcal.hasCredentials()) {
      output.error("Google Calendar credentials not configured.");
      console.log("");
      console.log("To set up Google Calendar:");
      console.log("");
      console.log("1. Go to https://console.cloud.google.com/apis/credentials");
      console.log("2. Create an OAuth 2.0 Client ID (Desktop app)");
      console.log("3. Enable the Google Calendar API");
      console.log("4. Set environment variables:");
      console.log('   export GOOGLE_CLIENT_ID="your-client-id"');
      console.log('   export GOOGLE_CLIENT_SECRET="your-client-secret"');
      console.log("");
      return;
    }
    output.info("Starting authentication flow...");
    output.info("A browser window will open for you to authorize access.");
    try {
      await gcal.authenticate();
      output.success("Successfully authenticated with Google Calendar!");
    } catch (error) {
      output.error("Authentication failed");
      throw error;
    }
  }
};

// src/index.ts
var gcalService = {
  name: "gcal",
  description: "Google Calendar - events and scheduling",
  version: "0.1.0",
  commands: [listCommand, addCommand, nextCommand, authCommand],
  auth: {
    type: "oauth",
    flow: "browser",
    envVar: "GOOGLE_CLIENT_ID"
  },
  async setup() {
    if (!gcal.hasCredentials()) {
      console.error("\x1B[33mWarning: Google Calendar credentials not configured.\x1B[0m");
      console.error("\x1B[33mSet GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.\x1B[0m");
    } else if (!gcal.isAuthenticated()) {
      console.error('\x1B[33mWarning: Not authenticated. Run "uni gcal auth" to login.\x1B[0m');
    }
  }
};
var src_default = gcalService;
export {
  src_default as default
};
