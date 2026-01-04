/**
 * uni gphotos search - Search photos
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gphotos } from '../api';

export const searchCommand: Command = {
  name: 'search',
  description: 'Search photos by date',
  args: [
    {
      name: 'query',
      required: false,
      description: 'Search query (optional)',
    },
  ],
  options: [
    {
      name: 'date',
      short: 'd',
      type: 'string',
      description: 'Filter by date (YYYY-MM or YYYY-MM-DD)',
    },
    {
      name: 'limit',
      short: 'l',
      type: 'number',
      description: 'Number of results',
      default: 20,
    },
  ],
  examples: [
    'uni gphotos search --date 2025-01',
    'uni gphotos search --date 2025-01-15',
    'uni gphotos search "beach" --date 2025',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, flags, output, globalFlags } = ctx;

    if (!gphotos.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gphotos auth" first.');
      return;
    }

    const query = args.query as string | undefined;
    const date = flags.date as string | undefined;
    const limit = flags.limit as number;

    if (!query && !date) {
      output.error('Please provide a search query or --date filter');
      return;
    }

    const photos = await gphotos.searchPhotos({ query, date, limit });

    if (photos.length === 0) {
      output.info('No photos found');
      return;
    }

    if (globalFlags.json) {
      output.json(photos);
      return;
    }

    console.log();
    console.log(c.bold(`Search Results (${photos.length})`));
    console.log();

    for (const photo of photos) {
      const photoDate = gphotos.formatDate(photo.mediaMetadata.creationTime);
      const size = `${photo.mediaMetadata.width}x${photo.mediaMetadata.height}`;
      const isVideo = photo.mimeType.startsWith('video/');
      const icon = isVideo ? '🎬' : '📷';

      console.log(`  ${icon} ${c.bold(photo.filename)}`);
      console.log(`    ${c.dim(`${photoDate} · ${size} · ${photo.id.slice(0, 12)}...`)}`);
    }

    console.log();
  },
};
