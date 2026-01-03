/**
 * uni gforms responses - View form responses
 */

import type { Command, CommandContext } from '@uni/shared';
import { gforms, extractFormId } from '../api';

export const responsesCommand: Command = {
  name: 'responses',
  description: 'View form responses',
  args: [
    {
      name: 'id',
      required: true,
      description: 'Form ID or URL',
    },
  ],
  examples: [
    'uni gforms responses <form-id>',
    'uni gforms responses <form-id> --json',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, globalFlags } = ctx;

    const formId = extractFormId(args.id as string);

    // Get form to show question titles
    const form = await gforms.getForm(formId);
    const responses = await gforms.getResponses(formId);

    if (globalFlags.json) {
      output.json({
        formId,
        formTitle: form.info.title,
        responseCount: responses.length,
        responses: responses.map(r => ({
          responseId: r.responseId,
          submittedAt: r.lastSubmittedTime,
          respondentEmail: r.respondentEmail,
          answers: r.answers,
        })),
      });
      return;
    }

    output.text(`\nForm: ${form.info.title}`);
    output.text(`Responses: ${responses.length}`);

    if (responses.length === 0) {
      output.text('\nNo responses yet.');
      output.text('');
      return;
    }

    // Build question ID to title map
    const questionTitles: Record<string, string> = {};
    for (const item of form.items || []) {
      if (item.questionItem?.question) {
        const qId = (item.questionItem.question as { questionId?: string }).questionId;
        if (qId) {
          questionTitles[qId] = item.title || '(untitled)';
        }
      }
    }

    output.text('\n--- Responses ---\n');

    for (let i = 0; i < responses.length; i++) {
      const r = responses[i];
      const date = new Date(r.lastSubmittedTime).toLocaleString();
      output.text(`Response ${i + 1} (${date}):`);

      if (r.respondentEmail) {
        output.text(`  Email: ${r.respondentEmail}`);
      }

      if (r.answers) {
        for (const [qId, answer] of Object.entries(r.answers)) {
          const title = questionTitles[qId] || qId;
          let value = '';

          if (answer.textAnswers?.answers) {
            value = answer.textAnswers.answers.map(a => a.value).join(', ');
          } else if (answer.scaleAnswers?.answers) {
            value = answer.scaleAnswers.answers.map(a => String(a.value)).join(', ');
          }

          output.text(`  ${title}: ${value}`);
        }
      }

      output.text('');
    }
  },
};
