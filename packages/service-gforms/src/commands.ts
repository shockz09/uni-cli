/**
 * Google Forms Commands
 *
 * Consolidated command definitions for gforms service.
 */

import type { Command, CommandContext } from '@uni/shared';
import { c, createGoogleAuthCommand } from '@uni/shared';
import { gforms, extractFormId } from './api';

// ============================================================
// Auth Command
// ============================================================

export const authCommand = createGoogleAuthCommand({
  serviceName: 'Forms',
  serviceKey: 'gforms',
  client: gforms,
});

// ============================================================
// List Command
// ============================================================

const listCommand: Command = {
  name: 'list',
  description: 'List recent forms',
  options: [
    { name: 'limit', short: 'n', type: 'string', description: 'Number of forms to show (default: 10)' },
  ],
  examples: ['uni gforms list', 'uni gforms list -n 20'],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    const limit = flags.limit ? parseInt(flags.limit as string, 10) : 10;
    const forms = await gforms.listForms(limit);

    if (globalFlags.json) {
      output.json(forms);
      return;
    }

    if (forms.length === 0) {
      console.log(c.dim('No forms found'));
      return;
    }

    output.text('\nRecent Forms:\n');

    for (const form of forms) {
      const modified = new Date(form.modifiedTime).toLocaleDateString();
      output.text(`  ${form.name}`);
      output.text(`    ID: ${form.id} | Modified: ${modified}`);
    }

    output.text('');
  },
};

// ============================================================
// Get Command
// ============================================================

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

const getCommand: Command = {
  name: 'get',
  description: 'Get form details',
  args: [{ name: 'id', required: true, description: 'Form ID or URL' }],
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

// ============================================================
// Create Command
// ============================================================

const createCommand: Command = {
  name: 'create',
  description: 'Create a new form',
  args: [{ name: 'title', required: true, description: 'Form title' }],
  examples: ['uni gforms create "Customer Feedback"', 'uni gforms create "Event Registration"'],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, globalFlags } = ctx;

    const title = args.title as string;
    const form = await gforms.createForm(title);

    const editUrl = `https://docs.google.com/forms/d/${form.formId}/edit`;

    if (globalFlags.json) {
      output.json({
        id: form.formId,
        title: form.info.title,
        editUrl,
        responderUri: form.responderUri,
      });
      return;
    }

    output.success(`Created form: ${form.info.title}`);
    output.text(`ID: ${form.formId}`);
    output.text(`Edit URL: ${editUrl}`);
    if (form.responderUri) {
      output.text(`Response URL: ${form.responderUri}`);
    }
  },
};

// ============================================================
// Add Question Command
// ============================================================

const addQuestionCommand: Command = {
  name: 'add-question',
  description: 'Add a question to a form',
  args: [
    { name: 'id', required: true, description: 'Form ID or URL' },
    { name: 'title', required: true, description: 'Question title' },
    { name: 'type', required: false, description: 'Question type: text, paragraph, scale, choice (default: text)' },
  ],
  options: [
    { name: 'required', short: 'r', type: 'boolean', description: 'Make question required' },
    { name: 'choices', type: 'string', description: 'Comma-separated choices (for choice type)' },
    { name: 'low', type: 'string', description: 'Low value for scale (default: 1)' },
    { name: 'high', type: 'string', description: 'High value for scale (default: 5)' },
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

// ============================================================
// Responses Command
// ============================================================

const responsesCommand: Command = {
  name: 'responses',
  description: 'View form responses',
  args: [{ name: 'id', required: true, description: 'Form ID or URL' }],
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

// ============================================================
// Share Command
// ============================================================

const shareCommand: Command = {
  name: 'share',
  description: 'Share a form with someone or make public',
  args: [
    { name: 'id', required: true, description: 'Form ID or URL' },
    { name: 'target', required: true, description: 'Email address or "anyone" for public access' },
  ],
  options: [
    { name: 'role', short: 'r', type: 'string', description: 'Permission role: reader or writer (default: writer)' },
  ],
  examples: [
    'uni gforms share <id> colleague@example.com',
    'uni gforms share <id> anyone',
    'uni gforms share <id> viewer@example.com --role reader',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, flags, globalFlags } = ctx;

    const formId = extractFormId(args.id as string);
    const target = args.target as string;
    const role = (flags.role as 'reader' | 'writer') || 'writer';
    const isPublic = target.toLowerCase() === 'anyone' || target.toLowerCase() === 'public';

    if (isPublic) {
      await gforms.sharePublic(formId, role);
      if (globalFlags.json) {
        output.json({ formId, public: true, role, url: `https://docs.google.com/forms/d/${formId}` });
        return;
      }
      output.success(`Form is now public (${role})`);
      console.log(`URL: https://docs.google.com/forms/d/${formId}`);
      return;
    }

    await gforms.shareForm(formId, target, role);

    if (globalFlags.json) {
      output.json({
        formId,
        sharedWith: target,
        role,
      });
      return;
    }

    output.success(`Shared with ${target} (${role})`);
  },
};

// ============================================================
// Delete Command
// ============================================================

const deleteCommand: Command = {
  name: 'delete',
  description: 'Delete a form',
  args: [{ name: 'id', required: true, description: 'Form ID or URL' }],
  examples: ['uni gforms delete <form-id>'],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, globalFlags } = ctx;

    const formId = extractFormId(args.id as string);

    await gforms.deleteForm(formId);

    if (globalFlags.json) {
      output.json({
        formId,
        deleted: true,
      });
      return;
    }

    output.success(`Deleted form: ${formId}`);
  },
};

