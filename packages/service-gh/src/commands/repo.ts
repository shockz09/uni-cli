/**
 * uni gh repo - Repository commands
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gh } from '../gh-wrapper';

interface Repository {
  name: string;
  nameWithOwner: string;
  description: string;
  url: string;
  isPrivate: boolean;
  isFork: boolean;
  stargazerCount: number;
  forkCount: number;
  primaryLanguage?: { name: string };
  defaultBranchRef?: { name: string };
  pushedAt: string;
}

const viewCommand: Command = {
  name: 'view',
  description: 'View repository details',
  aliases: ['show'],
  args: [
    {
      name: 'repo',
      description: 'Repository name (owner/repo)',
    },
  ],
  options: [
    {
      name: 'web',
      short: 'w',
      type: 'boolean',
      description: 'Open in browser',
      default: false,
    },
  ],
  examples: [
    'uni gh repo view',
    'uni gh repo view owner/repo',
    'uni gh repo view --web',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (flags.web) {
      const webArgs = ['repo', 'view', '--web'];
      if (args.repo) {
        webArgs.splice(2, 0, args.repo);
      }
      const result = await gh.runText(webArgs);
      if (!result.success) {
        output.error(result.error || 'Failed to open repository');
      }
      return;
    }

    const spinner = output.spinner('Fetching repository...');

    const viewArgs = [
      'repo', 'view',
      '--json', 'name,nameWithOwner,description,url,isPrivate,isFork,stargazerCount,forkCount,primaryLanguage,defaultBranchRef,pushedAt',
    ];

    if (args.repo) {
      viewArgs.splice(2, 0, args.repo);
    }

    const result = await gh.run<Repository>(viewArgs);

    if (!result.success) {
      spinner.fail('Failed to fetch repository');
      output.error(result.error || 'Unknown error');
      return;
    }

    const repo = result.data!;
    spinner.success(repo.nameWithOwner);

    if (globalFlags.json) {
      output.json(repo);
      return;
    }

    const visibility = repo.isPrivate ? c.yellow('Private') : c.green('Public');
    const fork = repo.isFork ? ' (fork)' : '';
    const lang = repo.primaryLanguage?.name || 'Unknown';
    const branch = repo.defaultBranchRef?.name || 'main';

    console.log('');
    console.log(`${c.bold(repo.nameWithOwner)}${fork}`);
    console.log(`${visibility} • ${lang} • Branch: ${branch}`);
    if (repo.description) {
      console.log(c.dim(repo.description));
    }
    console.log(`⭐ ${repo.stargazerCount} • 🍴 ${repo.forkCount}`);
    console.log(c.cyan(repo.url));
    console.log('');
  },
};

const cloneCommand: Command = {
  name: 'clone',
  description: 'Clone a repository',
  args: [
    {
      name: 'repo',
      description: 'Repository to clone (owner/repo or URL)',
      required: true,
    },
    {
      name: 'directory',
      description: 'Target directory',
    },
  ],
  options: [
    {
      name: 'depth',
      type: 'number',
      description: 'Shallow clone depth',
    },
  ],
  examples: [
    'uni gh repo clone owner/repo',
    'uni gh repo clone owner/repo ./my-dir',
    'uni gh repo clone owner/repo --depth 1',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags } = ctx;

    const repo = args.repo;
    if (!repo) {
      output.error('Please provide a repository to clone');
      return;
    }

    const cloneArgs = ['repo', 'clone', repo];

    if (args.directory) {
      cloneArgs.push(args.directory);
    }

    if (flags.depth) {
      cloneArgs.push('--', '--depth', String(flags.depth));
    }

    const spinner = output.spinner(`Cloning ${repo}...`);

    const result = await gh.runText(cloneArgs);

    if (!result.success) {
      spinner.fail('Failed to clone repository');
      output.error(result.error || 'Unknown error');
      return;
    }

    spinner.success(`Cloned ${repo}`);
    if (result.data?.trim()) {
      console.log(result.data);
    }
  },
};

const listCommand: Command = {
  name: 'list',
  description: 'List repositories',
  aliases: ['ls'],
  options: [
    {
      name: 'limit',
      short: 'l',
      type: 'number',
      description: 'Maximum number of repos to list',
      default: 10,
    },
    {
      name: 'visibility',
      type: 'string',
      description: 'Filter by visibility: public, private, all',
      default: 'all',
    },
    {
      name: 'source',
      type: 'boolean',
      description: 'Show only non-forks',
      default: false,
    },
  ],
  examples: [
    'uni gh repo list',
    'uni gh repo list --limit 20',
    'uni gh repo list --visibility private',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    const spinner = output.spinner('Fetching repositories...');

    const args = [
      'repo', 'list',
      '--limit', String(flags.limit),
      '--json', 'name,nameWithOwner,description,isPrivate,isFork,stargazerCount,primaryLanguage,pushedAt',
    ];

    if (flags.visibility !== 'all') {
      args.push('--visibility', flags.visibility as string);
    }

    if (flags.source) {
      args.push('--source');
    }

    const result = await gh.run<Repository[]>(args);

    if (!result.success) {
      spinner.fail('Failed to fetch repositories');
      output.error(result.error || 'Unknown error');
      return;
    }

    const repos = result.data || [];
    spinner.success(`Found ${repos.length} repositor${repos.length === 1 ? 'y' : 'ies'}`);

    if (globalFlags.json) {
      output.json(repos);
      return;
    }

    if (repos.length === 0) {
      output.info('No repositories found');
      return;
    }

    console.log('');
    for (const repo of repos) {
      const visibility = repo.isPrivate ? c.yellow('•') : c.green('•');
      const lang = repo.primaryLanguage?.name || '';
      const langStr = lang ? `${c.dim(lang)} ` : '';
      const stars = repo.stargazerCount > 0 ? `⭐${repo.stargazerCount}` : '';

      console.log(`${visibility} ${c.bold(repo.nameWithOwner)} ${langStr}${stars}`);
      if (repo.description) {
        console.log(`  ${c.dim(`${repo.description.slice(0, 80)}${repo.description.length > 80 ? '...' : ''}`)}`);
      }
    }
    console.log('');
  },
};

const createCommand: Command = {
  name: 'create',
  description: 'Create a new repository',
  aliases: ['new'],
  args: [
    {
      name: 'name',
      description: 'Repository name',
    },
  ],
  options: [
    {
      name: 'public',
      type: 'boolean',
      description: 'Make repository public',
      default: false,
    },
    {
      name: 'private',
      type: 'boolean',
      description: 'Make repository private',
      default: true,
    },
    {
      name: 'description',
      short: 'd',
      type: 'string',
      description: 'Repository description',
    },
    {
      name: 'clone',
      short: 'c',
      type: 'boolean',
      description: 'Clone after creating',
      default: false,
    },
  ],
  examples: [
    'uni gh repo create my-project',
    'uni gh repo create my-project --public',
    'uni gh repo create my-project --description "My project" --clone',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags } = ctx;

    const createArgs = ['repo', 'create'];

    if (args.name) {
      createArgs.push(args.name);
    }

    if (flags.public) {
      createArgs.push('--public');
    } else {
      createArgs.push('--private');
    }

    if (flags.description) {
      createArgs.push('--description', flags.description as string);
    }

    if (flags.clone) {
      createArgs.push('--clone');
    }

    const spinner = args.name ? output.spinner(`Creating repository ${args.name}...`) : null;

    const result = await gh.runText(createArgs);

    if (!result.success) {
      spinner?.fail('Failed to create repository');
      output.error(result.error || 'Unknown error');
      return;
    }

    spinner?.success('Repository created');
    if (result.data?.trim()) {
      console.log(result.data);
    }
  },
};

export const repoCommand: Command = {
  name: 'repo',
  description: 'Manage repositories',
  aliases: ['repository', 'r'],
  subcommands: [viewCommand, cloneCommand, listCommand, createCommand],
  examples: [
    'uni gh repo view',
    'uni gh repo clone owner/repo',
    'uni gh repo list',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    // Default to view current repo
    await viewCommand.handler(ctx);
  },
};
