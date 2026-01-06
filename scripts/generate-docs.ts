#!/usr/bin/env bun
/**
 * Generate REFERENCE.md from command definitions
 */

// Suppress setup warnings during doc generation
process.env.UNI_SKIP_SETUP_WARNINGS = '1';

import { registry } from '../packages/cli/src/core/registry';

async function generateReference(): Promise<string> {
  const services = await registry.list();

  let md = `# uni CLI Reference

> Auto-generated from command definitions

## Global Options

| Option | Short | Description |
|--------|-------|-------------|
| \`--help\` | \`-h\` | Show help |
| \`--version\` | \`-v\` | Show version |
| \`--json\` | | Output as JSON |
| \`--verbose\` | | Verbose output |
| \`--quiet\` | \`-q\` | Suppress output |
| \`--config\` | \`-c\` | Custom config path |

## Built-in Commands

| Command | Description |
|---------|-------------|
| \`uni list\` | List available services |
| \`uni doctor\` | Check service health & configuration |
| \`uni setup\` | Interactive setup wizard |
| \`uni ask <query>\` | Natural language commands |
| \`uni run "cmd1" "cmd2"\` | Run multiple commands |
| \`uni flow\` | Manage saved command macros |
| \`uni install <name>\` | Install a service package |
| \`uni uninstall <name>\` | Uninstall a service package |
| \`uni auth\` | Manage authentication |
| \`uni config\` | Manage configuration |
| \`uni alias\` | Manage command aliases |
| \`uni history\` | View command history |
| \`uni completions <shell>\` | Generate shell completions (zsh/bash/fish) |

---

## uni doctor

Health check - shows the status of all services, credentials, and LLM providers.

### Usage

\`\`\`bash
uni doctor
uni doctor --json
\`\`\`

### Output

Shows:
- Service status (ready, not authenticated, missing credentials)
- LLM provider availability (ollama, anthropic, openai, groq)
- Credential sources (config, env, default)

---

## uni setup

Interactive setup wizard for configuring services.

### Usage

\`\`\`bash
uni setup                         # Interactive wizard
uni setup <service>               # Easy mode for specific service
uni setup <service> --self-host   # Self-host wizard
uni setup --from <source>         # Import shared credentials
\`\`\`

### Options

| Option | Description |
|--------|-------------|
| \`--self-host\` | Run guided self-host wizard |
| \`--from\` | Import credentials from URL/file/gist |

### Services

| Service | What it configures |
|---------|-------------------|
| \`google\` | gcal, gmail, gdrive (shared OAuth) |
| \`gcal\` | Google Calendar (same as google) |
| \`gmail\` | Gmail (same as google) |
| \`gdrive\` | Google Drive (same as google) |
| \`slack\` | Slack bot token |
| \`notion\` | Notion integration token |

### Examples

\`\`\`bash
# Interactive mode
uni setup

# Easy mode (use default credentials)
uni setup gcal

# Self-host (create your own credentials)
uni setup google --self-host
uni setup slack --self-host
uni setup notion --self-host

# Import shared credentials
uni setup --from https://example.com/creds.json
uni setup --from ./team-creds.json
uni setup --from gist:abc123
\`\`\`

---

## uni ask

Natural language interface - translate plain English to uni commands.

### Usage

\`\`\`bash
uni ask "show my calendar tomorrow"
# → uni gcal list --date tomorrow

uni ask "what tasks do I have"
# → uni gtasks list
\`\`\`

### Options

| Option | Short | Description |
|--------|-------|-------------|
| \`--dry-run\` | \`-n\` | Show command without executing |
| \`--no-confirm\` | | Execute without asking |
| \`--provider\` | | Override LLM provider |
| \`--interactive\` | \`-i\` | Interactive mode (REPL) |

### Examples

\`\`\`bash
uni ask "search for React tutorials"
uni ask "send hello to slack general"
uni ask "what's on my calendar this week"
uni ask -i                              # Interactive mode
uni ask "create a PR" --dry-run         # Preview only
\`\`\`

---

## uni run

Run multiple commands sequentially or in parallel.

### Usage

\`\`\`bash
uni run "cmd1" "cmd2" "cmd3"
\`\`\`

### Options

| Option | Short | Description |
|--------|-------|-------------|
| \`--parallel\` | \`-p\` | Run commands in parallel |
| \`--dry-run\` | \`-n\` | Show commands without executing |
| \`--json\` | | Output results as JSON |

### Examples

\`\`\`bash
uni run "gcal list" "gtasks list"
uni run -p "gmail list" "gcal list" "exa search 'news'"
uni run --dry-run "gcal add 'Meeting'" "slack send general 'Meeting scheduled'"
\`\`\`

---

## uni flow

Manage saved command macros (flows).

### \`uni flow list\`

List all saved flows.

\`\`\`bash
uni flow list
\`\`\`

### \`uni flow add <name> <commands...>\`

Create a new flow.

\`\`\`bash
uni flow add standup "gcal list" "gtasks list"
uni flow add morning "weather London" "gcal next"
\`\`\`

### \`uni flow remove <name>\`

Remove a flow.

\`\`\`bash
uni flow remove standup
\`\`\`

### \`uni flow run <name> [args...]\`

Run a saved flow.

\`\`\`bash
uni flow run standup
uni flow run prcheck 123    # \$1 = 123
\`\`\`

### Shorthand

Flows can be run directly if no service name conflict:

\`\`\`bash
uni standup                 # Same as: uni flow run standup
uni prcheck 456             # Same as: uni flow run prcheck 456
\`\`\`

---

## uni install

Install a service package. Convenience wrapper around \`bun add\`.

### Usage

\`\`\`bash
uni install <name>
\`\`\`

### Resolution Order

1. Tries \`@uni/service-<name>\` (official)
2. Tries \`uni-service-<name>\` (community)
3. Shows error if not found

### Examples

\`\`\`bash
uni install linear              # → bun add @uni/service-linear
uni install @other/some-plugin  # → bun add @other/some-plugin
uni install uni-service-weather # → bun add uni-service-weather
\`\`\`

---

## uni uninstall

Uninstall a service package. Convenience wrapper around \`bun remove\`.

### Usage

\`\`\`bash
uni uninstall <name>
\`\`\`

### Examples

\`\`\`bash
uni uninstall linear            # → bun remove @uni/service-linear
uni uninstall @other/plugin     # → bun remove @other/plugin
\`\`\`

---

## uni alias

Manage command aliases.

### \`uni alias list\`

List all aliases.

### \`uni alias add <name> <command>\`

Create an alias.

\`\`\`bash
uni alias add inbox "gmail list --unread"
uni alias add today "gcal list --date today"
\`\`\`

### \`uni alias remove <name>\`

Remove an alias.

\`\`\`bash
uni alias remove inbox
\`\`\`

### Usage

\`\`\`bash
uni inbox                       # → uni gmail list --unread
\`\`\`

---

## uni history

View and manage command history.

### \`uni history\`

Show recent commands.

### Options

| Option | Short | Description |
|--------|-------|-------------|
| \`--limit\` | \`-l\` | Number of entries to show |
| \`--search\` | \`-s\` | Search history |

### \`uni history run <id>\`

Re-run a command from history.

### \`uni history clear\`

Clear command history.

### Examples

\`\`\`bash
uni history
uni history --limit 50
uni history --search "gcal"
uni history run 42
uni history clear
\`\`\`

---

## uni config

Manage configuration.

### \`uni config show\`

Show all configuration.

### \`uni config get <key>\`

Get a specific config value.

\`\`\`bash
uni config get global.color
\`\`\`

### \`uni config set <key> <value>\`

Set a config value.

\`\`\`bash
uni config set global.color false
uni config set ask.provider anthropic
\`\`\`

### \`uni config edit\`

Open config file in editor.

### \`uni config path\`

Show config file path.

---

`;

  for (const svc of services) {
    const service = await registry.load(svc.name);

    md += `## uni ${service.name}

${service.description}

`;

    for (const cmd of service.commands) {
      const fullCmd = `uni ${service.name} ${cmd.name}`;
      md += `### \`${fullCmd}\`

${cmd.description}

`;

      if (cmd.aliases?.length) {
        md += `**Aliases:** ${cmd.aliases.map(a => `\`${a}\``).join(', ')}\n\n`;
      }

      // Arguments
      if (cmd.args?.length) {
        md += `**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
`;
        for (const arg of cmd.args) {
          md += `| \`${arg.name}\` | ${arg.required ? 'Yes' : 'No'} | ${arg.description} |\n`;
        }
        md += '\n';
      }

      // Options
      if (cmd.options?.length) {
        md += `**Options:**

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
`;
        for (const opt of cmd.options) {
          const short = opt.short ? `-${opt.short}` : '';
          const def = opt.default !== undefined ? `\`${opt.default}\`` : '';
          md += `| \`--${opt.name}\` | ${short} | ${opt.type} | ${def} | ${opt.description} |\n`;
        }
        md += '\n';
      }

      // Examples
      if (cmd.examples?.length) {
        md += `**Examples:**

\`\`\`bash
${cmd.examples.join('\n')}
\`\`\`

`;
      }

      // Subcommands
      if (cmd.subcommands?.length) {
        md += `**Subcommands:**

`;
        for (const sub of cmd.subcommands) {
          md += `#### \`${fullCmd} ${sub.name}\`

${sub.description}

`;

          if (sub.args?.length) {
            md += `| Argument | Required | Description |\n|----------|----------|-------------|\n`;
            for (const arg of sub.args) {
              md += `| \`${arg.name}\` | ${arg.required ? 'Yes' : 'No'} | ${arg.description} |\n`;
            }
            md += '\n';
          }

          if (sub.options?.length) {
            md += `| Option | Short | Type | Description |\n|--------|-------|------|-------------|\n`;
            for (const opt of sub.options) {
              const short = opt.short ? `-${opt.short}` : '';
              md += `| \`--${opt.name}\` | ${short} | ${opt.type} | ${opt.description} |\n`;
            }
            md += '\n';
          }

          if (sub.examples?.length) {
            md += `\`\`\`bash\n${sub.examples.join('\n')}\n\`\`\`\n\n`;
          }
        }
      }

      md += '---\n\n';
    }
  }

  return md;
}

// Run
const reference = await generateReference();
const path = new URL('../skill/REFERENCE.md', import.meta.url).pathname;
await Bun.write(path, reference);
console.log(`Generated ${path}`);
