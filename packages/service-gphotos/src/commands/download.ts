/**
 * uni gphotos download - Download a photo
 */

import type { Command, CommandContext } from '@uni/shared';
import { gphotos } from '../api';

export const downloadCommand: Command = {
  name: 'download',
  description: 'Download a photo',
  args: [
    {
      name: 'id',
      required: true,
      description: 'Photo ID',
    },
  ],
  options: [
    {
      name: 'output',
      short: 'o',
      type: 'string',
      description: 'Output path (default: current directory)',
      default: './',
    },
  ],
  examples: [
    'uni gphotos download <photo-id>',
    'uni gphotos download <photo-id> -o ~/Downloads/',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, flags, output, globalFlags } = ctx;

    if (!gphotos.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gphotos auth" first.');
      return;
    }

    const photoId = args.id as string;
    const outputPath = flags.output as string;

    const photo = await gphotos.getPhoto(photoId);
    await gphotos.downloadPhoto(photoId, outputPath);

    if (globalFlags.json) {
      output.json({ downloaded: photo.filename, path: outputPath });
      return;
    }

    output.success(`Downloaded: ${photo.filename}`);
  },
};
