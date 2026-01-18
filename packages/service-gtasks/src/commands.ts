/**
 * Google Tasks Commands
 *
 * Consolidated command definitions for gtasks service.
 * Uses hybrid approach: declarative for simple commands, manual for complex ones.
 */

import type { Command, CommandContext } from '@uni/shared';
import { c, createGoogleAuthCommand } from '@uni/shared';
import { gtasks } from './api';

// ============================================================
// Auth Command
// ============================================================

export const authCommand = createGoogleAuthCommand({
  serviceName: 'Tasks',
  serviceKey: 'gtasks',
  client: gtasks,
});

// ============================================================
// Helper Functions
// ============================================================

/**
 * Parse due date string (today, tomorrow, YYYY-MM-DD) to ISO string
 */
function parseDueDate(dueStr: string): string {
  const now = new Date();

  if (dueStr === 'today') {
    return now.toISOString().split('T')[0] + 'T00:00:00.000Z';
  } else if (dueStr === 'tomorrow') {
    now.setDate(now.getDate() + 1);
    return now.toISOString().split('T')[0] + 'T00:00:00.000Z';
  } else if (dueStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dueStr + 'T00:00:00.000Z';
  }

  // Fallback: try to parse as date
  return new Date(dueStr).toISOString();
}

/**
 * Find task by index (1-based) or title
 */
async function findTask(
  listId: string,
  query: string,
  includeCompleted = true
): Promise<{ task: Awaited<ReturnType<typeof gtasks.findTaskByTitle>>; byIndex: boolean }> {
  const index = parseInt(query, 10);
  if (!isNaN(index) && index > 0 && String(index) === query) {
    // It's an index - get tasks and find by position
    const tasks = await gtasks.getTasks(listId, { showCompleted: includeCompleted });
    if (index > tasks.length) {
      return { task: null, byIndex: true };
    }
    return { task: tasks[index - 1], byIndex: true };
  }

  // Search by title
  const task = await gtasks.findTaskByTitle(listId, query);
  return { task, byIndex: false };
}

// ============================================================
// List Tasks Command
// ============================================================

const listCommand: Command = {
  name: 'list',
  description: 'List tasks',
  aliases: ['ls'],
  options: [
    { name: 'list', short: 'l', type: 'string', description: 'Task list ID (default: @default)', default: '@default' },
    { name: 'completed', short: 'c', type: 'boolean', description: 'Include completed tasks', default: false },
    { name: 'limit', type: 'number', description: 'Max tasks', default: 20 },
  ],
  examples: [
    'uni gtasks list',
    'uni gtasks list --completed',
    'uni gtasks list --list Work',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!gtasks.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gtasks auth" first.');
      return;
    }

    const spinner = output.spinner('Fetching tasks...');

    try {
      const tasks = await gtasks.getTasks(flags.list as string, {
        showCompleted: flags.completed as boolean,
        maxResults: flags.limit as number,
      });

      spinner.success(`Found ${tasks.length} task(s)`);

      if (globalFlags.json) {
        output.json(tasks);
        return;
      }

      if (tasks.length === 0) {
        console.log(c.dim('No tasks'));
        return;
      }

      console.log('');
      for (const task of tasks) {
        const checkbox = task.status === 'completed' ? c.green('✓') : '○';
        const title = task.status === 'completed'
          ? c.dim(c.strikethrough(task.title))
          : c.bold(task.title);

        let due = '';
        if (task.due) {
          const dueDate = new Date(task.due);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const isOverdue = dueDate < today && task.status !== 'completed';
          due = isOverdue
            ? ` ${c.red(`(${dueDate.toLocaleDateString()})`)}`
            : ` ${c.dim(`(${dueDate.toLocaleDateString()})`)}`;
        }

        console.log(`  ${checkbox} ${title}${due}  ${c.dim(`[${task.id}]`)}`);
        if (task.notes) {
          console.log(`    ${c.dim(`${task.notes.slice(0, 60)}${task.notes.length > 60 ? '...' : ''}`)}`);
        }
      }
      console.log('');
    } catch (error) {
      spinner.fail('Failed to fetch tasks');
      throw error;
    }
  },
};

