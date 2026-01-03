/**
 * Shell completion generation
 */

import { registry } from './registry';
import { config } from './config';

/**
 * Generate Zsh completions
 */
export async function generateZshCompletions(): Promise<string> {
  const services = await registry.list();
  const aliases = config.getAliases();
  const flows = config.getFlows();

  let completions = `#compdef uni

# uni CLI completions for Zsh
# Add to ~/.zshrc: eval "$(uni completions zsh)"

_uni() {
  local curcontext="$curcontext" state line
  typeset -A opt_args

  _arguments -C \\
    '1: :->service' \\
    '2: :->command' \\
    '3: :->subcommand' \\
    '*::arg:->args'

  case $state in
    service)
      local services=(
`;

  // Add services
  for (const svc of services) {
    completions += `        '${svc.name}:${svc.description.replace(/'/g, "\\'")}'\n`;
  }

  // Add aliases
  for (const [name, cmd] of Object.entries(aliases)) {
    completions += `        '${name}:alias → ${cmd.replace(/'/g, "\\'")}'\n`;
  }

  // Add flows
  for (const [name, cmds] of Object.entries(flows)) {
    const preview = cmds.slice(0, 2).join(' → ');
    completions += `        '${name}:flow → ${preview.replace(/'/g, "\\'")}'\n`;
  }

  // Add built-in commands
  completions += `        'list:List available services'
        'doctor:Check service health & configuration'
        'setup:Interactive setup wizard'
        'ask:Natural language commands'
        'run:Run multiple commands'
        'flow:Manage saved command macros'
        'install:Install a service package'
        'uninstall:Uninstall a service package'
        'auth:Manage authentication'
        'config:Manage configuration'
        'alias:Manage command aliases'
        'history:View command history'
        'completions:Generate shell completions'
      )
      _describe 'service' services
      ;;

    command)
      case $line[1] in
`;

  // Add commands for each service
  for (const svc of services) {
    const service = await registry.load(svc.name);
    completions += `        ${svc.name})\n          local commands=(\n`;

    for (const cmd of service.commands) {
      const desc = cmd.description.replace(/'/g, "\\'");
      completions += `            '${cmd.name}:${desc}'\n`;
    }

    completions += `          )\n          _describe 'command' commands\n          ;;\n`;
  }

  completions += `      esac
      ;;

    subcommand)
      case $line[1] in
`;

  // Add subcommands
  for (const svc of services) {
    const service = await registry.load(svc.name);
    for (const cmd of service.commands) {
      if (cmd.subcommands) {
        completions += `        ${svc.name})\n          case $line[2] in\n            ${cmd.name})\n              local subcommands=(\n`;

        for (const sub of cmd.subcommands) {
          const desc = sub.description.replace(/'/g, "\\'");
          completions += `                '${sub.name}:${desc}'\n`;
        }

        completions += `              )\n              _describe 'subcommand' subcommands\n              ;;\n          esac\n          ;;\n`;
      }
    }
  }

  completions += `      esac
      ;;
  esac
}

_uni "$@"
`;

  return completions;
}

/**
 * Generate Bash completions
 */
export async function generateBashCompletions(): Promise<string> {
  const services = await registry.list();
  const aliases = config.getAliases();
  const flows = config.getFlows();
  const aliasNames = Object.keys(aliases).join(' ');
  const flowNames = Object.keys(flows).join(' ');
  const serviceNames = services.map(s => s.name).join(' ');

  let completions = `# uni CLI completions for Bash
# Add to ~/.bashrc: eval "$(uni completions bash)"

_uni_completions() {
  local cur prev services commands
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  services="${serviceNames} ${aliasNames} ${flowNames} list doctor setup ask run flow install uninstall auth config alias history completions"

  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "\${services}" -- "\${cur}") )
    return 0
  fi

  case "\${COMP_WORDS[1]}" in
`;

  // Add commands for each service
  for (const svc of services) {
    const service = await registry.load(svc.name);
    const cmdNames = service.commands.map(c => c.name).join(' ');
    completions += `    ${svc.name})\n      commands="${cmdNames}"\n      ;;\n`;
  }

  completions += `  esac

  if [[ \${COMP_CWORD} -eq 2 ]]; then
    COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
    return 0
  fi
}

complete -F _uni_completions uni
`;

  return completions;
}

/**
 * Generate Fish completions
 */
export async function generateFishCompletions(): Promise<string> {
  const services = await registry.list();
  const aliases = config.getAliases();
  const flows = config.getFlows();

  let completions = `# uni CLI completions for Fish
# Add to ~/.config/fish/completions/uni.fish

# Disable file completion
complete -c uni -f

# Services
`;

  // Add services
  for (const svc of services) {
    completions += `complete -c uni -n "__fish_use_subcommand" -a "${svc.name}" -d "${svc.description}"\n`;
  }

  // Add aliases
  for (const [name, cmd] of Object.entries(aliases)) {
    completions += `complete -c uni -n "__fish_use_subcommand" -a "${name}" -d "alias → ${cmd}"\n`;
  }

  // Add flows
  for (const [name, cmds] of Object.entries(flows)) {
    const preview = cmds.slice(0, 2).join(' → ');
    completions += `complete -c uni -n "__fish_use_subcommand" -a "${name}" -d "flow → ${preview}"\n`;
  }

  // Built-in commands
  completions += `complete -c uni -n "__fish_use_subcommand" -a "list" -d "List available services"
complete -c uni -n "__fish_use_subcommand" -a "doctor" -d "Check service health & configuration"
complete -c uni -n "__fish_use_subcommand" -a "setup" -d "Interactive setup wizard"
complete -c uni -n "__fish_use_subcommand" -a "ask" -d "Natural language commands"
complete -c uni -n "__fish_use_subcommand" -a "run" -d "Run multiple commands"
complete -c uni -n "__fish_use_subcommand" -a "flow" -d "Manage saved command macros"
complete -c uni -n "__fish_use_subcommand" -a "install" -d "Install a service package"
complete -c uni -n "__fish_use_subcommand" -a "uninstall" -d "Uninstall a service package"
complete -c uni -n "__fish_use_subcommand" -a "auth" -d "Manage authentication"
complete -c uni -n "__fish_use_subcommand" -a "config" -d "Manage configuration"
complete -c uni -n "__fish_use_subcommand" -a "alias" -d "Manage command aliases"
complete -c uni -n "__fish_use_subcommand" -a "history" -d "View command history"
complete -c uni -n "__fish_use_subcommand" -a "completions" -d "Generate shell completions"

# Commands per service
`;

  // Add commands for each service
  for (const svc of services) {
    const service = await registry.load(svc.name);

    for (const cmd of service.commands) {
      completions += `complete -c uni -n "__fish_seen_subcommand_from ${svc.name}" -a "${cmd.name}" -d "${cmd.description}"\n`;

      // Add subcommands
      if (cmd.subcommands) {
        for (const sub of cmd.subcommands) {
          completions += `complete -c uni -n "__fish_seen_subcommand_from ${cmd.name}" -a "${sub.name}" -d "${sub.description}"\n`;
        }
      }
    }
  }

  return completions;
}
