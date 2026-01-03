/**
 * uni gdocs export - Export document to file
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';
import * as fs from 'node:fs';
import * as path from 'node:path';

const EXPORT_FORMATS: Record<string, { mimeType: string; extension: string }> = {
  pdf: { mimeType: 'application/pdf', extension: '.pdf' },
  docx: { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: '.docx' },
  txt: { mimeType: 'text/plain', extension: '.txt' },
  html: { mimeType: 'text/html', extension: '.html' },
  md: { mimeType: 'text/plain', extension: '.md' },
};

export const exportCommand: Command = {
  name: 'export',
  description: 'Export document to file',
  args: [
    {
      name: 'id',
      description: 'Document ID or URL',
      required: true,
    },
    {
      name: 'format',
      description: 'Export format: pdf, docx, txt, html, md',
      required: true,
    },
  ],
  options: [
    {
      name: 'output',
      short: 'o',
      type: 'string',
      description: 'Output file path',
    },
  ],
  examples: [
    'uni gdocs export 1abc123XYZ pdf',
    'uni gdocs export 1abc123XYZ pdf --output report.pdf',
    'uni gdocs export 1abc123XYZ txt --output notes.txt',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const format = (args.format as string).toLowerCase();
    const outputPath = flags.output as string | undefined;

    const formatInfo = EXPORT_FORMATS[format];
    if (!formatInfo) {
      output.error(`Unknown format: ${format}. Use: pdf, docx, txt, html, md`);
      return;
    }

    const spinner = output.spinner(`Exporting as ${format.toUpperCase()}...`);

    try {
      // Get document title for default filename
      const doc = await gdocs.getDocument(documentId);
      const defaultFilename = `${doc.title.replace(/[^a-zA-Z0-9]/g, '_')}${formatInfo.extension}`;
      const finalPath = outputPath || defaultFilename;

      // For markdown, we extract text ourselves
      if (format === 'md') {
        const content = gdocs.extractText(doc);
        // Basic markdown: title as h1
        const markdown = `# ${doc.title}\n\n${content}`;
        fs.writeFileSync(finalPath, markdown);
      } else {
        const data = await gdocs.exportDocument(documentId, formatInfo.mimeType);
        fs.writeFileSync(finalPath, Buffer.from(data));
      }

      spinner.success('Document exported');

      if (globalFlags.json) {
        output.json({
          documentId,
          format,
          file: path.resolve(finalPath),
          success: true,
        });
        return;
      }

      console.log('');
      console.log(`\x1b[32mExported:\x1b[0m ${finalPath}`);
      console.log('');
    } catch (error) {
      spinner.fail('Failed to export document');
      throw error;
    }
  },
};
