// @bun
// src/api.ts
import * as fs from "fs";
import * as path from "path";
import * as http from "http";
var SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.file"
];
var TOKEN_PATH = path.join(process.env.HOME || "~", ".uni/tokens/gdrive.json");
var DRIVE_API = "https://www.googleapis.com/drive/v3";

class GDriveClient {
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
        this.tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
      }
    } catch {
      this.tokens = null;
    }
  }
  saveTokens(tokens) {
    const dir = path.dirname(TOKEN_PATH);
    if (!fs.existsSync(dir))
      fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    this.tokens = tokens;
  }
  async getAccessToken() {
    if (!this.tokens)
      throw new Error('Not authenticated. Run "uni gdrive auth".');
    if (this.tokens.expires_at && Date.now() > this.tokens.expires_at - 300000) {
      await this.refreshToken();
    }
    return this.tokens.access_token;
  }
  async refreshToken() {
    if (!this.tokens?.refresh_token)
      throw new Error("No refresh token.");
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
    if (!response.ok)
      throw new Error("Failed to refresh token.");
    const data = await response.json();
    this.saveTokens({
      ...this.tokens,
      access_token: data.access_token,
      expires_at: Date.now() + data.expires_in * 1000
    });
  }
  async authenticate() {
    return new Promise((resolve, reject) => {
      const port = 8087;
      const redirectUri = `http://localhost:${port}/callback`;
      const server = http.createServer(async (req, res) => {
        const url = new URL(req.url || "", `http://localhost:${port}`);
        if (url.pathname === "/callback") {
          const code = url.searchParams.get("code");
          if (code) {
            try {
              await this.exchangeCode(code, redirectUri);
              res.writeHead(200, { "Content-Type": "text/html" });
              res.end("<h1>Google Drive authenticated!</h1>");
              server.close();
              resolve();
            } catch (err) {
              res.writeHead(500);
              res.end("Failed");
              server.close();
              reject(err);
            }
            return;
          }
        }
        res.writeHead(404);
        res.end();
      });
      server.listen(port, () => {
        const params = new URLSearchParams({
          client_id: this.clientId,
          redirect_uri: redirectUri,
          response_type: "code",
          scope: SCOPES.join(" "),
          access_type: "offline",
          prompt: "consent"
        });
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
        console.log(`
Open: \x1B[36m${authUrl}\x1B[0m
`);
        Bun.spawn([process.platform === "darwin" ? "open" : "xdg-open", authUrl], { stdout: "ignore" });
      });
      setTimeout(() => {
        server.close();
        reject(new Error("Timeout"));
      }, 120000);
    });
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
    const data = await response.json();
    this.saveTokens({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000
    });
  }
  async request(endpoint) {
    const token = await this.getAccessToken();
    const response = await fetch(`${DRIVE_API}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok)
      throw new Error(`Drive API error: ${response.status}`);
    return response.json();
  }
  async listFiles(options = {}) {
    const { query, pageSize = 20, folderId } = options;
    const params = new URLSearchParams({
      pageSize: String(pageSize),
      fields: "files(id,name,mimeType,size,modifiedTime,webViewLink,parents)"
    });
    let q = folderId ? `'${folderId}' in parents` : "";
    if (query)
      q = q ? `${q} and ${query}` : query;
    if (q)
      params.set("q", q);
    const response = await this.request(`/files?${params}`);
    return response.files || [];
  }
  async getFile(fileId) {
    return this.request(`/files/${fileId}?fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink,owners`);
  }
  async search(query, pageSize = 20) {
    const params = new URLSearchParams({
      q: `name contains '${query}'`,
      pageSize: String(pageSize),
      fields: "files(id,name,mimeType,size,modifiedTime,webViewLink)"
    });
    const response = await this.request(`/files?${params}`);
    return response.files || [];
  }
  getMimeIcon(mimeType) {
    if (mimeType.includes("folder"))
      return "\uD83D\uDCC1";
    if (mimeType.includes("document"))
      return "\uD83D\uDCDD";
    if (mimeType.includes("spreadsheet"))
      return "\uD83D\uDCCA";
    if (mimeType.includes("presentation"))
      return "\uD83D\uDCFD\uFE0F";
    if (mimeType.includes("image"))
      return "\uD83D\uDDBC\uFE0F";
    if (mimeType.includes("pdf"))
      return "\uD83D\uDCD5";
    if (mimeType.includes("video"))
      return "\uD83C\uDFAC";
    return "\uD83D\uDCC4";
  }
}
var gdrive = new GDriveClient;

// src/commands/list.ts
var listCommand = {
  name: "list",
  description: "List files in Drive",
  aliases: ["ls"],
  options: [
    {
      name: "limit",
      short: "l",
      type: "number",
      description: "Maximum files",
      default: 20
    },
    {
      name: "folder",
      short: "f",
      type: "string",
      description: "Folder ID to list"
    }
  ],
  examples: [
    "uni gdrive list",
    "uni gdrive list --limit 50"
  ],
  async handler(ctx) {
    const { output, flags, globalFlags } = ctx;
    if (!gdrive.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdrive auth".');
      return;
    }
    const spinner = output.spinner("Fetching files...");
    try {
      const files = await gdrive.listFiles({
        pageSize: flags.limit,
        folderId: flags.folder
      });
      spinner.success(`Found ${files.length} files`);
      if (globalFlags.json) {
        output.json(files);
        return;
      }
      console.log("");
      for (const file of files) {
        const icon = gdrive.getMimeIcon(file.mimeType);
        const size = file.size ? ` (${formatSize(parseInt(file.size))})` : "";
        console.log(`${icon} \x1B[1m${file.name}\x1B[0m${size}`);
        if (file.webViewLink) {
          console.log(`   \x1B[36m${file.webViewLink}\x1B[0m`);
        }
      }
      console.log("");
    } catch (error) {
      spinner.fail("Failed");
      throw error;
    }
  }
};
function formatSize(bytes) {
  if (bytes < 1024)
    return `${bytes} B`;
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

// src/commands/search.ts
var searchCommand = {
  name: "search",
  description: "Search files",
  aliases: ["s", "find"],
  args: [
    {
      name: "query",
      description: "Search query",
      required: true
    }
  ],
  options: [
    {
      name: "limit",
      short: "l",
      type: "number",
      description: "Maximum results",
      default: 20
    }
  ],
  examples: [
    'uni gdrive search "meeting notes"',
    'uni gdrive search "project" --limit 50'
  ],
  async handler(ctx) {
    const { output, args, flags, globalFlags } = ctx;
    if (!gdrive.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdrive auth".');
      return;
    }
    const query = args.query;
    if (!query) {
      output.error("Please provide a search query");
      return;
    }
    const spinner = output.spinner(`Searching for "${query}"...`);
    try {
      const files = await gdrive.search(query, flags.limit);
      spinner.success(`Found ${files.length} files`);
      if (globalFlags.json) {
        output.json(files);
        return;
      }
      if (files.length === 0) {
        output.info("No files found");
        return;
      }
      console.log("");
      for (const file of files) {
        const icon = gdrive.getMimeIcon(file.mimeType);
        console.log(`${icon} \x1B[1m${file.name}\x1B[0m`);
        if (file.webViewLink) {
          console.log(`   \x1B[36m${file.webViewLink}\x1B[0m`);
        }
      }
      console.log("");
    } catch (error) {
      spinner.fail("Search failed");
      throw error;
    }
  }
};

// src/commands/auth.ts
var authCommand = {
  name: "auth",
  description: "Authenticate with Google Drive",
  aliases: ["login"],
  options: [
    {
      name: "status",
      short: "s",
      type: "boolean",
      description: "Check status",
      default: false
    }
  ],
  examples: ["uni gdrive auth", "uni gdrive auth --status"],
  async handler(ctx) {
    const { output, flags, globalFlags } = ctx;
    if (flags.status) {
      if (globalFlags.json) {
        output.json({ authenticated: gdrive.isAuthenticated() });
        return;
      }
      if (gdrive.isAuthenticated()) {
        output.success("Authenticated with Google Drive");
      } else {
        output.warn("Not authenticated");
      }
      return;
    }
    if (!gdrive.hasCredentials()) {
      output.error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET");
      return;
    }
    output.info("Starting authentication...");
    await gdrive.authenticate();
    output.success("Authenticated with Google Drive!");
  }
};

// src/index.ts
var gdriveService = {
  name: "gdrive",
  description: "Google Drive - files and search",
  version: "0.1.0",
  commands: [listCommand, searchCommand, authCommand],
  auth: {
    type: "oauth",
    flow: "browser",
    envVar: "GOOGLE_CLIENT_ID"
  },
  async setup() {
    if (!gdrive.hasCredentials()) {
      console.error("\x1B[33mWarning: Google credentials not set.\x1B[0m");
    } else if (!gdrive.isAuthenticated()) {
      console.error('\x1B[33mWarning: Run "uni gdrive auth".\x1B[0m');
    }
  }
};
var src_default = gdriveService;
export {
  src_default as default
};
