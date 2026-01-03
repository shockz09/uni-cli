/**
 * uni gh pr - Pull request commands
 */

import type { Command, CommandContext } from '@uni/shared';
import { gh } from '../gh-wrapper';

interface PullRequest {
  number: number;
  title: string;
  state: string;
  author: { login: string };
  headRefName: string;
  baseRefName: string;
  url: string;
  createdAt: string;
  isDraft: boolean;
  mergeable?: string;
  additions?: number;
  deletions?: number;
  body?: string;
}

const listCommand: Command = {
  name: 'list',
  description: 'List pull requests',
  aliases: ['ls'],
  options: [
    {
      name: 'state',
      short: 's',
      type: 'string',
      description: 'Filter by state: open, closed, merged, all',
      default: 'open',
    },
    {
      name: 'limit',
      short: 'l',
      type: 'number',
      description: 'Maximum number of PRs to list',
      default: 10,
    },
    {
      name: 'author',
      short: 'a',
      type: 'string',
      description: 'Filter by author',
    },
  ],
  examples: [
    'uni gh pr list',
    'uni gh pr list --state all --limit 20',
    'uni gh pr list --author @me',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    const spinner = output.spinner('Fetching pull requests...');

    const args = [
      'pr', 'list',
      '--state', flags.state as string,
      '--limit', String(flags.limit),
      '--json', 'number,title,state,author,headRefName,baseRefName,url,createdAt,isDraft',
    ];

    if (flags.author) {
      args.push('--author', flags.author as string);
    }

    const result = await gh.run<PullRequest[]>(args);

    if (!result.success) {
      spinner.fail('Failed to fetch PRs');
      output.error(result.error || 'Unknown error');
      return;
    }

    const prs = result.data || [];
    spinner.success(`Found ${prs.length} pull request${prs.length === 1 ? '' : 's'}`);

    if (globalFlags.json) {
      output.json(prs);
      return;
    }

    if (prs.length === 0) {
      output.info('No pull requests found');
      return;
    }

    console.log('');
    for (const pr of prs) {
      const draft = pr.isDraft ? ' \x1b[33m[draft]\x1b[0m' : '';
      const state = pr.state === 'OPEN'
        ? '\x1b[32mOPEN\x1b[0m'
        : pr.state === 'MERGED'
          ? '\x1b[35mMERGED\x1b[0m'
          : '\x1b[31mCLOSED\x1b[0m';

      console.log(`\x1b[1m#${pr.number}\x1b[0m ${pr.title}${draft}`);
      console.log(`  ${state} • ${pr.headRefName} → ${pr.baseRefName} • by ${pr.author.login}`);
      console.log(`  \x1b[36m${pr.url}\x1b[0m`);
      console.log('');
    }
  },
};

