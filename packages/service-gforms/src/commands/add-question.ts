/**
 * uni gforms add-question - Add a question to a form
 */

import type { Command, CommandContext } from '@uni/shared';
import { gforms, extractFormId } from '../api';

export const addQuestionCommand: Command = {
  name: 'add-question',
  description: 'Add a question to a form',
  args: [
    {
      name: 'id',
      required: true,
      description: 'Form ID or URL',
    },
    {
      name: 'title',
      required: true,
      description: 'Question title',
    },
    {
      name: 'type',
      required: false,
      description: 'Question type: text, paragraph, scale, choice (default: text)',
    },
  ],
  options: [
    {
      name: 'required',
      short: 'r',
      type: 'boolean',
      description: 'Make question required',
    },
    {
      name: 'choices',
      type: 'string',
      description: 'Comma-separated choices (for choice type)',
    },
    {
      name: 'low',
      type: 'string',
      description: 'Low value for scale (default: 1)',
    },
    {
      name: 'high',
      type: 'string',
      description: 'High value for scale (default: 5)',
    },
  ],
  examples: [
    'uni gforms add-question <id> "Your name" text',
    'uni gforms add-question <id> "Comments" paragraph',
    'uni gforms add-question <id> "Rating" scale --low 1 --high 10',
    'uni gforms add-question <id> "Color" choice --choices "Red,Blue,Green"',
    'uni gforms add-question <id> "Email" text -r',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, flags, globalFlags } = ctx;

    const formId = extractFormId(args.id as string);
    const title = args.title as string;
    const type = ((args.type as string) || 'text').toLowerCase() as 'text' | 'paragraph' | 'scale' | 'choice';

    const validTypes = ['text', 'paragraph', 'scale', 'choice'];
    if (!validTypes.includes(type)) {
      output.error(`Invalid type: ${type}. Use: ${validTypes.join(', ')}`);
      return;
    }

    const options: { choices?: string[]; low?: number; high?: number; required?: boolean } = {
      required: flags.required === true,
    };

    if (type === 'choice' && flags.choices) {
      options.choices = (flags.choices as string).split(',').map(s => s.trim());
    }

    if (type === 'scale') {
      options.low = flags.low ? parseInt(flags.low as string, 10) : 1;
      options.high = flags.high ? parseInt(flags.high as string, 10) : 5;
    }

    await gforms.addQuestion(formId, title, type, options);

    if (globalFlags.json) {
      output.json({
        formId,
        questionTitle: title,
        questionType: type,
        required: options.required,
      });
      return;
    }

    output.success(`Added question: ${title} [${type}]`);
    if (options.required) {
      output.text('  Required: Yes');
    }
  },
};
