/**
 * uni todoist tasks - Manage Todoist tasks
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { todoist, todoistOAuth, type Task } from '../api';

const priorityColors: Record<number, (s: string) => string> = {
  4: c.red,    // p1 = Urgent
  3: c.yellow, // p2 = High
  2: c.cyan,   // p3 = Medium
  1: c.dim,    // p4 = Low/None
};

function formatTask(task: Task): void {
  const priorityColor = priorityColors[task.priority] || c.dim;
  const checkbox = task.is_completed ? c.green('✓') : '○';
  const due = task.due ? c.dim(` (${task.due.string})`) : '';
  const labels = task.labels.length ? c.magenta(` [${task.labels.join(', ')}]`) : '';

  console.log(`${checkbox} ${priorityColor(task.content)}${due}${labels}`);
  if (task.description) {
    console.log(c.dim(`  ${task.description.substring(0, 60)}${task.description.length > 60 ? '...' : ''}`));
  }
}

export const tasksCommand: Command = {
  name: 'tasks',
  aliases: ['task', 't'],
  description: 'Manage tasks',
  subcommands: [
    {
      name: 'list',
      aliases: ['ls'],
      description: 'List tasks',
      options: [
        { name: 'project', short: 'p', type: 'string', description: 'Filter by project name' },
        { name: 'filter', short: 'f', type: 'string', description: 'Todoist filter (e.g., "today", "overdue")' },
      ],
      examples: [
        'uni todoist tasks list',
        'uni todoist tasks list --project Work',
        'uni todoist tasks list --filter today',
        'uni todoist tasks list --filter "p1 | p2"',
      ],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, flags, globalFlags } = ctx;
        const projectName = flags.project as string | undefined;
        const filter = flags.filter as string | undefined;

        if (!todoistOAuth.isAuthenticated()) {
          output.error('Not authenticated. Run "uni todoist auth" first.');
          return;
        }

        const spinner = output.spinner('Fetching tasks...');

        try {
          let projectId: string | undefined;
          if (projectName) {
            const projects = await todoist.listProjects();
            const project = projects.find(p => p.name.toLowerCase() === projectName.toLowerCase());
            if (!project) {
              spinner.fail(`Project "${projectName}" not found`);
              return;
            }
            projectId = project.id;
          }

          const tasks = await todoist.listTasks({ projectId, filter });
          spinner.success(`${tasks.length} tasks`);

          if (globalFlags.json) {
            output.json(tasks);
            return;
          }

          if (tasks.length === 0) {
            console.log(c.dim('\nNo tasks found.'));
            return;
          }

          console.log('');
          for (const task of tasks) {
            formatTask(task);
          }
          console.log('');
        } catch (error) {
          spinner.fail('Failed to fetch tasks');
          throw error;
        }
      },
    },
    {
      name: 'add',
      aliases: ['new', 'create'],
      description: 'Add a new task',
      args: [{ name: 'content', description: 'Task content', required: true }],
      options: [
        { name: 'project', short: 'p', type: 'string', description: 'Project name' },
        { name: 'due', short: 'd', type: 'string', description: 'Due date (e.g., "today", "tomorrow", "next week")' },
        { name: 'priority', type: 'number', description: 'Priority: 1-4 (4=Urgent)' },
        { name: 'labels', short: 'l', type: 'string', description: 'Comma-separated labels' },
        { name: 'description', type: 'string', description: 'Task description' },
      ],
      examples: [
        'uni todoist tasks add "Buy groceries"',
        'uni todoist tasks add "Finish report" --due tomorrow --priority 4',
        'uni todoist tasks add "Call mom" -p Personal -d "next weekend"',
      ],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, flags, globalFlags } = ctx;
        const content = args.content as string;

        if (!todoistOAuth.isAuthenticated()) {
          output.error('Not authenticated. Run "uni todoist auth" first.');
          return;
        }

        const spinner = output.spinner('Creating task...');

        try {
          let projectId: string | undefined;
          if (flags.project) {
            const projects = await todoist.listProjects();
            const project = projects.find(p => p.name.toLowerCase() === (flags.project as string).toLowerCase());
            if (project) {
              projectId = project.id;
            }
          }

          const labels = flags.labels ? (flags.labels as string).split(',').map(l => l.trim()) : undefined;

          const task = await todoist.createTask({
            content,
            description: flags.description as string | undefined,
            project_id: projectId,
            priority: flags.priority as number | undefined,
            due_string: flags.due as string | undefined,
            labels,
          });

          spinner.success('Task created');

          if (globalFlags.json) {
            output.json(task);
            return;
          }

          console.log('');
          console.log(c.green('✓') + ` Created: ${task.content}`);
          if (task.due) {
            console.log(c.dim(`  Due: ${task.due.string}`));
          }
          console.log('');
        } catch (error) {
          spinner.fail('Failed to create task');
          throw error;
        }
      },
    },
    {
      name: 'done',
      aliases: ['complete', 'close'],
      description: 'Mark a task as complete',
      args: [{ name: 'query', description: 'Task ID or search text', required: true }],
      examples: [
        'uni todoist tasks done "Buy groceries"',
        'uni todoist tasks done 123456789',
      ],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, globalFlags } = ctx;
        const query = args.query as string;

        if (!todoistOAuth.isAuthenticated()) {
          output.error('Not authenticated. Run "uni todoist auth" first.');
          return;
        }

        const spinner = output.spinner(`Completing task...`);

        try {
          let taskId = query;

          // If not a numeric ID, search by content
          if (!/^\d+$/.test(query)) {
            const tasks = await todoist.listTasks();
            const task = tasks.find(t => t.content.toLowerCase().includes(query.toLowerCase()));
            if (!task) {
              spinner.fail(`Task "${query}" not found`);
              return;
            }
            taskId = task.id;
          }

          await todoist.closeTask(taskId);
          spinner.success('Task completed');

          if (globalFlags.json) {
            output.json({ success: true, taskId });
            return;
          }

          console.log('');
          console.log(c.green('✓') + ` Completed task`);
          console.log('');
        } catch (error) {
          spinner.fail('Failed to complete task');
          throw error;
        }
      },
    },
    {
      name: 'delete',
      aliases: ['rm', 'remove'],
      description: 'Delete a task',
      args: [{ name: 'query', description: 'Task ID or search text', required: true }],
      examples: ['uni todoist tasks delete "Old task"'],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, globalFlags } = ctx;
        const query = args.query as string;

        if (!todoistOAuth.isAuthenticated()) {
          output.error('Not authenticated. Run "uni todoist auth" first.');
          return;
        }

        const spinner = output.spinner(`Deleting task...`);

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

          await todoist.deleteTask(taskId);
          spinner.success('Task deleted');

          if (globalFlags.json) {
            output.json({ success: true, taskId });
            return;
          }

          console.log('');
          console.log(c.green('✓') + ` Deleted task`);
          console.log('');
        } catch (error) {
          spinner.fail('Failed to delete task');
          throw error;
        }
      },
    },
    {
      name: 'update',
      aliases: ['edit'],
      description: 'Update a task',
      args: [{ name: 'query', description: 'Task ID or search text', required: true }],
      options: [
        { name: 'content', short: 'c', type: 'string', description: 'New content' },
        { name: 'due', short: 'd', type: 'string', description: 'New due date' },
        { name: 'priority', short: 'p', type: 'number', description: 'New priority' },
        { name: 'labels', short: 'l', type: 'string', description: 'New labels (comma-separated)' },
      ],
      examples: [
        'uni todoist tasks update "Buy groceries" --due tomorrow',
        'uni todoist tasks update "Report" --priority 4',
      ],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, flags, globalFlags } = ctx;
        const query = args.query as string;

        if (!todoistOAuth.isAuthenticated()) {
          output.error('Not authenticated. Run "uni todoist auth" first.');
          return;
        }

        const spinner = output.spinner(`Updating task...`);

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

          const labels = flags.labels ? (flags.labels as string).split(',').map(l => l.trim()) : undefined;

          const task = await todoist.updateTask(taskId, {
            content: flags.content as string | undefined,
            due_string: flags.due as string | undefined,
            priority: flags.priority as number | undefined,
            labels,
          });

          spinner.success('Task updated');

          if (globalFlags.json) {
            output.json(task);
            return;
          }

          console.log('');
          console.log(c.green('✓') + ` Updated: ${task.content}`);
          console.log('');
        } catch (error) {
          spinner.fail('Failed to update task');
          throw error;
        }
      },
    },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const listCmd = this.subcommands?.find(s => s.name === 'list');
    if (listCmd) {
      await listCmd.handler(ctx);
    }
  },
};
