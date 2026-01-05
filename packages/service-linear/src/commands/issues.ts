/**
 * uni linear issues - Manage Linear issues
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { linear, type Issue } from '../api';

const priorityLabels: Record<number, string> = {
  0: 'None',
  1: 'Urgent',
  2: 'High',
  3: 'Medium',
  4: 'Low',
};

function formatIssue(issue: Issue): void {
  const priority = priorityLabels[issue.priority] || 'None';
  const priorityColor = issue.priority === 1 ? c.red : issue.priority === 2 ? c.yellow : c.dim;

  console.log(`${c.cyan(issue.identifier)} ${c.bold(issue.title)}`);
  console.log(c.dim(`  Status: ${issue.state.name} | Priority: ${priorityColor(priority)} | Team: ${issue.team.name}`));
  if (issue.assignee) {
    console.log(c.dim(`  Assignee: ${issue.assignee.name}`));
  }
  if (issue.project) {
    console.log(c.dim(`  Project: ${issue.project.name}`));
  }
  console.log(c.dim(`  ${issue.url}`));
  console.log('');
}

export const issuesCommand: Command = {
  name: 'issues',
  aliases: ['issue', 'i'],
  description: 'Manage Linear issues',
  subcommands: [
    {
      name: 'list',
      aliases: ['ls'],
      description: 'List issues',
      options: [
        { name: 'team', short: 't', type: 'string', description: 'Filter by team key (e.g., ENG)' },
        { name: 'filter', short: 'f', type: 'string', description: 'Filter: open, closed, all (default: open)' },
        { name: 'limit', short: 'n', type: 'number', description: 'Max results (default: 20)', default: 20 },
      ],
      examples: [
        'uni linear issues list',
        'uni linear issues list --team ENG',
        'uni linear issues list --filter closed -n 10',
      ],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, flags, globalFlags } = ctx;
        const teamKey = flags.team as string | undefined;
        const filter = (flags.filter as string) || 'open';
        const limit = (flags.limit as number) || 20;

        if (!linear.hasToken()) {
          output.error('LINEAR_API_KEY not set. Get your key from https://linear.app/settings/api');
          return;
        }

        const spinner = output.spinner('Fetching issues...');

        try {
          let teamId: string | undefined;
          if (teamKey) {
            const teams = await linear.listTeams();
            const team = teams.find(t => t.key.toLowerCase() === teamKey.toLowerCase());
            if (!team) {
              spinner.fail(`Team "${teamKey}" not found`);
              return;
            }
            teamId = team.id;
          }

          const issues = await linear.listIssues({ teamId, limit, filter });
          spinner.success(`${issues.length} issues`);

          if (globalFlags.json) {
            output.json(issues);
            return;
          }

          if (issues.length === 0) {
            console.log(c.dim('\nNo issues found.'));
            return;
          }

          console.log('');
          for (const issue of issues) {
            formatIssue(issue);
          }
        } catch (error) {
          spinner.fail('Failed to fetch issues');
          throw error;
        }
      },
    },
    {
      name: 'get',
      aliases: ['view', 'show'],
      description: 'Get issue details',
      args: [{ name: 'identifier', description: 'Issue identifier (e.g., ENG-123)', required: true }],
      examples: ['uni linear issues get ENG-123'],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, globalFlags } = ctx;
        const identifier = args.identifier as string;

        if (!linear.hasToken()) {
          output.error('LINEAR_API_KEY not set.');
          return;
        }

        const spinner = output.spinner(`Fetching ${identifier}...`);

        try {
          const issue = await linear.getIssue(identifier);
          spinner.success('Found');

          if (globalFlags.json) {
            output.json(issue);
            return;
          }

          console.log('');
          console.log(`${c.cyan(issue.identifier)} ${c.bold(issue.title)}`);
          console.log('');
          if (issue.description) {
            console.log(issue.description);
            console.log('');
          }
          console.log(c.dim('Status:   ') + issue.state.name);
          console.log(c.dim('Priority: ') + (priorityLabels[issue.priority] || 'None'));
          console.log(c.dim('Team:     ') + issue.team.name);
          if (issue.assignee) {
            console.log(c.dim('Assignee: ') + issue.assignee.name);
          }
          if (issue.project) {
            console.log(c.dim('Project:  ') + issue.project.name);
          }
          console.log(c.dim('URL:      ') + issue.url);
          console.log('');
        } catch (error) {
          spinner.fail('Failed to fetch issue');
          throw error;
        }
      },
    },
    {
      name: 'create',
      aliases: ['new', 'add'],
      description: 'Create a new issue',
      args: [{ name: 'title', description: 'Issue title', required: true }],
      options: [
        { name: 'team', short: 't', type: 'string', description: 'Team key (required)', required: true },
        { name: 'description', short: 'd', type: 'string', description: 'Issue description' },
        { name: 'priority', short: 'p', type: 'number', description: 'Priority: 1=Urgent, 2=High, 3=Medium, 4=Low' },
      ],
      examples: [
        'uni linear issues create "Fix login bug" --team ENG',
        'uni linear issues create "Add dark mode" -t ENG -p 2 -d "Users want dark mode"',
      ],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, flags, globalFlags } = ctx;
        const title = args.title as string;
        const teamKey = flags.team as string;
        const description = flags.description as string | undefined;
        const priority = flags.priority as number | undefined;

        if (!linear.hasToken()) {
          output.error('LINEAR_API_KEY not set.');
          return;
        }

        const spinner = output.spinner('Creating issue...');

        try {
          const teams = await linear.listTeams();
          const team = teams.find(t => t.key.toLowerCase() === teamKey.toLowerCase());
          if (!team) {
            spinner.fail(`Team "${teamKey}" not found`);
            return;
          }

          const issue = await linear.createIssue({
            teamId: team.id,
            title,
            description,
            priority,
          });

          spinner.success('Issue created');

          if (globalFlags.json) {
            output.json(issue);
            return;
          }

          console.log('');
          console.log(c.green('✓') + ` Created ${c.cyan(issue.identifier)}: ${issue.title}`);
          console.log(c.dim(`  ${issue.url}`));
          console.log('');
        } catch (error) {
          spinner.fail('Failed to create issue');
          throw error;
        }
      },
    },
    {
      name: 'update',
      aliases: ['edit'],
      description: 'Update an issue',
      args: [{ name: 'identifier', description: 'Issue identifier', required: true }],
      options: [
        { name: 'title', short: 't', type: 'string', description: 'New title' },
        { name: 'description', short: 'd', type: 'string', description: 'New description' },
        { name: 'priority', short: 'p', type: 'number', description: 'New priority' },
        { name: 'status', short: 's', type: 'string', description: 'New status (state name)' },
      ],
      examples: [
        'uni linear issues update ENG-123 --title "Updated title"',
        'uni linear issues update ENG-123 --priority 1',
      ],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, flags, globalFlags } = ctx;
        const identifier = args.identifier as string;

        if (!linear.hasToken()) {
          output.error('LINEAR_API_KEY not set.');
          return;
        }

        const spinner = output.spinner(`Updating ${identifier}...`);

        try {
          // Get issue first to get ID and team
          const existingIssue = await linear.getIssue(identifier);

          const input: Record<string, unknown> = {};
          if (flags.title) input.title = flags.title;
          if (flags.description) input.description = flags.description;
          if (flags.priority) input.priority = flags.priority;

          // Handle status change
          if (flags.status) {
            const states = await linear.getWorkflowStates(existingIssue.team.key);
            const state = states.find(s => s.name.toLowerCase() === (flags.status as string).toLowerCase());
            if (!state) {
              spinner.fail(`Status "${flags.status}" not found. Available: ${states.map(s => s.name).join(', ')}`);
              return;
            }
            input.stateId = state.id;
          }

          if (Object.keys(input).length === 0) {
            spinner.fail('No updates specified');
            return;
          }

          const issue = await linear.updateIssue(existingIssue.id, input);
          spinner.success('Updated');

          if (globalFlags.json) {
            output.json(issue);
            return;
          }

          console.log('');
          console.log(c.green('✓') + ` Updated ${c.cyan(issue.identifier)}: ${issue.title}`);
          console.log(c.dim(`  Status: ${issue.state.name}`));
          console.log('');
        } catch (error) {
          spinner.fail('Failed to update issue');
          throw error;
        }
      },
    },
    {
      name: 'close',
      description: 'Close an issue (mark as Done)',
      args: [{ name: 'identifier', description: 'Issue identifier', required: true }],
      examples: ['uni linear issues close ENG-123'],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, globalFlags } = ctx;
        const identifier = args.identifier as string;

        if (!linear.hasToken()) {
          output.error('LINEAR_API_KEY not set.');
          return;
        }

        const spinner = output.spinner(`Closing ${identifier}...`);

        try {
          const existingIssue = await linear.getIssue(identifier);
          const states = await linear.getWorkflowStates(existingIssue.team.key);
          const doneState = states.find(s => s.type === 'completed');

          if (!doneState) {
            spinner.fail('Could not find completed state');
            return;
          }

          const issue = await linear.updateIssue(existingIssue.id, { stateId: doneState.id });
          spinner.success('Closed');

          if (globalFlags.json) {
            output.json(issue);
            return;
          }

          console.log('');
          console.log(c.green('✓') + ` Closed ${c.cyan(issue.identifier)}: ${issue.title}`);
          console.log('');
        } catch (error) {
          spinner.fail('Failed to close issue');
          throw error;
        }
      },
    },
    {
      name: 'search',
      aliases: ['s', 'find'],
      description: 'Search issues',
      args: [{ name: 'query', description: 'Search query', required: true }],
      options: [
        { name: 'limit', short: 'n', type: 'number', description: 'Max results', default: 20 },
      ],
      examples: ['uni linear issues search "login bug"'],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, flags, globalFlags } = ctx;
        const query = args.query as string;
        const limit = (flags.limit as number) || 20;

        if (!linear.hasToken()) {
          output.error('LINEAR_API_KEY not set.');
          return;
        }

        const spinner = output.spinner(`Searching "${query}"...`);

        try {
          const issues = await linear.searchIssues(query, limit);
          spinner.success(`${issues.length} results`);

          if (globalFlags.json) {
            output.json(issues);
            return;
          }

          if (issues.length === 0) {
            console.log(c.dim('\nNo issues found.'));
            return;
          }

          console.log('');
          for (const issue of issues) {
            formatIssue(issue);
          }
        } catch (error) {
          spinner.fail('Search failed');
          throw error;
        }
      },
    },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    // Default to list
    const listCmd = this.subcommands?.find(s => s.name === 'list');
    if (listCmd) {
      await listCmd.handler(ctx);
    }
  },
};
