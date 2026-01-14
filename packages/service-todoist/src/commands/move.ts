/**
 * uni todoist move - Move task to different project/section
 */

import type { Command, CommandContext } from '@uni/shared';
import { todoist, todoistOAuth } from '../api';

export const moveCommand: Command = {
  name: 'move',
  aliases: ['mv'],
  description: 'Move a task to a different project or section',
  args: [
    { name: 'taskId', description: 'Task ID', required: true },
  ],
  options: [
    { name: 'project', short: 'p', type: 'string', description: 'Target project ID' },
    { name: 'section', short: 's', type: 'string', description: 'Target section ID' },
  ],
  examples: [
    'uni todoist move TASK_ID --project PROJECT_ID',
    'uni todoist move TASK_ID --section SECTION_ID',
    'uni todoist move TASK_ID --project PROJECT_ID --section SECTION_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!todoistOAuth.isAuthenticated()) {
      output.error('Not authenticated. Run "uni todoist auth" first.');
      return;
    }

    const taskId = args.taskId as string;
    const projectId = flags.project as string | undefined;
    const sectionId = flags.section as string | undefined;

    if (!projectId && !sectionId) {
      output.error('At least one of --project or --section is required');
      return;
    }

    const spinner = output.spinner('Moving task...');

    try {
      const updates: Record<string, string> = {};
      if (projectId) updates.project_id = projectId;
      if (sectionId) updates.section_id = sectionId;

      const task = await todoist.updateTask(taskId, updates);
      spinner.success(`Moved: ${task.content}`);

      if (globalFlags.json) {
        output.json(task);
      } else {
        if (projectId) output.info(`  New project: ${projectId}`);
        if (sectionId) output.info(`  New section: ${sectionId}`);
      }
    } catch (error) {
      spinner.fail('Failed to move task');
      throw error;
    }
  },
};
