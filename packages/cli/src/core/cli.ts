/**
 * Main CLI orchestrator
 */

import type { UniService, Command, CommandContext, GlobalFlags } from '@uni/shared';
import { CommandNotFoundError, UniError } from '@uni/shared';
import { parseArgs, parseCommandArgs } from './parser';
import { registry } from './registry';
import { config } from './config';
import { history } from './history';
import { flow, runCommands, substituteArgs } from './flow';
import { createLLMClient, type LLMProvider, detectProvider, getSupportedProviders, getProviderName, isConfigured, getModelForProvider, testProvider } from './llm';
import { getModels, getProvider, listProviders, type ProviderInfo } from './llm-providers';
import { createOutputFormatter } from './output';
import { createPromptHelper } from '../utils/prompt';
import { generateZshCompletions, generateBashCompletions, generateFishCompletions } from './completions';
import { runDoctor, printDoctorReport } from './doctor';
import { runSetupWizard, setupService, type ServiceType } from './setup';
import * as c from '../utils/colors';
import * as readline from 'node:readline';

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

      if (parsed.service === 'alias') {
        await this.handleAlias(parsed, output);
        return;
      }

      if (parsed.service === 'history') {
        await this.handleHistory(parsed, output);
        return;
      }

      if (parsed.service === 'ask') {
        await this.handleAsk(parsed, output);
        return;
      }

      if (parsed.service === 'run') {
        await this.handleRun(parsed, output);
        return;
      }

      if (parsed.service === 'flow') {
        await this.handleFlow(parsed, output);
        return;
      }

      if (parsed.service === 'install') {
        await this.handleInstall(parsed, output);
        return;
      }

      if (parsed.service === 'uninstall') {
        await this.handleUninstall(parsed, output);
        return;
      }

      if (parsed.service === 'doctor') {
        await this.handleDoctor(parsed, output);
        return;
      }

      if (parsed.service === 'setup') {
        await this.handleSetup(parsed, output);
        return;
      }

      // Check if it's an alias
      const aliasCommand = config.getAlias(parsed.service);
      if (aliasCommand) {
        // Expand alias and re-parse
        const expandedArgs = aliasCommand.split(/\s+/).concat(
          parsed.command ? [parsed.command] : [],
          parsed.subcommand ? [parsed.subcommand] : [],
          parsed.args
        );
        const expandedParsed = parseArgs(expandedArgs);
        // Merge global flags from original
        expandedParsed.globalFlags = { ...expandedParsed.globalFlags, ...parsed.globalFlags };
        // Recurse with expanded command (skip the alias check by using a flag)
        return this.runExpanded(expandedParsed, output);
      }

      // Check if it's a flow (shorthand: uni <flowname> [args])
      const flowCommands = flow.getFlow(parsed.service);
      if (flowCommands) {
        // Collect all args for the flow
        const flowArgs = [
          parsed.command,
          parsed.subcommand,
          ...parsed.args
        ].filter(Boolean) as string[];

        const substituted = substituteArgs(flowCommands, flowArgs);
        const isDryRun = parsed.flags['dry-run'] || parsed.flags.n;
        const isParallel = parsed.flags.parallel || parsed.flags.p;

        await runCommands(substituted, {
          dryRun: !!isDryRun,
          parallel: !!isParallel,
          json: parsed.globalFlags.json,
        });
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

      // Check for default command (empty name) - for single-command services like weather, currency
      const defaultCommand = service.commands.find(c => c.name === '');

      // Show service help only if no command given AND no default command exists
      if (parsed.globalFlags.help || (!parsed.command && !defaultCommand)) {
        this.showServiceHelp(service, output);
        return;
      }

      // Find the base command first
      // If no command given but default exists, use the default command
      // and treat what would have been the command as the first arg
      let baseCommand = defaultCommand && !parsed.command
        ? defaultCommand
        : service.commands.find(
            c => c.name === parsed.command || c.aliases?.includes(parsed.command!)
          );

      // If still no match and default exists, use default and prepend command as arg
      if (!baseCommand && defaultCommand) {
        baseCommand = defaultCommand;
        if (parsed.command) {
          parsed.args = [parsed.command, ...(parsed.subcommand ? [parsed.subcommand] : []), ...parsed.args];
          parsed.subcommand = undefined;
        }
      }

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

      // Log to history (only for service commands)
      const cmdString = this.buildCommandString(parsed);
      await history.addCommand(cmdString, 0);

    } catch (error) {
      // Log failed command to history
      const cmdString = this.buildCommandString(parsed);
      await history.addCommand(cmdString, 1);

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
   * Build a command string for history
   */
  private buildCommandString(parsed: ReturnType<typeof parseArgs>): string {
    const parts = [parsed.service];
    if (parsed.command) parts.push(parsed.command);
    if (parsed.subcommand) parts.push(parsed.subcommand);
    parts.push(...parsed.args);

    // Add flags
    for (const [key, value] of Object.entries(parsed.flags)) {
      if (typeof value === 'boolean' && value) {
        parts.push(`--${key}`);
      } else if (typeof value !== 'boolean') {
        parts.push(`--${key}`, String(value));
      }
    }

    return parts.filter(Boolean).join(' ');
  }

  /**
   * Run an already-expanded command (after alias expansion)
   */
  private async runExpanded(
    parsed: ReturnType<typeof parseArgs>,
    output: ReturnType<typeof createOutputFormatter>
  ): Promise<void> {
    // Check if service exists
    const exists = await registry.has(parsed.service!);
    if (!exists) {
      throw new UniError(
        `Unknown service: '${parsed.service}'`,
        'UNKNOWN_SERVICE',
        `Run 'uni list' to see available services`
      );
    }

    // Load service
    const service = await registry.load(parsed.service!);

    // Show service help
    if (parsed.globalFlags.help || !parsed.command) {
      this.showServiceHelp(service, output);
      return;
    }

    // Find the base command
    const baseCommand = service.commands.find(
      c => c.name === parsed.command || c.aliases?.includes(parsed.command!)
    );

    if (!baseCommand) {
      const availableCommands = service.commands.map(c => c.name);
      throw new CommandNotFoundError(parsed.service!, parsed.command!, availableCommands);
    }

    let command: Command = baseCommand;
    let commandArgs = parsed.args;

    // Check for subcommand
    if (parsed.subcommand) {
      if (baseCommand.subcommands) {
        const subcommand = baseCommand.subcommands.find(
          c => c.name === parsed.subcommand || c.aliases?.includes(parsed.subcommand!)
        );
        if (subcommand) {
          command = subcommand;
        } else {
          commandArgs = [parsed.subcommand, ...parsed.args];
        }
      } else {
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
      config: config.getService(parsed.service!),
      auth: null,
      output,
      prompt: createPromptHelper(),
      globalFlags: parsed.globalFlags,
    };

    // Execute command and log to history
    try {
      await command.handler(ctx);
      const cmdString = this.buildCommandString(parsed);
      await history.addCommand(cmdString, 0);
    } catch (error) {
      const cmdString = this.buildCommandString(parsed);
      await history.addCommand(cmdString, 1);
      throw error; // Re-throw for caller to handle
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
  doctor          Check service health & configuration
  setup           Interactive setup wizard
  ask             Natural language commands
  run             Run multiple commands at once
  flow            Manage saved command macros
  install         Install a service package
  uninstall       Uninstall a service package
  auth            Manage authentication
  config          Manage configuration
  alias           Manage command aliases
  history         View command history
  completions     Generate shell completions

${c.bold('EXAMPLES')}
  uni exa search "React hooks"
  uni gh pr list
  uni gcal add "Meeting" --time 10am
  uni run "gh pr list" "gcal list"
  uni flow add standup "gcal list" "gh pr list"

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
    const subcommand = parsed.command || 'show';
    const args = parsed.subcommand ? [parsed.subcommand, ...parsed.args] : parsed.args;

    switch (subcommand) {
      case 'show': {
        const fullConfig = config.getFullConfig();
        if (parsed.globalFlags.json) {
          output.json(fullConfig);
        } else {
          console.log(`\n${c.bold('Configuration')}\n`);
          console.log(`  ${c.cyan('Path:')} ${config.getGlobalConfigPath()}`);
          console.log(`\n${c.bold('[global]')}`);
          const global = config.getGlobal();
          for (const [key, value] of Object.entries(global)) {
            console.log(`  ${c.cyan(key)} = ${c.yellow(String(value))}`);
          }

          const services = fullConfig?.services ?? {};
          for (const [name, svc] of Object.entries(services)) {
            if (Object.keys(svc).length > 0) {
              console.log(`\n${c.bold(`[services.${name}]`)}`);
              for (const [key, value] of Object.entries(svc)) {
                console.log(`  ${c.cyan(key)} = ${c.yellow(String(value))}`);
              }
            }
          }

          const aliases = config.getAliases();
          if (Object.keys(aliases).length > 0) {
            console.log(`\n${c.bold('[aliases]')}`);
            for (const [name, cmd] of Object.entries(aliases)) {
              console.log(`  ${c.cyan(name)} = ${c.yellow(`"${cmd}"`)}`);
            }
          }
          console.log('');
        }
        break;
      }

      case 'get': {
        const key = args[0];
        if (!key) {
          output.error('Usage: uni config get <key>');
          console.log(`\n${c.muted('Example: uni config get global.color')}`);
          process.exit(1);
        }
        const value = config.get(key);
        if (parsed.globalFlags.json) {
          output.json({ key, value });
        } else if (value !== undefined) {
          console.log(String(value));
        } else {
          output.error(`Key not found: ${key}`);
          process.exit(1);
        }
        break;
      }

      case 'set': {
        const key = args[0];
        const value = args.slice(1).join(' ');
        if (!key || !value) {
          output.error('Usage: uni config set <key> <value>');
          console.log(`\n${c.muted('Example: uni config set global.color false')}`);
          process.exit(1);
        }
        await config.set(key, this.parseConfigValue(value));
        output.success(`Set ${key} = ${value}`);
        break;
      }

      case 'edit': {
        const editor = config.getGlobal().editor || process.env.EDITOR || 'vim';
        const configPath = config.getGlobalConfigPath();

        // Ensure config file exists
        await config.ensureConfigDir();
        const fs = await import('node:fs');
        if (!fs.existsSync(configPath)) {
          fs.writeFileSync(configPath, '# uni CLI configuration\n\n[global]\ncolor = true\n');
        }

        const { spawn } = await import('node:child_process');
        const child = spawn(editor, [configPath], { stdio: 'inherit' });
        await new Promise<void>((resolve, reject) => {
          child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Editor exited with code ${code}`));
          });
        });
        break;
      }

      case 'path': {
        const configPath = config.getGlobalConfigPath();
        if (parsed.globalFlags.json) {
          output.json({ path: configPath });
        } else {
          console.log(configPath);
        }
        break;
      }

      default: {
        output.error(`Unknown config command: ${subcommand}`);
        console.log(`
${c.bold('Usage:')}
  uni config show             Show all configuration
  uni config get <key>        Get a specific value
  uni config set <key> <val>  Set a value
  uni config edit             Open config in editor
  uni config path             Show config file path
`);
        process.exit(1);
      }
    }
  }

  /**
   * Handle alias commands
   */
  private async handleAlias(
    parsed: ReturnType<typeof parseArgs>,
    output: ReturnType<typeof createOutputFormatter>
  ): Promise<void> {
    const subcommand = parsed.command || 'list';
    const args = parsed.subcommand ? [parsed.subcommand, ...parsed.args] : parsed.args;

    switch (subcommand) {
      case 'list': {
        const aliases = config.getAliases();
        const entries = Object.entries(aliases);

        if (parsed.globalFlags.json) {
          output.json({ aliases });
        } else if (entries.length === 0) {
          console.log(`\n${c.muted('No aliases defined')}`);
          console.log(`${c.muted("Use 'uni alias add <name> <command>' to create one")}\n`);
        } else {
          console.log(`\n${c.bold('Aliases')}\n`);
          for (const [name, cmd] of entries) {
            console.log(`  ${c.cyan(name.padEnd(12))} → ${cmd}`);
          }
          console.log('');
        }
        break;
      }

      case 'add': {
        const name = args[0];
        const command = args.slice(1).join(' ');

        if (!name || !command) {
          output.error('Usage: uni alias add <name> <command>');
          console.log(`\n${c.muted('Example: uni alias add prs "gh pr list --state open"')}`);
          process.exit(1);
        }

        // Check if name conflicts with service or builtin
        const services = await registry.list();
        const builtins = ['list', 'auth', 'config', 'completions', 'alias', 'history'];
        if (services.some(s => s.name === name) || builtins.includes(name)) {
          output.error(`Cannot create alias '${name}': conflicts with service or builtin command`);
          process.exit(1);
        }

        await config.setAlias(name, command);
        output.success(`Created alias: ${name} → ${command}`);
        break;
      }

      case 'remove':
      case 'rm':
      case 'delete': {
        const name = args[0];
        if (!name) {
          output.error('Usage: uni alias remove <name>');
          process.exit(1);
        }

        const removed = await config.removeAlias(name);
        if (removed) {
          output.success(`Removed alias: ${name}`);
        } else {
          output.error(`Alias not found: ${name}`);
          process.exit(1);
        }
        break;
      }

      default: {
        output.error(`Unknown alias command: ${subcommand}`);
        console.log(`
${c.bold('Usage:')}
  uni alias list                 List all aliases
  uni alias add <name> <cmd>     Create an alias
  uni alias remove <name>        Remove an alias
`);
        process.exit(1);
      }
    }
  }

  /**
   * Handle history commands
   */
  private async handleHistory(
    parsed: ReturnType<typeof parseArgs>,
    output: ReturnType<typeof createOutputFormatter>
  ): Promise<void> {
    const subcommand = parsed.command || 'list';
    const args = parsed.subcommand ? [parsed.subcommand, ...parsed.args] : parsed.args;

    switch (subcommand) {
      case 'list':
      default: {
        // Check if subcommand is actually 'list' or just args for default list
        const isListCommand = subcommand === 'list';

        const limit = parsed.flags.limit
          ? Number(parsed.flags.limit)
          : (parsed.flags.l ? Number(parsed.flags.l) : 20);
        const search = parsed.flags.search as string | undefined;

        const entries = await history.getHistory({ limit, search });

        if (parsed.globalFlags.json) {
          output.json({ history: entries });
        } else if (entries.length === 0) {
          console.log(`\n${c.muted('No commands in history')}\n`);
        } else {
          console.log(`\n${c.bold('Command History')}\n`);
          for (const entry of entries) {
            const status = entry.exit === 0 ? c.green('✓') : c.red('✗');
            const time = new Date(entry.time).toLocaleString();
            console.log(`  ${c.dim(String(entry.id).padStart(4))}  ${status}  ${entry.cmd}  ${c.dim(time)}`);
          }
          console.log(`\n${c.muted("Run 'uni history run <id>' to re-execute a command")}\n`);
        }
        break;
      }

      case 'run': {
        const idArg = args[0];
        if (!idArg) {
          output.error('Usage: uni history run <id>');
          process.exit(1);
        }

        const id = Number(idArg);
        if (isNaN(id)) {
          output.error('Invalid history ID');
          process.exit(1);
        }

        const entry = await history.getCommand(id);
        if (!entry) {
          output.error(`History entry not found: ${id}`);
          process.exit(1);
        }

        console.log(`${c.dim('→')} ${entry.cmd}\n`);

        // Re-parse and execute
        const expandedParsed = parseArgs(entry.cmd.split(/\s+/));
        expandedParsed.globalFlags = { ...expandedParsed.globalFlags, ...parsed.globalFlags };

        // Run the command
        await this.runFromHistory(expandedParsed, output);
        break;
      }

      case 'clear': {
        await history.clearHistory();
        output.success('History cleared');
        break;
      }

      case 'path': {
        console.log(history.getPath());
        break;
      }
    }
  }

  /**
   * Run a command from history (handles both aliases and services)
   */
  private async runFromHistory(
    parsed: ReturnType<typeof parseArgs>,
    output: ReturnType<typeof createOutputFormatter>
  ): Promise<void> {
    if (!parsed.service) {
      output.error('Invalid command');
      return;
    }

    // Check if it's an alias
    const aliasCommand = config.getAlias(parsed.service);
    if (aliasCommand) {
      const expandedArgs = aliasCommand.split(/\s+/).concat(
        parsed.command ? [parsed.command] : [],
        parsed.subcommand ? [parsed.subcommand] : [],
        parsed.args
      );
      const expandedParsed = parseArgs(expandedArgs);
      expandedParsed.globalFlags = { ...expandedParsed.globalFlags, ...parsed.globalFlags };
      return this.runExpanded(expandedParsed, output);
    }

    // Run as normal service command
    return this.runExpanded(parsed, output);
  }

  /**
   * Parse a config value from string
   */
  private parseConfigValue(value: string): unknown {
    // Boolean
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Number
    const num = Number(value);
    if (!isNaN(num)) return num;

    // String (remove quotes if present)
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }

    return value;
  }

  /**
   * Handle ask command (natural language interface)
   */
  private async handleAsk(
    parsed: ReturnType<typeof parseArgs>,
    output: ReturnType<typeof createOutputFormatter>
  ): Promise<void> {
    const isInteractive = parsed.flags.interactive || parsed.flags.i;
    const isDryRun = parsed.flags['dry-run'] || parsed.flags.n;
    const noConfirm = parsed.flags['no-confirm'];
    const providerOverride = parsed.flags.provider as LLMProvider | undefined;

    // Check for subcommands
    const subcommand = parsed.command;
    const args = parsed.subcommand ? [parsed.subcommand, ...parsed.args] : parsed.args;

    // Handle subcommands
    if (subcommand === 'providers') {
      await this.handleAskProviders(output);
      return;
    }

    if (subcommand === 'models') {
      await this.handleAskModels(parsed, output);
      return;
    }

    if (subcommand === 'test') {
      await this.handleAskTest(parsed, output);
      return;
    }

    // Get query from args (everything after 'ask')
    const query = subcommand
      ? [subcommand, ...args].filter(Boolean).join(' ')
      : '';

    if (isInteractive) {
      await this.runAskInteractive(output, providerOverride, isDryRun, noConfirm);
      return;
    }

    if (!query) {
      console.log(`
${c.bold('uni ask')} - Natural language commands

${c.bold('Usage:')}
  uni ask "your query here"       # Execute a query
  uni ask -i                      # Interactive mode (REPL)
  uni ask providers               # List all providers
  uni ask models                  # List models for current/default provider
  uni ask models --provider <name>  # List models for a specific provider
  uni ask test                    # Test current/default provider
  uni ask test --provider <name>  # Test a specific provider

${c.bold('Options:')}
  -n, --dry-run      Show command without executing
  --no-confirm       Execute without confirmation
  --provider <name>  Override LLM provider
  -i, --interactive  Start interactive mode

${c.bold('Examples:')}
  uni ask "show my calendar for tomorrow"
  uni ask "search for React tutorials"
  uni ask "list my open pull requests"
  uni ask -i
  uni ask --provider openrouter "help me write a script"

${c.bold('Providers:')}
  Tier 1: anthropic, openai, google, deepseek, xai
  Tier 2: zhipu, moonshot, minimax, qwen, yi
  Tier 3: openrouter, groq, together, cerebras, fireworks
  Tier 4: ollama, lmstudio, vllm, localai

${c.bold('Configuration:')}
  Set provider in ~/.uni/config.toml:

  [ask]
  provider = "anthropic"
  model = "claude-3-5-sonnet-20241022"
  confirm = true
`);
      return;
    }

    await this.processAskQuery(query, output, providerOverride, isDryRun, noConfirm);
  }

  /**
   * Handle 'uni ask providers' subcommand
   */
  private async handleAskProviders(
    output: ReturnType<typeof createOutputFormatter>
  ): Promise<void> {
    const providers = listProviders();
    const currentProvider = detectProvider();

    console.log(`\n${c.bold('LLM Providers')}\n`);

    // Group by tier
    const tiers: Record<number, ProviderInfo[]> = { 1: [], 2: [], 3: [], 4: [] };
    for (const provider of providers) {
      tiers[provider.tier].push(provider);
    }

    for (const tier of [1, 2, 3, 4] as const) {
      const tierProviders = tiers[tier];
      if (tierProviders.length === 0) continue;

      const tierName = tier === 1 ? 'Tier 1: Major Providers' :
        tier === 2 ? 'Tier 2: Chinese Providers' :
        tier === 3 ? 'Tier 3: Aggregators & Inference' :
        'Tier 4: Local & Self-Hosted';

      console.log(`${c.bold(tierName)}\n`);

      for (const provider of tierProviders) {
        const isCurrent = provider.id === currentProvider;
        const hasConfig = provider.requiresApiKey ? isConfigured(provider.id) : true;
        const status = hasConfig ? c.green('●') : c.dim('○');
        const name = isCurrent ? c.cyan(`${provider.name} *`) : provider.name;
        const desc = c.dim(`(${provider.description})`);

        console.log(`  ${status} ${name.padEnd(14)} ${desc}`);

        if (provider.apiKeyEnv) {
          console.log(`      ${c.muted(`Env: ${provider.apiKeyEnv}`)}`);
        }
      }
      console.log('');
    }

    console.log(`${c.muted('* = auto-detected (highest priority available)')}\n`);
  }

  /**
   * Handle 'uni ask models' subcommand
   */
  private async handleAskModels(
    parsed: ReturnType<typeof parseArgs>,
    output: ReturnType<typeof createOutputFormatter>
  ): Promise<void> {
    // Get provider from flags first, then args, then config/detection
    const providerArg = parsed.flags.provider as LLMProvider | undefined;
    const args = parsed.subcommand ? [parsed.subcommand, ...parsed.args] : parsed.args;

    // Determine which provider to show models for
    let providerId = providerArg;
    if (!providerId && args[0] && !args[0].startsWith('-')) {
      providerId = args[0] as LLMProvider;
    }

    if (!providerId) {
      const askConfig = config.getAsk();
      providerId = askConfig.provider || detectProvider();
    }

    if (!providerId) {
      output.error('No provider specified or configured');
      console.log(`\n${c.muted('Use: uni ask models --provider <name>')}`);
      console.log(`${c.muted('Or configure a default provider in ~/.uni/config.toml:')}`);
      console.log(`  [ask]`);
      console.log(`  provider = "anthropic"`);
      return;
    }

    const provider = getProvider(providerId);
    if (!provider) {
      output.error(`Unknown provider: ${providerId}`);
      return;
    }

    const models = getModels(providerId);
    const defaultModel = getModelForProvider(providerId);

    console.log(`\n${c.bold(`${provider.name} Models`)}\n`);
    console.log(`${c.muted(`Provider: ${provider.id}`)}`);
    console.log(`${c.muted(`API: ${provider.openaiCompatible ? 'OpenAI-compatible' : 'Custom'}`)}\n`);

    if (models.length === 0) {
      console.log(`${c.muted('No models listed. This provider may require fetching models from the API.')}`);
      console.log(`${c.muted('Try: uni ask test --provider ${provider.id}')}`);
      return;
    }

    console.log(c.bold('Available Models:\n'));

    for (const model of models) {
      const isDefault = model.id === defaultModel;
      const marker = isDefault ? c.cyan('★') : ' ';
      const name = isDefault ? c.cyan(model.name) : model.name;
      const id = c.dim(`(${model.id})`);
      const context = c.muted(`Ctx: ${(model.contextLength / 1000).toFixed(0)}K`);

      console.log(`  ${marker} ${name.padEnd(24)} ${id}`);
      console.log(`      ${context}`);
    }

    console.log('');
  }

  /**
   * Handle 'uni ask test' subcommand
   */
  private async handleAskTest(
    parsed: ReturnType<typeof parseArgs>,
    output: ReturnType<typeof createOutputFormatter>
  ): Promise<void> {
    // Get provider from flags first, then args, then config/detection
    const providerArg = parsed.flags.provider as LLMProvider | undefined;
    const args = parsed.subcommand ? [parsed.subcommand, ...parsed.args] : parsed.args;

    // Determine which provider to test
    let providerId = providerArg;
    if (!providerId && args[0] && !args[0].startsWith('-')) {
      providerId = args[0] as LLMProvider;
    }

    if (!providerId) {
      const askConfig = config.getAsk();
      providerId = askConfig.provider || detectProvider();
    }

    if (!providerId) {
      output.error('No provider specified or configured');
      console.log(`\n${c.muted('Use: uni ask test --provider <name>')}`);
      console.log(`${c.muted('Or set ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.')}`);
      return;
    }

    const provider = getProvider(providerId);
    if (!provider) {
      output.error(`Unknown provider: ${providerId}`);
      return;
    }

    console.log(`\n${c.dim('Testing:')} ${c.cyan(provider.name)}...\n`);

    const result = await testProvider(providerId);

    if (result.success) {
      output.success('Provider is working!');
    } else {
      output.error(`Provider test failed: ${result.error}`);
    }

    console.log('');
  }

  /**
   * Process a single ask query
   */
  private async processAskQuery(
    query: string,
    output: ReturnType<typeof createOutputFormatter>,
    providerOverride?: LLMProvider,
    isDryRun?: boolean | string | number,
    noConfirm?: boolean | string | number
  ): Promise<void> {
    const askConfig = config.getAsk();
    const shouldConfirm = !noConfirm && askConfig.confirm !== false;

    try {
      // Create LLM client
      const llmConfig = {
        provider: providerOverride || askConfig.provider,
        model: askConfig.model,
        baseUrl: askConfig.ollamaUrl,
      };

      const llm = createLLMClient(llmConfig);

      // Generate system prompt
      const systemPrompt = await this.generateAskSystemPrompt();

      // Show thinking indicator
      process.stdout.write(c.dim('Thinking...'));

      // Call LLM
      const response = await llm.complete(query, systemPrompt);

      // Clear thinking indicator
      process.stdout.write('\r' + ' '.repeat(20) + '\r');

      // Parse response
      const command = this.parseAskResponse(response);

      if (!command) {
        output.error('Could not generate a command for that request');
        if (response) {
          console.log(c.dim(response));
        }
        return;
      }

      // Show the command
      console.log(`${c.dim('→')} ${c.cyan(command)}`);

      // Dry run - just show command
      if (isDryRun) {
        return;
      }

      // Ask for confirmation
      if (shouldConfirm) {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise<string>((resolve) => {
          rl.question(`${c.dim('Run this command?')} ${c.muted('[Y/n]')} `, resolve);
        });
        rl.close();

        if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
          console.log(c.muted('Cancelled'));
          return;
        }
      }

      console.log('');

      // Execute the command
      const cmdParts = this.parseCommandString(command);
      const cmdParsed = parseArgs(cmdParts);
      cmdParsed.globalFlags = { ...cmdParsed.globalFlags, ...parsed.globalFlags };

      // Run through normal flow (handles aliases, services, etc.)
      await this.runFromHistory(cmdParsed, output);

    } catch (error) {
      output.error(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Run ask in interactive mode
   */
  private async runAskInteractive(
    output: ReturnType<typeof createOutputFormatter>,
    providerOverride?: LLMProvider,
    isDryRun?: boolean | string | number,
    noConfirm?: boolean | string | number
  ): Promise<void> {
    console.log(`
${c.bold('uni ask')} - Interactive Mode
${c.dim('Type your requests in natural language. Type "exit" or "quit" to leave.')}
`);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const prompt = () => {
      rl.question(`${c.green('>')} `, async (query) => {
        const trimmed = query.trim();

        if (!trimmed) {
          prompt();
          return;
        }

        if (trimmed === 'exit' || trimmed === 'quit' || trimmed === 'q') {
          rl.close();
          return;
        }

        await this.processAskQuery(trimmed, output, providerOverride, isDryRun, noConfirm);
        console.log('');
        prompt();
      });
    };

    prompt();

    // Keep process alive
    await new Promise<void>((resolve) => {
      rl.on('close', resolve);
    });
  }

  /**
   * Generate system prompt with available commands
   */
  private async generateAskSystemPrompt(): Promise<string> {
    const services = await registry.list();
    const aliases = config.getAliases();

    let commandList = '';

    // Add services and their commands
    for (const svc of services) {
      try {
        const service = await registry.load(svc.name);
        commandList += `\n## ${svc.name} - ${svc.description}\n`;

        for (const cmd of service.commands) {
          commandList += `  uni ${svc.name} ${cmd.name}`;

          // Add args
          if (cmd.args) {
            for (const arg of cmd.args) {
              commandList += arg.required ? ` <${arg.name}>` : ` [${arg.name}]`;
            }
          }

          // Add key options
          if (cmd.options) {
            for (const opt of cmd.options.slice(0, 3)) {
              commandList += ` --${opt.name}`;
            }
          }

          commandList += `\n    ${cmd.description}\n`;

          // Add subcommands
          if (cmd.subcommands) {
            for (const sub of cmd.subcommands) {
              commandList += `  uni ${svc.name} ${cmd.name} ${sub.name} - ${sub.description}\n`;
            }
          }
        }
      } catch {
        // Skip services that fail to load
      }
    }

    // Add aliases
    if (Object.keys(aliases).length > 0) {
      commandList += '\n## Aliases\n';
      for (const [name, cmd] of Object.entries(aliases)) {
        commandList += `  uni ${name} → ${cmd}\n`;
      }
    }

    return `You are a CLI command translator for the uni CLI tool. Given a natural language request, return the appropriate uni CLI command.

Available commands:
${commandList}

Rules:
1. Return ONLY the command, nothing else. No explanations, no markdown, no quotes.
2. Use exact command and flag names from the list above.
3. If the request is ambiguous, make a reasonable assumption.
4. If the request cannot be fulfilled with available commands, respond with: CANNOT: <brief reason>
5. Always start commands with "uni" (not the service name directly).

Examples:
User: show my calendar
Command: uni gcal list

User: search for react tutorials
Command: uni exa search "react tutorials"

User: show open pull requests
Command: uni gh pr list --state open

User: send hello to general channel on slack
Command: uni slack send general "hello"`;
  }

  /**
   * Parse the LLM response to extract the command
   */
  private parseAskResponse(response: string): string | null {
    const trimmed = response.trim();

    // Check for CANNOT response
    if (trimmed.startsWith('CANNOT:')) {
      return null;
    }

    // Extract command (may have "Command:" prefix or be plain)
    let command = trimmed;

    // Remove common prefixes
    if (command.toLowerCase().startsWith('command:')) {
      command = command.slice(8).trim();
    }

    // Remove markdown code blocks
    if (command.startsWith('```')) {
      command = command.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();
    }

    // Remove quotes
    if ((command.startsWith('"') && command.endsWith('"')) ||
        (command.startsWith("'") && command.endsWith("'"))) {
      command = command.slice(1, -1);
    }

    // Ensure it starts with "uni"
    if (!command.startsWith('uni ')) {
      // Maybe they returned just the service command
      if (command.match(/^[a-z]+ [a-z]/)) {
        command = 'uni ' + command;
      } else {
        return null;
      }
    }

    // Remove "uni " prefix for internal use
    return command.startsWith('uni ') ? command.slice(4) : command;
  }

  /**
   * Parse a command string into parts (handling quotes)
   */
  private parseCommandString(command: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (const char of command) {
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = '';
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      parts.push(current);
    }

    return parts;
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

  /**
   * Handle run command (quick multi-command execution)
   */
  private async handleRun(
    parsed: ReturnType<typeof parseArgs>,
    output: ReturnType<typeof createOutputFormatter>
  ): Promise<void> {
    // Collect all commands from args
    const commands = [
      parsed.command,
      parsed.subcommand,
      ...parsed.args
    ].filter(Boolean) as string[];

    if (commands.length === 0) {
      console.log(`
${c.bold('uni run')} - Run multiple commands

${c.bold('Usage:')}
  uni run "cmd1" "cmd2" "cmd3"

${c.bold('Options:')}
  -p, --parallel   Run commands in parallel
  -n, --dry-run    Show commands without executing
  --json           Output results as JSON

${c.bold('Examples:')}
  uni run "gh pr list" "gcal list"
  uni run -p "gh pr list" "gcal list" "exa search 'news'"
  uni run --dry-run "gh pr create" "slack send general 'PR ready'"
`);
      return;
    }

    const isDryRun = parsed.flags['dry-run'] || parsed.flags.n;
    const isParallel = parsed.flags.parallel || parsed.flags.p;

    const results = await runCommands(commands, {
      dryRun: !!isDryRun,
      parallel: !!isParallel,
      json: parsed.globalFlags.json,
    });

    if (parsed.globalFlags.json) {
      output.json({ results });
    }
  }

  /**
   * Handle flow command (saved macros)
   */
  private async handleFlow(
    parsed: ReturnType<typeof parseArgs>,
    output: ReturnType<typeof createOutputFormatter>
  ): Promise<void> {
    const subcommand = parsed.command || 'list';
    const args = parsed.subcommand ? [parsed.subcommand, ...parsed.args] : parsed.args;

    switch (subcommand) {
      case 'list': {
        const flows = flow.getFlows();
        const entries = Object.entries(flows);

        if (parsed.globalFlags.json) {
          output.json({ flows });
        } else if (entries.length === 0) {
          console.log(`\n${c.muted('No flows defined')}`);
          console.log(`${c.muted("Use 'uni flow add <name> <commands...>' to create one")}\n`);
        } else {
          console.log(`\n${c.bold('Flows')}\n`);
          for (const [name, commands] of entries) {
            const preview = commands.join(` ${c.dim('→')} `);
            console.log(`  ${c.cyan(name.padEnd(12))} ${preview}`);
          }
          console.log(`\n${c.muted("Run 'uni <flowname>' or 'uni flow run <name>' to execute")}\n`);
        }
        break;
      }

      case 'add': {
        const name = args[0];
        const commands = args.slice(1);

        if (!name || commands.length === 0) {
          output.error('Usage: uni flow add <name> <commands...>');
          console.log(`\n${c.muted('Example: uni flow add standup "gcal list" "gh pr list --mine"')}`);
          process.exit(1);
        }

        // Check if name conflicts with service or builtin
        const services = await registry.list();
        const builtins = ['list', 'auth', 'config', 'completions', 'alias', 'history', 'ask', 'run', 'flow'];
        if (services.some(s => s.name === name) || builtins.includes(name)) {
          output.error(`Cannot create flow '${name}': conflicts with service or builtin command`);
          process.exit(1);
        }

        // Check if conflicts with alias
        if (config.getAlias(name)) {
          output.error(`Cannot create flow '${name}': conflicts with existing alias`);
          process.exit(1);
        }

        await flow.addFlow(name, commands);
        output.success(`Created flow: ${name}`);
        console.log(`  ${c.dim('Commands:')} ${commands.join(` ${c.dim('→')} `)}`);
        break;
      }

      case 'remove':
      case 'rm':
      case 'delete': {
        const name = args[0];
        if (!name) {
          output.error('Usage: uni flow remove <name>');
          process.exit(1);
        }

        const removed = await flow.removeFlow(name);
        if (removed) {
          output.success(`Removed flow: ${name}`);
        } else {
          output.error(`Flow not found: ${name}`);
          process.exit(1);
        }
        break;
      }

      case 'run': {
        const name = args[0];
        if (!name) {
          output.error('Usage: uni flow run <name> [args...]');
          process.exit(1);
        }

        const flowCommands = flow.getFlow(name);
        if (!flowCommands) {
          output.error(`Flow not found: ${name}`);
          process.exit(1);
        }

        const flowArgs = args.slice(1);
        const isDryRun = parsed.flags['dry-run'] || parsed.flags.n;
        const isParallel = parsed.flags.parallel || parsed.flags.p;

        const substituted = substituteArgs(flowCommands, flowArgs);
        const results = await runCommands(substituted, {
          dryRun: !!isDryRun,
          parallel: !!isParallel,
          json: parsed.globalFlags.json,
        });

        if (parsed.globalFlags.json) {
          output.json({ results });
        }
        break;
      }

      default: {
        output.error(`Unknown flow command: ${subcommand}`);
        console.log(`
${c.bold('Usage:')}
  uni flow list                      List all flows
  uni flow add <name> <commands...>  Create a flow
  uni flow remove <name>             Remove a flow
  uni flow run <name> [args...]      Run a flow

${c.bold('Shorthand:')}
  uni <flowname> [args...]           Run a flow directly
`);
        process.exit(1);
      }
    }
  }

  /**
   * Handle install command
   *
   * uni install <name>
   * - If name starts with @, installs as-is
   * - Otherwise, tries @uni/service-<name> first, then uni-service-<name>
   */
  private async handleInstall(
    parsed: ReturnType<typeof parseArgs>,
    output: ReturnType<typeof createOutputFormatter>
  ): Promise<void> {
    const name = parsed.command;

    if (!name) {
      console.log(`
${c.bold('uni install')} - Install a service package

${c.bold('Usage:')}
  uni install <name>              Install a uni service

${c.bold('Examples:')}
  uni install linear              # → bun add @uni/service-linear
  uni install @other/some-plugin  # → bun add @other/some-plugin
  uni install uni-service-weather # → bun add uni-service-weather

${c.bold('Note:')}
  This is a convenience wrapper around 'bun add'.
  For simple names, it first tries @uni/service-<name>.
`);
      return;
    }

    const { spawn } = await import('node:child_process');

    // Determine package name
    let pkgName: string;
    if (name.startsWith('@') || name.startsWith('uni-service-')) {
      // Use as-is for scoped packages or explicit uni-service-* names
      pkgName = name;
    } else {
      // Try @uni/service-* first (official)
      pkgName = `@uni/service-${name}`;
    }

    console.log(`${c.dim('→')} bun add ${pkgName}`);

    const child = spawn('bun', ['add', pkgName], {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    await new Promise<void>((resolve, reject) => {
      child.on('close', (code) => {
        if (code === 0) {
          registry.invalidate();
          output.success(`Installed ${pkgName}`);
          resolve();
        } else {
          // If @uni/ package failed, try uni-service-* for non-scoped names
          if (!name.startsWith('@') && !name.startsWith('uni-service-')) {
            const fallbackPkg = `uni-service-${name}`;
            console.log(`\n${c.dim('→')} Trying ${fallbackPkg}...`);

            const fallbackChild = spawn('bun', ['add', fallbackPkg], {
              stdio: 'inherit',
              cwd: process.cwd(),
            });

            fallbackChild.on('close', (fallbackCode) => {
              if (fallbackCode === 0) {
                registry.invalidate();
                output.success(`Installed ${fallbackPkg}`);
                resolve();
              } else {
                output.error(`Could not find package: @uni/service-${name} or uni-service-${name}`);
                process.exit(1);
              }
            });
          } else {
            output.error(`Failed to install ${pkgName}`);
            process.exit(1);
          }
        }
      });

      child.on('error', (err) => {
        output.error(`Failed to run bun: ${err.message}`);
        reject(err);
      });
    });
  }

  /**
   * Handle uninstall command
   *
   * uni uninstall <name>
   */
  private async handleUninstall(
    parsed: ReturnType<typeof parseArgs>,
    output: ReturnType<typeof createOutputFormatter>
  ): Promise<void> {
    const name = parsed.command;

    if (!name) {
      console.log(`
${c.bold('uni uninstall')} - Uninstall a service package

${c.bold('Usage:')}
  uni uninstall <name>            Uninstall a uni service

${c.bold('Examples:')}
  uni uninstall linear            # → bun remove @uni/service-linear
  uni uninstall @other/plugin     # → bun remove @other/plugin
`);
      return;
    }

    const { spawn } = await import('node:child_process');

    // Determine package name
    let pkgName: string;
    if (name.startsWith('@') || name.startsWith('uni-service-')) {
      pkgName = name;
    } else {
      // Assume @uni/service-* for simple names
      pkgName = `@uni/service-${name}`;
    }

    console.log(`${c.dim('→')} bun remove ${pkgName}`);

    const child = spawn('bun', ['remove', pkgName], {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    await new Promise<void>((resolve) => {
      child.on('close', (code) => {
        if (code === 0) {
          registry.invalidate();
          output.success(`Uninstalled ${pkgName}`);
        } else {
          output.error(`Failed to uninstall ${pkgName}`);
          process.exit(1);
        }
        resolve();
      });

      child.on('error', (err) => {
        output.error(`Failed to run bun: ${err.message}`);
        process.exit(1);
      });
    });
  }

  /**
   * Handle doctor command
   */
  private async handleDoctor(
    parsed: ReturnType<typeof parseArgs>,
    output: ReturnType<typeof createOutputFormatter>
  ): Promise<void> {
    const report = await runDoctor();

    if (parsed.globalFlags.json) {
      output.json(report);
    } else {
      printDoctorReport(report);
    }
  }

  /**
   * Handle setup command
   *
   * Usage:
   *   uni setup                    # Interactive wizard
   *   uni setup <service>          # Setup specific service (easy mode)
   *   uni setup <service> --self-host  # Self-host wizard
   *   uni setup --from <source>    # Import shared credentials
   */
  private async handleSetup(
    parsed: ReturnType<typeof parseArgs>,
    output: ReturnType<typeof createOutputFormatter>
  ): Promise<void> {
    const service = parsed.command as ServiceType | undefined;
    const fromSource = parsed.flags.from as string | undefined;
    const selfHost = Boolean(parsed.flags['self-host']);

    // Import mode: uni setup --from <source>
    if (fromSource) {
      const { importSharedCredentials, saveSharedCredentials } = await import('./credentials');

      console.log(`\n${c.dim('Fetching credentials...')}`);

      try {
        const creds = await importSharedCredentials(fromSource);

        console.log(`\n${c.bold('Importing credentials')}${creds.name ? ` from: ${creds.name}` : ''}\n`);

        console.log('This will configure:');
        if (creds.google) console.log(`  • Google (gcal, gmail, gdrive)`);
        if (creds.slack) console.log(`  • Slack`);
        if (creds.notion) console.log(`  • Notion`);
        console.log('');

        await saveSharedCredentials(creds);

        output.success('Credentials saved');
        console.log('');
        console.log('Now authenticate each service:');
        if (creds.google) {
          console.log(`  ${c.cyan('uni gcal auth')}`);
          console.log(`  ${c.cyan('uni gmail auth')}`);
          console.log(`  ${c.cyan('uni gdrive auth')}`);
        }
        if (creds.slack) console.log(`  ${c.cyan('uni slack auth')}`);
        if (creds.notion) console.log(`  ${c.cyan('uni notion auth')}`);
        console.log('');
      } catch (error) {
        output.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
      return;
    }

    // Service-specific setup
    if (service) {
      await setupService(service, { selfHost });
      return;
    }

    // Interactive wizard
    await runSetupWizard();
  }
}

// Export singleton
export const cli = new UniCLI();
