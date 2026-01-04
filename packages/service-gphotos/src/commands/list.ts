/**
 * uni gphotos list - List recent photos
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gphotos } from '../api';

export const listCommand: Command = {
  name: '',  // Default command
  description: 'List recent photos',
  options: [
    {
      name: 'limit',
      short: 'l',
      type: 'number',
      description: 'Number of photos to show',
      default: 20,
    },
  ],
  examples: [
    'uni gphotos',
    'uni gphotos list',
    'uni gphotos list --limit 50',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { flags, output, globalFlags } = ctx;

    if (!gphotos.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gphotos auth" first.');
      return;
    }

    const limit = flags.limit as number;
    const photos = await gphotos.listPhotos({ limit });

    if (photos.length === 0) {
      output.info('No photos found');
      return;
    }

    if (globalFlags.json) {
      output.json(photos);
      return;
    }

    console.log();
    console.log(c.bold(`Recent Photos (${photos.length})`));
    console.log();

    for (const photo of photos) {
      const date = gphotos.formatDate(photo.mediaMetadata.creationTime);
      const size = `${photo.mediaMetadata.width}x${photo.mediaMetadata.height}`;
      const isVideo = photo.mimeType.startsWith('video/');
      const icon = isVideo ? '🎬' : '📷';

      console.log(`  ${icon} ${c.bold(photo.filename)}`);
      console.log(`    ${c.dim(`${date} · ${size} · ${photo.id.slice(0, 12)}...`)}`);
    }

    console.log();
  },
};
