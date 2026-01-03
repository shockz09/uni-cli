/**
 * uni gslides export - Export presentation to different formats
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Command, CommandContext } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

const FORMATS: Record<string, string> = {
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odp: 'application/vnd.oasis.opendocument.presentation',
  txt: 'text/plain',
};

export const exportCommand: Command = {
  name: 'export',
  description: 'Export presentation to PDF, PPTX, or other formats',
  args: [
    {
      name: 'id',
      required: true,
      description: 'Presentation ID or URL',
    },
    {
      name: 'format',
      required: true,
      description: 'Export format: pdf, pptx, odp, txt',
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
    'uni gslides export <id> pdf',
    'uni gslides export <id> pptx -o presentation.pptx',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, flags, globalFlags } = ctx;

    const presentationId = extractPresentationId(args.id as string);
    const format = (args.format as string).toLowerCase();

    const mimeType = FORMATS[format];
    if (!mimeType) {
      output.error(`Unknown format: ${format}`);
      output.info(`Supported formats: ${Object.keys(FORMATS).join(', ')}`);
      return;
    }

    // Get presentation title for default filename
    const presentation = await gslides.getPresentation(presentationId);
    const defaultFilename = `${presentation.title.replace(/[^a-zA-Z0-9]/g, '_')}.${format}`;
    const outputPath = (flags.output as string) || defaultFilename;

    const data = await gslides.exportPresentation(presentationId, mimeType);

    // Write to file
    const buffer = Buffer.from(data);
    fs.writeFileSync(outputPath, buffer);

    const absolutePath = path.resolve(outputPath);

    if (globalFlags.json) {
      output.json({
        presentationId,
        format,
        outputPath: absolutePath,
        size: buffer.length,
      });
      return;
    }

    output.success(`Exported to ${absolutePath}`);
    output.text(`Size: ${(buffer.length / 1024).toFixed(1)} KB`);
  },
};
