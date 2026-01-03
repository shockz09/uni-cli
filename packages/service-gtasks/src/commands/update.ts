/**
 * uni gtasks update - Update a task
 */

import type { Command, CommandContext } from '@uni/shared';
import { gtasks } from '../api';

export const updateCommand: Command = {
  name: 'update',
  description: 'Update a task',
  aliases: ['edit', 'modify'],
  args: [
    {
      name: 'search',
      description: 'Task title to search for',
      required: true,
    },
  ],
  options: [
    {
      name: 'title',
      short: 't',
      type: 'string',
      description: 'New title',
    },
    {
      name: 'notes',
      short: 'n',
      type: 'string',
      description: 'New notes',
    },
    {
      name: 'due',
      short: 'd',
      type: 'string',
      description: 'New due date (today, tomorrow, YYYY-MM-DD)',
    },
    {
      name: 'list',
      short: 'l',
      type: 'string',
      description: 'Task list name',
    },
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
      let dueDate: Date;
      if (newDue === 'today') {
        dueDate = new Date();
      } else if (newDue === 'tomorrow') {
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 1);
      } else {
        dueDate = new Date(newDue);
      }
      updates.due = dueDate.toISOString();
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
