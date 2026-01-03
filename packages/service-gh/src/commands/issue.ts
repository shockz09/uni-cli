/**
 * uni gh issue - Issue commands
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gh } from '../gh-wrapper';

interface Issue {
  number: number;
  title: string;
  state: string;
  author: { login: string };
  url: string;
  createdAt: string;
  labels: Array<{ name: string }>;
  body?: string;
  comments?: number;
}

const listCommand: Command = {
  name: 'list',
  description: 'List issues',
  aliases: ['ls'],
  options: [
    {
      name: 'state',
      short: 's',
      type: 'string',
      description: 'Filter by state: open, closed, all',
      default: 'open',
    },
    {
      name: 'limit',
      short: 'l',
      type: 'number',
      description: 'Maximum number of issues to list',
      default: 10,
    },
    {
      name: 'label',
      type: 'string',
      description: 'Filter by label',
    },
    {
      name: 'assignee',
      short: 'a',
      type: 'string',
      description: 'Filter by assignee',
    },
  ],
  examples: [
    'uni gh issue list',
    'uni gh issue list --state all --limit 20',
    'uni gh issue list --label bug',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    const spinner = output.spinner('Fetching issues...');

    const args = [
      'issue', 'list',
      '--state', flags.state as string,
      '--limit', String(flags.limit),
      '--json', 'number,title,state,author,url,createdAt,labels',
    ];

    if (flags.label) {
      args.push('--label', flags.label as string);
    }
    if (flags.assignee) {
      args.push('--assignee', flags.assignee as string);
    }

    const result = await gh.run<Issue[]>(args);

    if (!result.success) {
      spinner.fail('Failed to fetch issues');
      output.error(result.error || 'Unknown error');
      return;
    }

    const issues = result.data || [];
    spinner.success(`Found ${issues.length} issue${issues.length === 1 ? '' : 's'}`);

    if (globalFlags.json) {
      output.json(issues);
      return;
    }

    if (issues.length === 0) {
      output.info('No issues found');
      return;
    }

    console.log('');
    for (const issue of issues) {
      const state = issue.state === 'OPEN'
        ? c.green('OPEN')
        : c.magenta('CLOSED');

      const labels = issue.labels.length > 0
        ? ' ' + issue.labels.map(l => c.yellow(l.name)).join(' ')
        : '';

      console.log(`${c.bold(`#${issue.number}`)} ${issue.title}${labels}`);
      console.log(`  ${state} • by ${issue.author.login}`);
      console.log(`  ${c.cyan(issue.url)}`);
      console.log('');
    }
  },
};

const viewCommand: Command = {
  name: 'view',
  description: 'View an issue',
  aliases: ['show'],
  args: [
    {
      name: 'number',
      description: 'Issue number',
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
    'uni gh issue view 123',
    'uni gh issue view 123 --web',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    const issueNumber = args.number;
    if (!issueNumber) {
      output.error('Please provide an issue number');
      return;
    }

    if (flags.web) {
      const result = await gh.runText(['issue', 'view', issueNumber, '--web']);
      if (!result.success) {
        output.error(result.error || 'Failed to open issue');
      }
      return;
    }

    const spinner = output.spinner(`Fetching issue #${issueNumber}...`);

    const result = await gh.run<Issue>([
      'issue', 'view', issueNumber,
      '--json', 'number,title,state,author,url,createdAt,labels,body,comments',
    ]);

    if (!result.success) {
      spinner.fail('Failed to fetch issue');
      output.error(result.error || 'Unknown error');
      return;
    }

    const issue = result.data!;
    spinner.success(`Issue #${issue.number}`);

    if (globalFlags.json) {
      output.json(issue);
      return;
    }

    const state = issue.state === 'OPEN'
      ? c.green('OPEN')
      : c.magenta('CLOSED');

    const labels = issue.labels.length > 0
      ? '\nLabels: ' + issue.labels.map(l => c.yellow(l.name)).join(' ')
      : '';

    console.log('');
    console.log(c.bold(`#${issue.number} ${issue.title}`));
    console.log(`${state} • by ${issue.author.login}`);
    if (issue.comments) {
      console.log(`Comments: ${issue.comments}`);
    }
    console.log(labels);
    console.log(c.cyan(issue.url));

    if (issue.body) {
      console.log(`\n${c.dim('─── Description ───')}\n`);
      console.log(issue.body);
    }
    console.log('');
  },
};

const createCommand: Command = {
  name: 'create',
  description: 'Create an issue',
  aliases: ['new'],
  options: [
    {
      name: 'title',
      short: 't',
      type: 'string',
      description: 'Issue title',
    },
    {
      name: 'body',
      short: 'b',
      type: 'string',
      description: 'Issue description',
    },
    {
      name: 'label',
      short: 'l',
      type: 'string',
      description: 'Add labels (comma-separated)',
    },
    {
      name: 'assignee',
      short: 'a',
      type: 'string',
      description: 'Assign to user',
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
    'uni gh issue create --title "Bug report" --body "Description"',
    'uni gh issue create --title "Feature" --label enhancement',
    'uni gh issue create --web',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (flags.web) {
      const result = await gh.runText(['issue', 'create', '--web']);
      if (!result.success) {
        output.error(result.error || 'Failed to open browser');
      }
      return;
    }

    const args = ['issue', 'create'];

    if (flags.title) {
      args.push('--title', flags.title as string);
    }
    if (flags.body) {
      args.push('--body', flags.body as string);
    }
    if (flags.label) {
      args.push('--label', flags.label as string);
    }
    if (flags.assignee) {
      args.push('--assignee', flags.assignee as string);
    }

    const spinner = flags.title ? output.spinner('Creating issue...') : null;

    const result = await gh.runText(args);

    if (!result.success) {
      spinner?.fail('Failed to create issue');
      output.error(result.error || 'Unknown error');
      return;
    }

    spinner?.success('Issue created');

    if (globalFlags.json) {
      const url = result.data?.trim();
      output.json({ url });
    } else {
      console.log(result.data);
    }
  },
};

const closeCommand: Command = {
  name: 'close',
  description: 'Close an issue',
  args: [
    {
      name: 'number',
      description: 'Issue number',
      required: true,
    },
  ],
  options: [
    {
      name: 'reason',
      short: 'r',
      type: 'string',
      description: 'Reason: completed, not_planned',
      default: 'completed',
      choices: ['completed', 'not_planned'],
    },
  ],
  examples: [
    'uni gh issue close 123',
    'uni gh issue close 123 --reason not_planned',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags } = ctx;

    const issueNumber = args.number;
    if (!issueNumber) {
      output.error('Please provide an issue number');
      return;
    }

    const issueArgs = ['issue', 'close', issueNumber];

    if (flags.reason === 'not_planned') {
      issueArgs.push('--reason', 'not_planned');
    }

    const spinner = output.spinner(`Closing issue #${issueNumber}...`);

    const result = await gh.runText(issueArgs);

    if (!result.success) {
      spinner.fail('Failed to close issue');
      output.error(result.error || 'Unknown error');
      return;
    }

    spinner.success(`Issue #${issueNumber} closed`);
  },
};

export const issueCommand: Command = {
  name: 'issue',
  description: 'Manage issues',
  aliases: ['issues', 'i'],
  subcommands: [listCommand, viewCommand, createCommand, closeCommand],
  examples: [
    'uni gh issue list',
    'uni gh issue view 123',
    'uni gh issue create --title "Bug"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    // Default to list if no subcommand
    await listCommand.handler(ctx);
  },
};
