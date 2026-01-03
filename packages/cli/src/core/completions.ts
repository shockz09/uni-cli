/**
 * Shell completion generation
 */

import { registry } from './registry';

/**
 * Generate Zsh completions
 */
export async function generateZshCompletions(): Promise<string> {
  const services = await registry.list();

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

  // Add built-in commands
  completions += `        'list:List available services'
        'auth:Manage authentication'
        'config:Manage configuration'
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
  const serviceNames = services.map(s => s.name).join(' ');

  let completions = `# uni CLI completions for Bash
# Add to ~/.bashrc: eval "$(uni completions bash)"

_uni_completions() {
  local cur prev services commands
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  services="${serviceNames} list auth config"

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

  // Built-in commands
  completions += `complete -c uni -n "__fish_use_subcommand" -a "list" -d "List available services"
complete -c uni -n "__fish_use_subcommand" -a "auth" -d "Manage authentication"
complete -c uni -n "__fish_use_subcommand" -a "config" -d "Manage configuration"

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