// ============================================================
// Update Command
// ============================================================

const updateCommand: Command = {
  name: 'update',
  aliases: ['edit'],
  description: 'Update form title or description',
  args: [{ name: 'formId', description: 'Form ID or URL', required: true }],
  options: [
    { name: 'title', short: 't', type: 'string', description: 'New title' },
    { name: 'description', short: 'd', type: 'string', description: 'New description' },
  ],
  examples: [
    'uni gforms update FORM_ID --title "New Title"',
    'uni gforms update FORM_ID --description "Updated description"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gforms.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gforms auth" first.');
      return;
    }

    const formId = extractFormId(args.formId as string);

    if (!flags.title && !flags.description) {
      output.error('Specify --title or --description');
      return;
    }

    const spinner = output.spinner('Updating form...');
    try {
      const form = await gforms.updateForm(formId, {
        title: flags.title as string | undefined,
        description: flags.description as string | undefined,
      });
      spinner.success(`Updated: ${form.info.title}`);

      if (globalFlags.json) {
        output.json(form);
      }
    } catch (error) {
      spinner.fail('Failed to update form');
      throw error;
    }
  },
};

// ============================================================
// Link Command
// ============================================================

const linkCommand: Command = {
  name: 'link',
  aliases: ['links', 'url', 'urls'],
  description: 'Get form URLs (edit, respond, results)',
  args: [{ name: 'formId', description: 'Form ID or URL', required: true }],
  examples: ['uni gforms link FORM_ID'],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gforms.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gforms auth" first.');
      return;
    }

    const formId = extractFormId(args.formId as string);
    const urls = gforms.getFormUrls(formId);

    if (globalFlags.json) {
      output.json(urls);
      return;
    }

    output.info('Form URLs:\n');
    output.info(`  Edit:    ${urls.edit}`);
    output.info(`  Respond: ${urls.respond}`);
    output.info(`  Results: ${urls.results}`);
  },
};

// ============================================================
// Export Command
// ============================================================

const exportCommand: Command = {
  name: 'export',
  description: 'Export form responses to CSV format',
  args: [{ name: 'formId', description: 'Form ID or URL', required: true }],
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
        output.info('No responses found.');
        return;
      }

      // Build CSV header from questions
      const questions = form.items?.filter(i => i.questionItem).map(i => i.title || 'Question') || [];
      const header = ['Timestamp', 'Email', ...questions];
      output.info(header.map(h => `"${h}"`).join(','));

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

        output.info(row.map(v => `"${v}"`).join(','));
      }
    } catch (error) {
      spinner.fail('Failed to export responses');
      throw error;
    }
  },
};

// ============================================================
// Export All Commands
// ============================================================

export const commands: Command[] = [
  listCommand,
  getCommand,
  createCommand,
  addQuestionCommand,
  responsesCommand,
  shareCommand,
  deleteCommand,
  updateCommand,
  linkCommand,
  exportCommand,
  authCommand,
];
