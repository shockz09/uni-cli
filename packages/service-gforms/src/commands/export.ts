/**
 * uni gforms export - Export form responses
 */

import type { Command, CommandContext } from '@uni/shared';
import { gforms, extractFormId } from '../api';

export const exportCommand: Command = {
  name: 'export',
  description: 'Export form responses to CSV format',
  args: [
    { name: 'formId', description: 'Form ID or URL', required: true },
  ],
  examples: [
    'uni gforms export FORM_ID',
    'uni gforms export FORM_ID > responses.csv',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gforms.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gforms auth" first.');
      return;
    }

    const formId = extractFormId(args.formId as string);

    const spinner = output.spinner('Fetching responses...');
    try {
      const [form, responses] = await Promise.all([
        gforms.getForm(formId),
        gforms.getResponses(formId),
      ]);
      spinner.stop();

      if (globalFlags.json) {
        output.json({ form: form.info.title, responses });
        return;
      }

      if (responses.length === 0) {
        output.log('No responses found.');
        return;
      }

      // Build CSV header from questions
      const questions = form.items?.filter(i => i.questionItem).map(i => i.title || 'Question') || [];
      const header = ['Timestamp', 'Email', ...questions];
      output.log(header.map(h => `"${h}"`).join(','));

      // Output each response as CSV row
      for (const response of responses) {
        const row = [
          response.lastSubmittedTime,
          response.respondentEmail || '',
        ];

        // Add answers
        for (const item of form.items || []) {
          if (item.questionItem) {
            const questionId = item.questionItem.question.questionId;
            const answer = response.answers?.[questionId];
            const value = answer?.textAnswers?.answers.map(a => a.value).join('; ') || '';
            row.push(value);
          }
        }

        output.log(row.map(v => `"${v}"`).join(','));
      }
    } catch (error) {
      spinner.fail('Failed to export responses');
      throw error;
    }
  },
};