// ============================================================
// Add Task Command
// ============================================================

const addCommand: Command = {
  name: 'add',
  description: 'Add a new task',
  aliases: ['new', 'create'],
  args: [{ name: 'title', description: 'Task title', required: true }],
  options: [
    { name: 'list', short: 'l', type: 'string', description: 'Task list ID', default: '@default' },
    { name: 'notes', short: 'n', type: 'string', description: 'Task notes/description' },
    { name: 'due', short: 'd', type: 'string', description: 'Due date (today, tomorrow, YYYY-MM-DD)' },
  ],
  examples: [
    'uni gtasks add "Buy groceries"',
    'uni gtasks add "Finish report" --due tomorrow',
    'uni gtasks add "Call mom" --notes "Ask about weekend"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gtasks.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gtasks auth" first.');
      return;
    }

    const title = args.title as string;
    const spinner = output.spinner(`Adding task "${title}"...`);

    try {
      const due = flags.due ? parseDueDate(flags.due as string) : undefined;

      const task = await gtasks.createTask(flags.list as string, {
        title,
        notes: flags.notes as string | undefined,
        due,
      });

      spinner.success('Task added');

      if (globalFlags.json) {
        output.json(task);
        return;
      }

      console.log('');
      console.log(`  ○ ${c.bold(task.title)}`);
      if (task.notes) {
        console.log(`    ${c.dim(task.notes)}`);
      }
      if (task.due) {
        console.log(`    ${c.dim(`Due: ${new Date(task.due).toLocaleDateString()}`)}`);
      }
      console.log('');
    } catch (error) {
      spinner.fail('Failed to add task');
      throw error;
    }
  },
};

// ============================================================
// Update Task Command
// ============================================================

const updateCommand: Command = {
  name: 'update',
  description: 'Update a task',
  aliases: ['edit', 'modify'],
  args: [{ name: 'search', description: 'Task title to search for', required: true }],
  options: [
    { name: 'title', short: 't', type: 'string', description: 'New title' },
    { name: 'notes', short: 'n', type: 'string', description: 'New notes' },
    { name: 'due', short: 'd', type: 'string', description: 'New due date (today, tomorrow, YYYY-MM-DD)' },
    { name: 'list', short: 'l', type: 'string', description: 'Task list name' },
  ],
  examples: [
    'uni gtasks update "Buy milk" --title "Buy groceries"',
    'uni gtasks update "Review PR" --due tomorrow',
    'uni gtasks update "Call client" --notes "Ask about budget"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, flags, output, globalFlags } = ctx;

    if (!gtasks.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gtasks auth" first.');
      return;
    }

    const search = args.search as string;
    const newTitle = flags.title as string | undefined;
    const newNotes = flags.notes as string | undefined;
    const newDue = flags.due as string | undefined;
    const listName = flags.list as string | undefined;

    if (!newTitle && !newNotes && !newDue) {
      output.error('Provide at least one update: --title, --notes, or --due');
      return;
    }

    // Find the task list
    let listId = '@default';
    if (listName) {
      const lists = await gtasks.getTaskLists();
      const found = lists.find(l => l.title.toLowerCase().includes(listName.toLowerCase()));
      if (!found) {
        output.error(`Task list "${listName}" not found`);
        return;
      }
      listId = found.id;
    }

    // Find the task
    const task = await gtasks.findTaskByTitle(listId, search);
    if (!task) {
      output.error(`No task found matching "${search}"`);
      return;
    }

    // Build updates
    const updates: { title?: string; notes?: string; due?: string } = {};
    if (newTitle) updates.title = newTitle;
    if (newNotes) updates.notes = newNotes;
    if (newDue) {
      updates.due = parseDueDate(newDue);
    }

    const updated = await gtasks.updateTask(listId, task.id, updates);

    if (globalFlags.json) {
      output.json(updated);
      return;
    }

    output.success(`Updated task: ${updated.title}`);
    if (newTitle) output.text(`  Title: ${task.title} → ${updated.title}`);
    if (newNotes) output.text(`  Notes: ${updated.notes}`);
    if (newDue) output.text(`  Due: ${new Date(updated.due!).toLocaleDateString()}`);
  },
};

