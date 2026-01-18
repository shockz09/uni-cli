/**
 * uni gslides add-video - Add a video to a slide
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const addVideoCommand: Command = {
  name: 'add-video',
  description: 'Add a YouTube or Drive video to a slide',
  args: [
    { name: 'presentation', description: 'Presentation ID or URL', required: true },
    { name: 'slide', description: 'Slide object ID', required: true },
    { name: 'video-id', description: 'YouTube video ID or Drive file ID', required: true },
  ],
  options: [
    { name: 'source', short: 's', description: 'Video source: youtube or drive (default: youtube)', type: 'string' },
    { name: 'x', description: 'X position in points (default: 100)', type: 'number' },
    { name: 'y', description: 'Y position in points (default: 100)', type: 'number' },
    { name: 'width', short: 'w', description: 'Width in points (default: 400)', type: 'number' },
    { name: 'height', short: 'h', description: 'Height in points (default: 225)', type: 'number' },
  ],
  examples: [
    'uni gslides add-video PRES_ID SLIDE_ID dQw4w9WgXcQ',
    'uni gslides add-video PRES_ID SLIDE_ID DRIVE_FILE_ID -s drive',
    'uni gslides add-video PRES_ID SLIDE_ID VIDEO_ID -w 500 -h 280',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.presentation as string);
    const slideId = args.slide as string;
    const videoId = args['video-id'] as string;
    const source = ((flags.source as string) || 'youtube').toUpperCase() as 'YOUTUBE' | 'DRIVE';

    if (source !== 'YOUTUBE' && source !== 'DRIVE') {
      output.error('Source must be: youtube or drive');
      return;
    }

    const spinner = output.spinner('Adding video...');

    try {
      const objectId = await gslides.addVideo(presentationId, slideId, videoId, source, {
        x: flags.x as number,
        y: flags.y as number,
        width: flags.width as number,
        height: flags.height as number,
      });
      spinner.stop();

      if (globalFlags.json) {
        output.json({ objectId, videoId, source });
        return;
      }

      output.success('Video added');
      output.info(`  ID: ${c.dim(objectId)}`);
    } catch (error) {
      spinner.fail('Failed to add video');
      throw error;
    }
  },
};
