/**
 * uni gphotos upload - Upload a photo
 */

import type { Command, CommandContext } from '@uni/shared';
import { gphotos } from '../api';

export const uploadCommand: Command = {
  name: 'upload',
  description: 'Upload a photo',
  args: [
    {
      name: 'file',
      required: true,
      description: 'File path to upload',
    },
  ],
  options: [
    {
      name: 'album',
      short: 'a',
      type: 'string',
      description: 'Album ID to add photo to',
    },
    {
      name: 'description',
      short: 'd',
      type: 'string',
      description: 'Photo description',
    },
  ],
  examples: [
    'uni gphotos upload ./photo.jpg',
    'uni gphotos upload ./photo.jpg --album <album-id>',
    'uni gphotos upload ./photo.jpg -d "Beach vacation"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, flags, output, globalFlags } = ctx;

    if (!gphotos.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gphotos auth" first.');
      return;
    }

    const filePath = args.file as string;
    const albumId = flags.album as string | undefined;
    const description = flags.description as string | undefined;

    const photo = await gphotos.uploadPhoto(filePath, { albumId, description });

    if (globalFlags.json) {
      output.json(photo);
      return;
    }

    output.success(`Uploaded: ${photo.filename}`);
    console.log(`  ID: ${photo.id}`);
  },
};