// ============================================================
// Done Command
// ============================================================

const doneCommand: Command = {
  name: 'done',
  description: 'Mark task as completed',
  aliases: ['complete', 'check'],
  args: [{ name: 'title', description: 'Task title or ID', required: true }],
  options: [
    { name: 'list', short: 'l', type: 'string', description: 'Task list ID', default: '@default' },
  ],
  examples: [
    'uni gtasks done "Buy groceries"',
    'uni gtasks done abc123',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gtasks.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gtasks auth" first.');
      return;
    }

    const titleOrId = args.title as string;
    const listId = flags.list as string;
    const spinner = output.spinner('Completing task...');

    try {
      let task = await gtasks.findTaskByTitle(listId, titleOrId);

      if (!task) {
        spinner.fail(`Task "${titleOrId}" not found`);
        return;
      }

      if (task.status === 'completed') {
        spinner.success('Task already completed');
        return;
      }

      task = await gtasks.completeTask(listId, task.id);
      spinner.success('Task completed');

      if (globalFlags.json) {
        output.json(task);
        return;
      }

      console.log('');
      console.log(`  ${c.green('✓')} ${c.dim(c.strikethrough(task.title))}`);
      console.log('');
    } catch (error) {
      spinner.fail('Failed to complete task');
      throw error;
    }
  },
};

// ============================================================
// Undone Command
// ============================================================

const undoneCommand: Command = {
  name: 'undone',
  description: 'Mark task as not completed',
  aliases: ['uncomplete', 'uncheck', 'reopen'],
  args: [{ name: 'title', description: 'Task title or ID', required: true }],
  options: [
    { name: 'list', short: 'l', type: 'string', description: 'Task list ID', default: '@default' },
  ],
  examples: [
    'uni gtasks undone "Buy groceries"',
    'uni gtasks undone abc123',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gtasks.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gtasks auth" first.');
      return;
    }

    const titleOrId = args.title as string;
    const listId = flags.list as string;
    const spinner = output.spinner('Reopening task...');

    try {
      let task = await gtasks.findTaskByTitle(listId, titleOrId);

      if (!task) {
        spinner.fail(`Task "${titleOrId}" not found`);
        return;
      }

      if (task.status === 'needsAction') {
        spinner.success('Task is already open');
        return;
      }

      task = await gtasks.uncompleteTask(listId, task.id);
      spinner.success('Task reopened');

      if (globalFlags.json) {
        output.json(task);
        return;
      }

      console.log('');
      console.log(`  ○ ${c.bold(task.title)}`);
      console.log('');
    } catch (error) {
      spinner.fail('Failed to reopen task');
      throw error;
    }
  },
};

// ============================================================
// Delete Command
// ============================================================

const deleteCommand: Command = {
  name: 'delete',
  description: 'Delete a task',
  aliases: ['rm', 'remove'],
  args: [{ name: 'query', description: 'Task title, ID, or index (1-based)', required: true }],
  options: [
    { name: 'list', short: 'l', type: 'string', description: 'Task list ID', default: '@default' },
  ],
  examples: [
    'uni gtasks delete "Old task"',
    'uni gtasks delete 1',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gtasks.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gtasks auth" first.');
      return;
    }

    const query = args.query as string;
    const listId = flags.list as string;

    const { task, byIndex } = await findTask(listId, query, false);

    if (!task) {
      if (byIndex) {
        const tasks = await gtasks.getTasks(listId, { showCompleted: false });
        output.error(`No task at index ${query}. Only ${tasks.length} tasks.`);
      } else {
        output.error(`Task "${query}" not found`);
      }
      return;
    }

    await gtasks.deleteTask(listId, task.id);

    if (globalFlags.json) {
      output.json({ deleted: task.id, title: task.title });
      return;
    }

    output.success(`Deleted: ${task.title}`);
  },
};

// ============================================================
// Get Command
// ============================================================

