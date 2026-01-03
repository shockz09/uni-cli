#!/usr/bin/env bun
/**
 * Generate REFERENCE.md from command definitions
 */

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
| \`uni auth\` | Manage authentication |
| \`uni config\` | Manage configuration |
| \`uni completions <shell>\` | Generate shell completions (zsh/bash/fish) |

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
