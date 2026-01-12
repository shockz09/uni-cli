/**
 * uni gdocs insert - Insert text at a position or image
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';

export const insertCommand: Command = {
  name: 'insert',
  description: 'Insert text at position or insert image from URL',
  args: [
    { name: 'id', description: 'Document ID or URL', required: true },
    { name: 'content', description: 'Text to insert or image URL', required: true },
  ],
  options: [
    { name: 'at', short: 'a', type: 'string', description: 'Position: "start", "end", or index number (default: end)' },
    { name: 'image', short: 'i', type: 'boolean', description: 'Insert as image (content should be URL)' },
    { name: 'width', short: 'w', type: 'number', description: 'Image width in points (default: 400)' },
  ],
  examples: [
    'uni gdocs insert ID "New paragraph at end"',
    'uni gdocs insert ID "Header text" --at start',
    'uni gdocs insert ID "Middle text" --at 100',
    'uni gdocs insert ID "https://example.com/image.png" --image',
    'uni gdocs insert ID "https://example.com/logo.png" --image --width 200',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const content = args.content as string;
    const position = flags.at as string | undefined;
    const isImage = flags.image as boolean || false;
    const imageWidth = (flags.width as number) || 400;

    const spinner = output.spinner(isImage ? 'Inserting image...' : 'Inserting text...');

    try {
      if (isImage) {
        await gdocs.insertImage(documentId, content, imageWidth, position);
        spinner.success('Image inserted');
      } else {
        await gdocs.insertText(documentId, content, position);
        spinner.success('Text inserted');
      }

      if (globalFlags.json) {
        output.json({
          documentId,
          type: isImage ? 'image' : 'text',
          position: position || 'end',
          content: isImage ? content : content.slice(0, 50) + (content.length > 50 ? '...' : ''),
        });
        return;
      }

      if (!output.isPiped()) {
        console.log('');
        console.log(`${c.green('Inserted:')} ${isImage ? 'Image' : 'Text'} at ${position || 'end'}`);
        console.log(c.dim(`https://docs.google.com/document/d/${documentId}/edit`));
        console.log('');
      }
    } catch (error) {
      spinner.fail(isImage ? 'Failed to insert image' : 'Failed to insert text');
      throw error;
    }
  },
};