const getCommand: Command = {
  name: 'get',
  aliases: ['view', 'show'],
  description: 'Get task details',
  args: [{ name: 'taskId', description: 'Task ID', required: true }],
  options: [
    { name: 'list', short: 'l', type: 'string', description: 'Task list ID (default: @default)' },
  ],
  examples: [
    'uni gtasks get TASK_ID',
    'uni gtasks get TASK_ID --list LIST_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gtasks.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gtasks auth" first.');
      return;
    }

    const taskId = args.taskId as string;
    const listId = (flags.list as string) || '@default';

    const spinner = output.spinner('Fetching task...');
    try {
      const task = await gtasks.getTask(listId, taskId);
      spinner.stop();

      if (globalFlags.json) {
        output.json(task);
        return;
      }

      const status = task.status === 'completed' ? '[x]' : '[ ]';
      output.info(`${status} ${task.title}\n`);
      output.info(`  ID: ${task.id}`);
      output.info(`  Status: ${task.status}`);
      if (task.notes) output.info(`  Notes: ${task.notes}`);
      if (task.due) output.info(`  Due: ${new Date(task.due).toLocaleDateString()}`);
      if (task.completed) output.info(`  Completed: ${new Date(task.completed).toLocaleString()}`);
      if (task.parent) output.info(`  Parent: ${task.parent}`);
      if (task.updated) output.info(`  Updated: ${new Date(task.updated).toLocaleString()}`);
    } catch (error) {
      spinner.fail('Failed to fetch task');
      throw error;
    }
  },
};

// ============================================================
// Move Command
// ============================================================

const moveCommand: Command = {
  name: 'move',
  description: 'Move or reorder a task',
  args: [{ name: 'taskId', description: 'Task ID to move', required: true }],
  options: [
    { name: 'list', short: 'l', type: 'string', description: 'Task list ID (default: @default)' },
    { name: 'parent', short: 'p', type: 'string', description: 'Parent task ID (makes it a subtask)' },
    { name: 'after', short: 'a', type: 'string', description: 'Task ID to position after' },
  ],
  examples: [
    'uni gtasks move TASK_ID --parent PARENT_TASK_ID',
    'uni gtasks move TASK_ID --after OTHER_TASK_ID',
    'uni gtasks move TASK_ID --list LIST_ID --parent PARENT_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gtasks.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gtasks auth" first.');
      return;
    }

    const taskId = args.taskId as string;
    const listId = (flags.list as string) || '@default';

    const spinner = output.spinner('Moving task...');
    try {
      const task = await gtasks.moveTask(listId, taskId, {
        parent: flags.parent as string | undefined,
        previous: flags.after as string | undefined,
      });
      spinner.success(`Moved: ${task.title}`);

      if (globalFlags.json) {
        output.json(task);
      }
    } catch (error) {
      spinner.fail('Failed to move task');
      throw error;
    }
  },
};

// ============================================================
// Subtask Command
// ============================================================

const subtaskCommand: Command = {
  name: 'subtask',
  description: 'Add a subtask under a parent task',
  args: [
    { name: 'parentId', description: 'Parent task ID', required: true },
    { name: 'title', description: 'Subtask title', required: true },
  ],
  options: [
    { name: 'list', short: 'l', type: 'string', description: 'Task list ID (default: @default)' },
    { name: 'notes', short: 'n', type: 'string', description: 'Task notes' },
    { name: 'due', short: 'd', type: 'string', description: 'Due date (YYYY-MM-DD)' },
  ],
  examples: [
    'uni gtasks subtask PARENT_ID "Subtask title"',
    'uni gtasks subtask PARENT_ID "Subtask" --notes "Details here"',
    'uni gtasks subtask PARENT_ID "Subtask" --due 2024-01-20',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gtasks.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gtasks auth" first.');
      return;
    }

    const parentId = args.parentId as string;
    const title = args.title as string;
    const listId = (flags.list as string) || '@default';

    const spinner = output.spinner('Creating subtask...');
    try {
      // Create the task
      const task = await gtasks.createTask(listId, {
        title,
        notes: flags.notes as string | undefined,
        due: flags.due ? new Date(flags.due as string).toISOString() : undefined,
      });

      // Move it under the parent
      const movedTask = await gtasks.moveTask(listId, task.id, { parent: parentId });
      spinner.success(`Created subtask: ${movedTask.title}`);

      if (globalFlags.json) {
        output.json(movedTask);
      } else {
        output.info(`  ID: ${movedTask.id}`);
        output.info(`  Parent: ${parentId}`);
      }
    } catch (error) {
      spinner.fail('Failed to create subtask');
      throw error;
    }
  },
};

