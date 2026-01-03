/**
 * Main CLI orchestrator
 */

import type { UniService, Command, CommandContext, GlobalFlags } from '@uni/shared';
import { CommandNotFoundError, UniError } from '@uni/shared';
import { parseArgs, parseCommandArgs } from './parser';
import { registry } from './registry';
import { config } from './config';
import { createOutputFormatter } from './output';
import { createPromptHelper } from '../utils/prompt';
import { generateZshCompletions, generateBashCompletions, generateFishCompletions } from './completions';
import * as c from '../utils/colors';

const VERSION = '0.1.0';

export class UniCLI {
  /**
   * Run the CLI
   */
  async run(argv: string[]): Promise<void> {
    const parsed = parseArgs(argv);
    const output = createOutputFormatter(parsed.globalFlags);

    try {
      // Load config
      await config.load(parsed.globalFlags.config);

      // Handle global flags
      if (parsed.globalFlags.help && !parsed.service) {
        this.showGlobalHelp(output);
        return;
      }

      if ((parsed.globalFlags as Record<string, unknown>).version) {
        this.showVersion(output, parsed.globalFlags);
        return;
      }

      // No service specified
      if (!parsed.service) {
        // Check for special commands
        this.showGlobalHelp(output);
        return;
      }

      // Handle built-in commands
      if (parsed.service === 'list') {
        await this.listServices(output, parsed.globalFlags);
        return;
      }

      if (parsed.service === 'auth') {
        await this.handleAuth(parsed, output);
        return;
      }

      if (parsed.service === 'config') {
        await this.handleConfig(parsed, output);
        return;
      }

      if (parsed.service === 'completions') {
        await this.handleCompletions(parsed, output);
        return;
      }

      // Check if service exists
      const exists = await registry.has(parsed.service);
      if (!exists) {
        throw new UniError(
          `Unknown service or command: '${parsed.service}'`,
          'UNKNOWN_SERVICE',
          `Run 'uni list' to see available services, or 'uni --help' for usage`
        );
      }

      // Load service
      const service = await registry.load(parsed.service);

      // Show service help
      if (parsed.globalFlags.help || !parsed.command) {
        this.showServiceHelp(service, output);
        return;
      }

      // Find the base command first
      const baseCommand = service.commands.find(
        c => c.name === parsed.command || c.aliases?.includes(parsed.command!)
      );

      if (!baseCommand) {
        const availableCommands = service.commands.map(c => c.name);
        throw new CommandNotFoundError(parsed.service, parsed.command!, availableCommands);
      }

      let command: Command = baseCommand;
      let commandArgs = parsed.args;

      // Check if there's a subcommand
      if (parsed.subcommand) {
        if (baseCommand.subcommands) {
          // Command has subcommands - try to find matching one
          const subcommand = baseCommand.subcommands.find(
            c => c.name === parsed.subcommand || c.aliases?.includes(parsed.subcommand!)
          );
          if (subcommand) {
            command = subcommand;
          } else {
            // No matching subcommand - treat as argument
            commandArgs = [parsed.subcommand, ...parsed.args];
          }
        } else {
          // Command has no subcommands - treat subcommand as first argument
          commandArgs = [parsed.subcommand, ...parsed.args];
        }
      }

      // Parse command-specific args
      const { args, flags } = parseCommandArgs(
        commandArgs,
        parsed.flags,
        command.args,
        command.options
      );

      // Create context
      const ctx: CommandContext = {
        args,
        flags,
        rawArgs: parsed.raw,
        config: config.getService(parsed.service),
        auth: null, // TODO: Load from auth manager
        output,
        prompt: createPromptHelper(),
        globalFlags: parsed.globalFlags,
      };

      // Execute command
      await command.handler(ctx);

    } catch (error) {
      if (error instanceof UniError) {
        output.error(error.message);
        if (error.suggestion) {
          output.info(error.suggestion);
        }
        process.exit(1);
      }

      // Unexpected error
      output.error(error instanceof Error ? error.message : String(error));
      if (parsed.globalFlags.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  }

  /**
   * Find a command in a service
   */
  private findCommand(
    service: UniService,
    commandName: string,
    subcommandName?: string | null
  ): Command | null {
    const command = service.commands.find(
      c => c.name === commandName || c.aliases?.includes(commandName)
    );

    if (!command) return null;

    // Check for subcommand
    if (subcommandName && command.subcommands) {
      const subcommand = command.subcommands.find(
        c => c.name === subcommandName || c.aliases?.includes(subcommandName)
      );
      return subcommand || null;
    }

    return command;
  }

  /**
   * Show global help
   */
  private showGlobalHelp(output: ReturnType<typeof createOutputFormatter>): void {
    console.log(`
${c.bold('uni')} - Universal CLI for everything

${c.bold('USAGE')}
  uni <service> <command> [options] [args]
  uni <command> [options]

${c.bold('GLOBAL OPTIONS')}
  -h, --help      Show help
  -v, --version   Show version
  --json          Output as JSON
  --verbose       Verbose output
  -q, --quiet     Suppress output
  -c, --config    Custom config path

${c.bold('COMMANDS')}
  list            List available services
  auth            Manage authentication
  config          Manage configuration
  completions     Generate shell completions

${c.bold('EXAMPLES')}
  uni exa search "React hooks"
  uni gh pr list
  uni gcal add "Meeting" --time 10am

${c.muted(`Run 'uni <service> --help' for service-specific help`)}
`);
  }

  /**
   * Show version
   */
  private showVersion(
    output: ReturnType<typeof createOutputFormatter>,
    flags: GlobalFlags
  ): void {
    if (flags.json) {
      output.json({ version: VERSION });
    } else {
      console.log(`uni v${VERSION}`);
    }
  }

  /**
   * List available services
   */
  private async listServices(
    output: ReturnType<typeof createOutputFormatter>,
    flags: GlobalFlags
  ): Promise<void> {
    const services = await registry.list();

    if (services.length === 0) {
      if (flags.json) {
        output.json({ services: [] });
      } else {
        output.info('No services installed');
        console.log(`\n${c.muted("Install services with 'uni install <service>'")}`);
      }
      return;
    }

    if (flags.json) {
      output.json({ services });
    } else {
      console.log(`\n${c.bold('Available Services')}\n`);

      for (const service of services) {
        console.log(
          `  ${c.cyan(service.name.padEnd(12))} ${c.muted(service.description)} ${c.dim(`[${service.source}]`)}`
        );
      }

      console.log(`\n${c.muted("Run 'uni <service> --help' for more info")}\n`);
    }
  }

  /**
   * Show service help
   */
  private showServiceHelp(
    service: UniService,
    output: ReturnType<typeof createOutputFormatter>
  ): void {
    console.log(`
${c.bold(`uni ${service.name}`)} - ${service.description}

${c.bold('COMMANDS')}`);

    for (const cmd of service.commands) {
      const aliases = cmd.aliases ? ` ${c.dim(`(${cmd.aliases.join(', ')})`)}` : '';
      console.log(`  ${c.cyan(cmd.name.padEnd(16))}${aliases} ${cmd.description}`);

      // Show subcommands
      if (cmd.subcommands) {
        for (const sub of cmd.subcommands) {
          console.log(`    ${c.cyan(sub.name.padEnd(14))} ${sub.description}`);
        }
      }
    }

    // Show examples
    const commandsWithExamples = service.commands.filter(c => c.examples?.length);
    if (commandsWithExamples.length > 0) {
      console.log(`\n${c.bold('EXAMPLES')}`);
      for (const cmd of commandsWithExamples) {
        for (const example of cmd.examples || []) {
          console.log(`  ${c.dim('$')} ${example}`);
        }
      }
    }

    console.log('');
  }

  /**
   * Handle auth commands
   */
  private async handleAuth(
    parsed: ReturnType<typeof parseArgs>,
    output: ReturnType<typeof createOutputFormatter>
  ): Promise<void> {
    // TODO: Implement auth commands
    output.info('Auth commands coming soon');
    console.log(`
  uni auth login <service>   Login to a service
  uni auth logout <service>  Logout from a service
  uni auth status            Show auth status
`);
  }

  /**
   * Handle config commands
   */
  private async handleConfig(
    parsed: ReturnType<typeof parseArgs>,
    output: ReturnType<typeof createOutputFormatter>
  ): Promise<void> {
    const configPath = config.getPath();

    if (parsed.globalFlags.json) {
      output.json({
        path: configPath,
        global: config.getGlobal(),
      });
    } else {
      console.log(`\n${c.bold('Configuration')}\n`);
      console.log(`  ${c.cyan('Path:')} ${configPath || c.muted('(none)')}`);
      console.log(`  ${c.cyan('Global:')}`);
      console.log(`    ${JSON.stringify(config.getGlobal(), null, 2).replace(/\n/g, '\n    ')}`);
      console.log('');
    }
  }

  /**
   * Handle completions command
   */
  private async handleCompletions(
    parsed: ReturnType<typeof parseArgs>,
    output: ReturnType<typeof createOutputFormatter>
  ): Promise<void> {
    const shell = parsed.command || 'zsh';

    switch (shell) {
      case 'zsh':
        console.log(await generateZshCompletions());
        break;
      case 'bash':
        console.log(await generateBashCompletions());
        break;
      case 'fish':
        console.log(await generateFishCompletions());
        break;
      default:
        output.error(`Unknown shell: ${shell}`);
        console.log(`\n${c.bold('Usage:')}`);
        console.log(`  uni completions zsh   # For Zsh`);
        console.log(`  uni completions bash  # For Bash`);
        console.log(`  uni completions fish  # For Fish`);
        console.log(`\n${c.bold('Setup:')}`);
        console.log(`  ${c.cyan('Zsh:')}  eval "$(uni completions zsh)"`);
        console.log(`  ${c.cyan('Bash:')} eval "$(uni completions bash)"`);
        console.log(`  ${c.cyan('Fish:')} uni completions fish > ~/.config/fish/completions/uni.fish`);
        console.log('');
    }
  }
}

// Export singleton
export const cli = new UniCLI();
