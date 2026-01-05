/**
 * uni todoist comments - Manage Todoist comments
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { todoist } from '../api';

export const commentsCommand: Command = {
  name: 'comments',
  aliases: ['comment', 'c'],
  description: 'Manage comments',
  subcommands: [
    {
      name: 'list',
      aliases: ['ls'],
      description: 'List comments on a task',
      args: [{ name: 'task', description: 'Task ID or search text', required: true }],
      examples: ['uni todoist comments list "Buy groceries"'],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, globalFlags } = ctx;
        const query = args.task as string;

        if (!todoist.hasToken()) {
          output.error('TODOIST_TOKEN not set.');
          return;
        }

        const spinner = output.spinner('Fetching comments...');

        try {
          let taskId = query;

          if (!/^\d+$/.test(query)) {
            const tasks = await todoist.listTasks();
            const task = tasks.find(t => t.content.toLowerCase().includes(query.toLowerCase()));
            if (!task) {
              spinner.fail(`Task "${query}" not found`);
              return;
            }
            taskId = task.id;
          }

          const comments = await todoist.listComments({ task_id: taskId });
          spinner.success(`${comments.length} comments`);

          if (globalFlags.json) {
            output.json(comments);
            return;
          }

          if (comments.length === 0) {
            console.log(c.dim('\nNo comments found.'));
            return;
          }

          console.log('');
          for (const comment of comments) {
            const date = new Date(comment.posted_at).toLocaleDateString();
            console.log(c.dim(`(${date})`));
            console.log(`  ${comment.content}`);
            console.log('');
          }
        } catch (error) {
          spinner.fail('Failed to fetch comments');
          throw error;
        }
      },
    },
    {
      name: 'add',
      aliases: ['new', 'create'],
      description: 'Add a comment to a task',
      args: [
        { name: 'task', description: 'Task ID or search text', required: true },
        { name: 'content', description: 'Comment text', required: true },
      ],
      examples: ['uni todoist comments add "Buy groceries" "Remember to get organic"'],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, globalFlags } = ctx;
        const query = args.task as string;
        const content = args.content as string;

        if (!todoist.hasToken()) {
          output.error('TODOIST_TOKEN not set.');
          return;
        }

        const spinner = output.spinner('Adding comment...');

        try {
          let taskId = query;

          if (!/^\d+$/.test(query)) {
            const tasks = await todoist.listTasks();
            const task = tasks.find(t => t.content.toLowerCase().includes(query.toLowerCase()));
            if (!task) {
              spinner.fail(`Task "${query}" not found`);
              return;
            }
            taskId = task.id;
          }

          const comment = await todoist.addComment({ task_id: taskId, content });
          spinner.success('Comment added');

          if (globalFlags.json) {
            output.json(comment);
            return;
          }

          console.log('');
          console.log(c.green('✓') + ` Added comment`);
          console.log(c.dim(`  "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`));
          console.log('');
        } catch (error) {
          spinner.fail('Failed to add comment');
          throw error;
        }
      },
    },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    ctx.output.error('Usage: uni todoist comments <list|add> <task>');
  },
};