const viewCommand: Command = {
  name: 'view',
  description: 'View a pull request',
  aliases: ['show'],
  args: [
    {
      name: 'number',
      description: 'PR number',
      required: true,
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
    'uni gh pr view 123',
    'uni gh pr view 123 --web',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    const prNumber = args.number;
    if (!prNumber) {
      output.error('Please provide a PR number');
      return;
    }

    if (flags.web) {
      const result = await gh.runText(['pr', 'view', prNumber, '--web']);
      if (!result.success) {
        output.error(result.error || 'Failed to open PR');
      }
      return;
    }

    const spinner = output.spinner(`Fetching PR #${prNumber}...`);

    const result = await gh.run<PullRequest>([
      'pr', 'view', prNumber,
      '--json', 'number,title,state,author,headRefName,baseRefName,url,createdAt,isDraft,mergeable,additions,deletions,body',
    ]);

    if (!result.success) {
      spinner.fail('Failed to fetch PR');
      output.error(result.error || 'Unknown error');
      return;
    }

    const pr = result.data!;
    spinner.success(`PR #${pr.number}`);

    if (globalFlags.json) {
      output.json(pr);
      return;
    }

    const draft = pr.isDraft ? ' \x1b[33m[draft]\x1b[0m' : '';
    const state = pr.state === 'OPEN'
      ? '\x1b[32mOPEN\x1b[0m'
      : pr.state === 'MERGED'
        ? '\x1b[35mMERGED\x1b[0m'
        : '\x1b[31mCLOSED\x1b[0m';

    console.log('');
    console.log(`\x1b[1m#${pr.number} ${pr.title}\x1b[0m${draft}`);
    console.log(`${state} • ${pr.headRefName} → ${pr.baseRefName}`);
    console.log(`Author: ${pr.author.login}`);

    if (pr.additions !== undefined && pr.deletions !== undefined) {
      console.log(`Changes: \x1b[32m+${pr.additions}\x1b[0m / \x1b[31m-${pr.deletions}\x1b[0m`);
    }

    if (pr.mergeable) {
      const mergeColor = pr.mergeable === 'MERGEABLE' ? '32' : '31';
      console.log(`Mergeable: \x1b[${mergeColor}m${pr.mergeable}\x1b[0m`);
    }

    console.log(`\x1b[36m${pr.url}\x1b[0m`);

    if (pr.body) {
      console.log('\n\x1b[90m─── Description ───\x1b[0m\n');
      console.log(pr.body);
    }
    console.log('');
  },
};

const createCommand: Command = {
  name: 'create',
  description: 'Create a pull request',
  aliases: ['new'],
  options: [
    {
      name: 'title',
      short: 't',
      type: 'string',
      description: 'PR title',
    },
    {
      name: 'body',
      short: 'b',
      type: 'string',
      description: 'PR description',
    },
    {
      name: 'base',
      type: 'string',
      description: 'Base branch',
    },
    {
      name: 'draft',
      short: 'd',
      type: 'boolean',
      description: 'Create as draft',
      default: false,
    },
    {
      name: 'web',
      short: 'w',
      type: 'boolean',
      description: 'Open in browser to create',
      default: false,
    },
  ],
  examples: [
    'uni gh pr create --title "Add feature" --body "Description"',
    'uni gh pr create --draft',
    'uni gh pr create --web',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (flags.web) {
      const result = await gh.runText(['pr', 'create', '--web']);
      if (!result.success) {
        output.error(result.error || 'Failed to open browser');
      }
      return;
    }

    const args = ['pr', 'create'];

    if (flags.title) {
      args.push('--title', flags.title as string);
    }
    if (flags.body) {
      args.push('--body', flags.body as string);
    }
    if (flags.base) {
      args.push('--base', flags.base as string);
    }
    if (flags.draft) {
      args.push('--draft');
    }

    // If no title provided, gh will prompt interactively
    const spinner = flags.title ? output.spinner('Creating pull request...') : null;

    const result = await gh.runText(args);

    if (!result.success) {
      spinner?.fail('Failed to create PR');
      output.error(result.error || 'Unknown error');
      return;
    }

    spinner?.success('Pull request created');

    if (globalFlags.json) {
      // Try to extract PR URL and convert to JSON
      const url = result.data?.trim();
      output.json({ url });
    } else {
      console.log(result.data);
    }
  },
};

const mergeCommand: Command = {
  name: 'merge',
  description: 'Merge a pull request',
  args: [
    {
      name: 'number',
      description: 'PR number (defaults to current branch PR)',
    },
  ],
  options: [
    {
      name: 'method',
      short: 'm',
      type: 'string',
      description: 'Merge method: merge, squash, rebase',
      default: 'merge',
      choices: ['merge', 'squash', 'rebase'],
    },
    {
      name: 'delete-branch',
      short: 'd',
      type: 'boolean',
      description: 'Delete branch after merge',
      default: false,
    },
  ],
  examples: [
    'uni gh pr merge 123',
    'uni gh pr merge --method squash',
    'uni gh pr merge 123 --delete-branch',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags } = ctx;

    const prArgs = ['pr', 'merge'];

    if (args.number) {
      prArgs.push(args.number);
    }

    const method = flags.method as string;
    if (method === 'squash') {
      prArgs.push('--squash');
    } else if (method === 'rebase') {
      prArgs.push('--rebase');
    } else {
      prArgs.push('--merge');
    }

    if (flags['delete-branch']) {
      prArgs.push('--delete-branch');
    }

    const spinner = output.spinner('Merging pull request...');

    const result = await gh.runText(prArgs);

    if (!result.success) {
      spinner.fail('Failed to merge PR');
      output.error(result.error || 'Unknown error');
      return;
    }

    spinner.success('Pull request merged');
    if (result.data?.trim()) {
      console.log(result.data);
    }
  },
};

export const prCommand: Command = {
  name: 'pr',
  description: 'Manage pull requests',
  aliases: ['pull-request'],
  subcommands: [listCommand, viewCommand, createCommand, mergeCommand],
  examples: [
    'uni gh pr list',
    'uni gh pr view 123',
    'uni gh pr create --title "Feature"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    // Default to list if no subcommand
    await listCommand.handler(ctx);
  },
};
