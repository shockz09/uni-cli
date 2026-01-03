/**
 * uni gforms get - Get form details
 */

import type { Command, CommandContext } from '@uni/shared';
import { gforms, extractFormId } from '../api';

export const getCommand: Command = {
  name: 'get',
  description: 'Get form details',
  args: [
    {
      name: 'id',
      required: true,
      description: 'Form ID or URL',
    },
  ],
  examples: [
    'uni gforms get <form-id>',
    'uni gforms get https://docs.google.com/forms/d/xxx/edit',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, globalFlags } = ctx;

    const formId = extractFormId(args.id as string);
    const form = await gforms.getForm(formId);

    if (globalFlags.json) {
      output.json({
        id: form.formId,
        title: form.info.title,
        description: form.info.description,
        questions: form.items?.filter(i => i.questionItem).map(i => ({
          id: i.itemId,
          title: i.title,
          type: getQuestionType(i),
        })),
        responderUri: form.responderUri,
      });
      return;
    }

    output.text(`\nForm: ${form.info.title}`);
    output.text(`ID: ${form.formId}`);
    if (form.info.description) {
      output.text(`Description: ${form.info.description}`);
    }
    if (form.responderUri) {
      output.text(`Response URL: ${form.responderUri}`);
    }

    const questions = form.items?.filter(i => i.questionItem) || [];
    if (questions.length > 0) {
      output.text(`\nQuestions (${questions.length}):`);
      questions.forEach((q, i) => {
        const type = getQuestionType(q);
        const required = q.questionItem?.question?.required ? ' *' : '';
        output.text(`  ${i + 1}. ${q.title || '(untitled)'}${required} [${type}]`);
      });
    } else {
      output.text('\nNo questions yet.');
    }

    output.text('');
  },
};

function getQuestionType(item: { questionItem?: { question: object } }): string {
  const q = item.questionItem?.question as Record<string, unknown> | undefined;
  if (!q) return 'unknown';

  if (q.textQuestion) {
    const tq = q.textQuestion as { paragraph?: boolean };
    return tq.paragraph ? 'paragraph' : 'text';
  }
  if (q.scaleQuestion) return 'scale';
  if (q.choiceQuestion) return 'choice';
  if (q.dateQuestion) return 'date';
  if (q.timeQuestion) return 'time';
  return 'unknown';
}
