/**
 * uni gphotos albums - Manage albums
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gphotos } from '../api';

export const albumsCommand: Command = {
  name: 'albums',
  description: 'List or manage albums',
  args: [
    {
      name: 'action',
      required: false,
      description: 'Action: list (default), create, photos, share',
    },
    {
      name: 'value',
      required: false,
      description: 'Album title (for create) or album ID (for photos/share)',
    },
  ],
  examples: [
    'uni gphotos albums',
    'uni gphotos albums list',
    'uni gphotos albums create "Vacation 2025"',
    'uni gphotos albums photos <album-id>',
    'uni gphotos albums share <album-id>',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, globalFlags } = ctx;

    if (!gphotos.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gphotos auth" first.');
      return;
    }

    const action = (args.action as string) || 'list';
    const value = args.value as string;

    switch (action) {
      case 'list': {
        const albums = await gphotos.listAlbums({ limit: 50 });

        if (albums.length === 0) {
          output.info('No albums found');
          return;
        }

        if (globalFlags.json) {
          output.json(albums);
          return;
        }

        console.log();
        console.log(c.bold(`Albums (${albums.length})`));
        console.log();

        for (const album of albums) {
          const count = album.mediaItemsCount || '0';
          console.log(`  📁 ${c.bold(album.title)} ${c.dim(`(${count} items)`)}`);
          console.log(`    ${c.dim(album.id)}`);
        }

        console.log();
        break;
      }

      case 'create': {
        if (!value) {
          output.error('Usage: uni gphotos albums create "Album Name"');
          return;
        }

        const album = await gphotos.createAlbum(value);

        if (globalFlags.json) {
          output.json(album);
          return;
        }

        output.success(`Created album: ${album.title}`);
        console.log(`  ID: ${album.id}`);
        break;
      }

      case 'photos': {
        if (!value) {
          output.error('Usage: uni gphotos albums photos <album-id>');
          return;
        }

        const photos = await gphotos.getAlbumPhotos(value);

        if (photos.length === 0) {
          output.info('No photos in album');
          return;
        }

        if (globalFlags.json) {
          output.json(photos);
          return;
        }

        console.log();
        console.log(c.bold(`Album Photos (${photos.length})`));
        console.log();

        for (const photo of photos) {
          const date = gphotos.formatDate(photo.mediaMetadata.creationTime);
          console.log(`  📷 ${c.bold(photo.filename)} ${c.dim(date)}`);
        }

        console.log();
        break;
      }

      case 'share': {
        if (!value) {
          output.error('Usage: uni gphotos albums share <album-id>');
          return;
        }

        const shareUrl = await gphotos.shareAlbum(value);

        if (globalFlags.json) {
          output.json({ shareUrl });
          return;
        }

        output.success('Album shared!');
        console.log(`  URL: ${shareUrl}`);
        break;
      }

      default:
        output.error(`Unknown action: ${action}`);
        console.log('Available actions: list, create, photos, share');
    }
  },
};