// ============================================================
// Clear Command
// ============================================================

const clearCommand: Command = {
  name: 'clear',
  description: 'Clear all completed tasks from a list',
  options: [
    { name: 'list', short: 'l', type: 'string', description: 'Task list ID (default: @default)' },
  ],
  examples: [
    'uni gtasks clear',
    'uni gtasks clear --list LIST_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!gtasks.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gtasks auth" first.');
      return;
    }

    const listId = (flags.list as string) || '@default';

    const spinner = output.spinner('Clearing completed tasks...');
    try {
      await gtasks.clearCompleted(listId);
      spinner.success('Cleared completed tasks');

      if (globalFlags.json) {
        output.json({ cleared: true, listId });
      }
    } catch (error) {
      spinner.fail('Failed to clear tasks');
      throw error;
    }
  },
};

// ============================================================
// Lists Command (with subcommands)
// ============================================================

const listsListSubcommand: Command = {
  name: 'list',
  description: 'List all task lists',
  aliases: ['ls'],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, globalFlags } = ctx;

    if (!gtasks.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gtasks auth" first.');
      return;
    }

    const spinner = output.spinner('Fetching lists...');

    try {
      const lists = await gtasks.getTaskLists();
      spinner.success(`Found ${lists.length} list(s)`);

      if (globalFlags.json) {
        output.json(lists);
        return;
      }

      console.log('');
      for (const list of lists) {
        console.log(`  ${c.bold(list.title)}`);
        console.log(`    ${c.dim(`ID: ${list.id}`)}`);
      }
      console.log('');
    } catch (error) {
      spinner.fail('Failed to fetch lists');
      throw error;
    }
  },
};

const listsAddSubcommand: Command = {
  name: 'add',
  description: 'Create a new task list',
  aliases: ['create', 'new'],
  args: [{ name: 'name', description: 'List name', required: true }],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gtasks.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gtasks auth" first.');
      return;
    }

    const name = args.name as string;
    const spinner = output.spinner(`Creating list "${name}"...`);

    try {
      const list = await gtasks.createTaskList(name);
      spinner.success('List created');

      if (globalFlags.json) {
        output.json(list);
        return;
      }

      console.log('');
      console.log(`  ${c.bold(list.title)}`);
      console.log(`    ${c.dim(`ID: ${list.id}`)}`);
      console.log('');
    } catch (error) {
      spinner.fail('Failed to create list');
      throw error;
    }
  },
};

const listsDeleteSubcommand: Command = {
  name: 'delete',
  description: 'Delete a task list',
  aliases: ['rm', 'remove'],
  args: [{ name: 'id', description: 'List ID', required: true }],
  options: [
    { name: 'force', short: 'f', type: 'boolean', description: 'Skip confirmation', default: false },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gtasks.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gtasks auth" first.');
      return;
    }

    const listId = args.id as string;
    const spinner = output.spinner('Deleting list...');

    try {
      await gtasks.deleteTaskList(listId);
      spinner.success('List deleted');

      if (globalFlags.json) {
        output.json({ deleted: listId });
      }
    } catch (error) {
      spinner.fail('Failed to delete list');
      throw error;
    }
  },
};

const listsCommand: Command = {
  name: 'lists',
  description: 'Manage task lists',
  subcommands: [listsListSubcommand, listsAddSubcommand, listsDeleteSubcommand],
  examples: [
    'uni gtasks lists',
    'uni gtasks lists add "Work"',
    'uni gtasks lists delete <list-id>',
  ],

  // Default: list all lists
  async handler(ctx: CommandContext): Promise<void> {
    return listsListSubcommand.handler(ctx);
  },
};

// ============================================================
// Export All Commands
// ============================================================

export const commands: Command[] = [
  listCommand,
  addCommand,
  updateCommand,
  doneCommand,
  undoneCommand,
  deleteCommand,
  getCommand,
  moveCommand,
  subtaskCommand,
  clearCommand,
  listsCommand,
  authCommand,
];
