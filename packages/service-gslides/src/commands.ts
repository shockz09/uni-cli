/**
 * Google Slides Commands
 *
 * Hybrid approach: declarative for simple commands, manual for complex ones.
 */

import type { Command, CommandContext } from '@uni/shared';
import { cmds, registerExtractor, createGoogleAuthCommand } from '@uni/shared';
import { c } from '@uni/shared';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { gslides, extractPresentationId } from './api';

// Register the slideId extractor for presentation URLs
registerExtractor('slideId', extractPresentationId);

// ============================================================
// DECLARATIVE COMMANDS
// ============================================================

export const simpleCommands = cmds(gslides, 'gslides', {
  // Presentation operations
  create: {
    method: 'createPresentation',
    desc: 'Create a new presentation',
    args: ['title'],
    output: (result: { presentationId: string; title: string; slides?: unknown[] }, ctx) => {
      const url = `https://docs.google.com/presentation/d/${result.presentationId}/edit`;
      ctx.output.success(`Created presentation: ${result.title}`);
      ctx.output.text(`ID: ${result.presentationId}`);
      ctx.output.text(`URL: ${url}`);
      ctx.output.text(`Slides: ${result.slides?.length || 0}`);
    },
  },

  rename: {
    method: 'renamePresentation',
    desc: 'Rename a presentation',
    args: ['presentation:slideId', 'title'],
    output: (_result, ctx) => {
      ctx.output.success(`Renamed to "${ctx.args.title}"`);
    },
  },

  delete: {
    method: 'deletePresentation',
    desc: 'Delete a presentation (moves to trash)',
    args: ['presentation:slideId'],
    output: (_result, ctx) => {
      ctx.output.success('Presentation deleted');
    },
  },

  stats: {
    method: 'getStats',
    desc: 'Get presentation statistics',
    args: ['presentation:slideId'],
    output: (result: { slides: number; elements: number; textBoxes: number; shapes: number }, ctx) => {
      ctx.output.info('');
      ctx.output.info(c.bold('Presentation Statistics'));
      ctx.output.info(`  Slides:    ${c.cyan(result.slides.toString())}`);
      ctx.output.info(`  Elements:  ${c.cyan(result.elements.toString())}`);
      ctx.output.info(`  Text boxes: ${c.cyan(result.textBoxes.toString())}`);
      ctx.output.info(`  Shapes:    ${c.cyan(result.shapes.toString())}`);
      ctx.output.info('');
    },
  },

  layouts: {
    method: 'getLayouts',
    desc: 'Get available slide layouts',
    args: ['presentation:slideId'],
  },

  masters: {
    method: 'getMasters',
    desc: 'Get master slides',
    args: ['presentation:slideId'],
  },

  'delete-element': {
    method: 'deleteElement',
    desc: 'Delete a page element',
    args: ['presentation:slideId', 'element'],
    output: (_result, ctx) => {
      ctx.output.success(`Element ${ctx.args.element} deleted`);
    },
  },
});

// ============================================================
// MANUAL COMMANDS (complex logic)
// ============================================================

// List presentations
export const listCommand: Command = {
  name: 'list',
  description: 'List recent presentations',
  options: [
    { name: 'limit', short: 'n', type: 'string', description: 'Number of presentations to show (default: 10)' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const limit = flags.limit ? parseInt(flags.limit as string, 10) : 10;
    const presentations = await gslides.listPresentations(limit);

    if (globalFlags.json) {
      output.json(presentations);
      return;
    }

    if (presentations.length === 0) {
      console.log(c.dim('No presentations found'));
      return;
    }

    output.text('\nRecent Presentations:\n');

    for (const pres of presentations) {
      const modified = new Date(pres.modifiedTime).toLocaleDateString();
      output.text(`  ${pres.name}`);
      output.text(`    ID: ${pres.id} | Modified: ${modified}`);
    }

    output.text('');
  },
};

// Get presentation details
export const getCommand: Command = {
  name: 'get',
  description: 'Get presentation details',
  args: [{ name: 'id', required: true, description: 'Presentation ID or URL' }],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const presentation = await gslides.getPresentation(presentationId);

    if (globalFlags.json) {
      output.json(presentation);
      return;
    }

    output.info(`\nTitle: ${c.bold(presentation.title)}`);
    output.info(`ID: ${presentation.presentationId}`);
    output.info(`Slides: ${presentation.slides?.length || 0}`);

    if (presentation.slides && presentation.slides.length > 0) {
      output.info('\nSlides:');
      presentation.slides.forEach((slide, i) => {
        const elements = slide.pageElements?.length || 0;
        output.info(`  ${i + 1}. ${slide.objectId} (${elements} elements)`);
      });
    }

    output.info(`\nURL: https://docs.google.com/presentation/d/${presentation.presentationId}/edit`);
  },
};

// Copy presentation
export const copyCommand: Command = {
  name: 'copy',
  description: 'Create a copy of a presentation',
  args: [{ name: 'id', description: 'Presentation ID or URL', required: true }],
  options: [{ name: 'name', short: 'n', type: 'string', description: 'Name for the copy' }],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const copyName = flags.name as string | undefined;

    const spinner = output.spinner('Copying presentation...');
    try {
      const newId = await gslides.copyPresentation(presentationId, copyName);
      spinner.success('Presentation copied');

      if (globalFlags.json) {
        output.json({ sourceId: presentationId, newId, name: copyName });
        return;
      }

      console.log('');
      console.log(`${c.green('New presentation ID:')} ${newId}`);
      console.log(c.dim(`https://docs.google.com/presentation/d/${newId}/edit`));
      console.log('');
    } catch (error) {
      spinner.fail('Failed to copy presentation');
      throw error;
    }
  },
};

// Share presentation
export const shareCommand: Command = {
  name: 'share',
  description: 'Share a presentation with someone or make public',
  args: [
    { name: 'id', required: true, description: 'Presentation ID or URL' },
    { name: 'target', required: true, description: 'Email address or "anyone" for public access' },
  ],
  options: [
    { name: 'role', short: 'r', type: 'string', description: 'Permission role: reader or writer (default: writer)' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const target = args.target as string;
    const role = (flags.role as 'reader' | 'writer') || 'writer';
    const isPublic = target.toLowerCase() === 'anyone' || target.toLowerCase() === 'public';

    if (isPublic) {
      await gslides.sharePublic(presentationId, role);
      if (globalFlags.json) {
        output.json({ presentationId, public: true, role, url: `https://docs.google.com/presentation/d/${presentationId}` });
        return;
      }
      output.success(`Presentation is now public (${role})`);
      console.log(`URL: https://docs.google.com/presentation/d/${presentationId}`);
      return;
    }

    await gslides.sharePresentation(presentationId, target, role);

    if (globalFlags.json) {
      output.json({ presentationId, sharedWith: target, role });
      return;
    }

    output.success(`Shared with ${target} (${role})`);
  },
};

// Move presentation
export const moveCommand: Command = {
  name: 'move',
  description: 'Move presentation to a different folder',
  args: [
    { name: 'presentation', description: 'Presentation ID or URL', required: true },
    { name: 'folder', description: 'Destination folder ID', required: true },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.presentation as string);
    const folderId = args.folder as string;

    const spinner = output.spinner('Moving presentation...');
    try {
      await gslides.movePresentation(presentationId, folderId);
      spinner.stop();

      if (globalFlags.json) {
        output.json({ success: true, presentationId, folderId });
        return;
      }

      output.success('Presentation moved to folder');
    } catch (error) {
      spinner.fail('Failed to move presentation');
      throw error;
    }
  },
};

// Versions
export const versionsCommand: Command = {
  name: 'versions',
  description: 'Get presentation revision history',
  args: [{ name: 'presentation', description: 'Presentation ID or URL', required: true }],
  options: [{ name: 'limit', short: 'n', type: 'number', description: 'Number of revisions (default: 10)' }],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.presentation as string);
    const limit = (flags.limit as number) || 10;

    const spinner = output.spinner('Fetching revisions...');
    try {
      const revisions = await gslides.getRevisions(presentationId, limit);
      spinner.stop();

      if (globalFlags.json) {
        output.json(revisions);
        return;
      }

      if (revisions.length === 0) {
        output.info('No revisions found.');
        return;
      }

      output.info('\nRevision History:\n');
      for (const rev of revisions) {
        const date = new Date(rev.modifiedTime).toLocaleString();
        const user = rev.lastModifyingUser?.displayName || 'Unknown';
        output.info(`  ${rev.id} - ${date} by ${user}`);
      }
      output.info('');
    } catch (error) {
      spinner.fail('Failed to fetch revisions');
      throw error;
    }
  },
};

// Add slide
export const addSlideCommand: Command = {
  name: 'add-slide',
  description: 'Add a new slide to presentation',
  args: [{ name: 'id', required: true, description: 'Presentation ID or URL' }],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const slideId = await gslides.addSlide(presentationId);
    const presentation = await gslides.getPresentation(presentationId);

    if (globalFlags.json) {
      output.json({ presentationId, newSlideId: slideId, totalSlides: presentation.slides?.length || 0 });
      return;
    }

    output.success('Added new slide');
    output.text(`Slide ID: ${slideId}`);
    output.text(`Total slides: ${presentation.slides?.length || 0}`);
  },
};

// Delete slide
export const deleteSlideCommand: Command = {
  name: 'delete-slide',
  description: 'Delete a slide from presentation',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
    { name: 'slide', description: 'Slide number (1-indexed) or slide ID', required: true },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const slideArg = args.slide as string;

    const presentation = await gslides.getPresentation(presentationId);
    const slides = presentation.slides || [];

    let slideId: string;
    const slideNum = parseInt(slideArg, 10);
    if (!isNaN(slideNum) && slideNum > 0 && slideNum <= slides.length) {
      slideId = slides[slideNum - 1].objectId;
    } else {
      slideId = slideArg;
    }

    const spinner = output.spinner('Deleting slide...');
    try {
      await gslides.deleteSlide(presentationId, slideId);
      spinner.success('Slide deleted');

      if (globalFlags.json) {
        output.json({ presentationId, slideId, deleted: true });
      }
    } catch (error) {
      spinner.fail('Failed to delete slide');
      throw error;
    }
  },
};

// Duplicate slide
export const duplicateSlideCommand: Command = {
  name: 'duplicate-slide',
  description: 'Duplicate a slide',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
    { name: 'slide', description: 'Slide number (1-indexed) or slide ID', required: true },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const slideArg = args.slide as string;

    const presentation = await gslides.getPresentation(presentationId);
    const slides = presentation.slides || [];

    let slideId: string;
    const slideNum = parseInt(slideArg, 10);
    if (!isNaN(slideNum) && slideNum > 0 && slideNum <= slides.length) {
      slideId = slides[slideNum - 1].objectId;
    } else {
      slideId = slideArg;
    }

    const spinner = output.spinner('Duplicating slide...');
    try {
      const newSlideId = await gslides.duplicateSlide(presentationId, slideId);
      spinner.success('Slide duplicated');

      if (globalFlags.json) {
        output.json({ presentationId, originalSlideId: slideId, newSlideId });
        return;
      }

      output.text(`New slide ID: ${newSlideId}`);
    } catch (error) {
      spinner.fail('Failed to duplicate slide');
      throw error;
    }
  },
};

// Clear slide
export const clearSlideCommand: Command = {
  name: 'clear-slide',
  description: 'Remove all elements from a slide',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
    { name: 'slide', description: 'Slide number (1-indexed) or slide ID', required: true },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const slideArg = args.slide as string;

    const presentation = await gslides.getPresentation(presentationId);
    const slides = presentation.slides || [];

    let slideIndex: number;
    const slideNum = parseInt(slideArg, 10);
    if (!isNaN(slideNum) && slideNum > 0 && slideNum <= slides.length) {
      slideIndex = slideNum - 1;
    } else {
      slideIndex = slides.findIndex(s => s.objectId === slideArg);
      if (slideIndex === -1) {
        output.error('Slide not found');
        return;
      }
    }

    const slide = slides[slideIndex];
    const elementIds = slide.pageElements?.map(el => el.objectId) || [];

    if (elementIds.length === 0) {
      output.info('Slide is already empty');
      return;
    }

    const spinner = output.spinner(`Clearing ${elementIds.length} elements...`);
    try {
      await gslides.clearSlide(presentationId, elementIds);
      spinner.success(`Cleared ${elementIds.length} elements from slide`);

      if (globalFlags.json) {
        output.json({ presentationId, slideId: slide.objectId, elementsRemoved: elementIds.length });
      }
    } catch (error) {
      spinner.fail('Failed to clear slide');
      throw error;
    }
  },
};

// Replace text
export const replaceTextCommand: Command = {
  name: 'replace-text',
  description: 'Replace text throughout presentation',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
    { name: 'find', description: 'Text to find', required: true },
    { name: 'replace', description: 'Replacement text', required: true },
  ],
  options: [
    { name: 'case', short: 'c', type: 'boolean', description: 'Match case (default: false)' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const findText = args.find as string;
    const replaceText = args.replace as string;
    const matchCase = (flags.case as boolean) || false;

    const spinner = output.spinner('Replacing text...');
    try {
      const count = await gslides.replaceText(presentationId, findText, replaceText, matchCase);
      spinner.success(`Replaced ${count} occurrence(s)`);

      if (globalFlags.json) {
        output.json({ presentationId, find: findText, replace: replaceText, occurrences: count });
      }
    } catch (error) {
      spinner.fail('Failed to replace text');
      throw error;
    }
  },
};

// Export presentation
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
    { name: 'id', required: true, description: 'Presentation ID or URL' },
    { name: 'format', required: true, description: 'Export format: pdf, pptx, odp, txt' },
  ],
  options: [
    { name: 'output', short: 'o', type: 'string', description: 'Output file path' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const format = (args.format as string).toLowerCase();

    const mimeType = FORMATS[format];
    if (!mimeType) {
      output.error(`Unknown format: ${format}`);
      output.info(`Supported formats: ${Object.keys(FORMATS).join(', ')}`);
      return;
    }

    const presentation = await gslides.getPresentation(presentationId);
    const defaultFilename = `${presentation.title.replace(/[^a-zA-Z0-9]/g, '_')}.${format}`;
    const outputPath = (flags.output as string) || defaultFilename;

    const data = await gslides.exportPresentation(presentationId, mimeType);
    const buffer = Buffer.from(data);
    fs.writeFileSync(outputPath, buffer);

    const absolutePath = path.resolve(outputPath);

    if (globalFlags.json) {
      output.json({ presentationId, format, outputPath: absolutePath, size: buffer.length });
      return;
    }

    output.success(`Exported to ${absolutePath}`);
    output.text(`Size: ${(buffer.length / 1024).toFixed(1)} KB`);
  },
};

// Add text
export const addTextCommand: Command = {
  name: 'add-text',
  description: 'Add text to a slide',
  args: [
    { name: 'id', required: true, description: 'Presentation ID or URL' },
    { name: 'slide', required: true, description: 'Slide number or ID' },
    { name: 'text', required: true, description: 'Text to add' },
  ],
  options: [
    { name: 'x', type: 'number', description: 'X position (default: 50)' },
    { name: 'y', type: 'number', description: 'Y position (default: 100)' },
    { name: 'width', short: 'w', type: 'number', description: 'Width (default: 500)' },
    { name: 'height', short: 'h', type: 'number', description: 'Height (default: 300)' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const slideArg = args.slide as string;
    const text = args.text as string;

    const presentation = await gslides.getPresentation(presentationId);
    const slides = presentation.slides || [];

    let slideId: string;
    const slideNum = parseInt(slideArg, 10);
    if (!isNaN(slideNum) && slideNum > 0 && slideNum <= slides.length) {
      slideId = slides[slideNum - 1].objectId;
    } else {
      slideId = slideArg;
    }

    const shapeId = await gslides.addText(presentationId, slideId, text, {
      x: flags.x as number,
      y: flags.y as number,
      width: flags.width as number,
      height: flags.height as number,
    });

    if (globalFlags.json) {
      output.json({ presentationId, slideId, shapeId, text });
      return;
    }

    output.success('Text added');
    output.text(`Shape ID: ${shapeId}`);
  },
};

// Add image
export const addImageCommand: Command = {
  name: 'add-image',
  description: 'Add an image to a slide',
  args: [
    { name: 'id', required: true, description: 'Presentation ID or URL' },
    { name: 'slide', required: true, description: 'Slide number or ID' },
    { name: 'url', required: true, description: 'Image URL' },
  ],
  options: [
    { name: 'x', type: 'number', description: 'X position (default: 100)' },
    { name: 'y', type: 'number', description: 'Y position (default: 100)' },
    { name: 'width', short: 'w', type: 'number', description: 'Width (default: 300)' },
    { name: 'height', short: 'h', type: 'number', description: 'Height' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const slideArg = args.slide as string;
    const imageUrl = args.url as string;

    const presentation = await gslides.getPresentation(presentationId);
    const slides = presentation.slides || [];

    let slideId: string;
    const slideNum = parseInt(slideArg, 10);
    if (!isNaN(slideNum) && slideNum > 0 && slideNum <= slides.length) {
      slideId = slides[slideNum - 1].objectId;
    } else {
      slideId = slideArg;
    }

    const spinner = output.spinner('Adding image...');
    try {
      await gslides.addImage(presentationId, slideId, imageUrl, {
        x: flags.x as number,
        y: flags.y as number,
        width: flags.width as number,
        height: flags.height as number,
      });
      spinner.success('Image added');

      if (globalFlags.json) {
        output.json({ presentationId, slideId, imageUrl });
      }
    } catch (error) {
      spinner.fail('Failed to add image');
      throw error;
    }
  },
};

// Add shape
const SHAPE_TYPES = ['RECTANGLE', 'ELLIPSE', 'TRIANGLE', 'ARROW_EAST', 'ARROW_WEST', 'ARROW_NORTH', 'ARROW_SOUTH', 'STAR_5', 'STAR_6', 'DIAMOND', 'HEART', 'CLOUD', 'ROUND_RECTANGLE', 'PARALLELOGRAM'];

export const addShapeCommand: Command = {
  name: 'add-shape',
  description: 'Add a shape to a slide',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
    { name: 'slide', description: 'Slide number or ID', required: true },
    { name: 'type', description: 'Shape type', required: true },
  ],
  options: [
    { name: 'x', type: 'number', description: 'X position (default: 100)' },
    { name: 'y', type: 'number', description: 'Y position (default: 100)' },
    { name: 'width', short: 'w', type: 'number', description: 'Width (default: 200)' },
    { name: 'height', short: 'h', type: 'number', description: 'Height (default: 150)' },
    { name: 'color', short: 'c', type: 'string', description: 'Fill color (hex or name)' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const slideArg = args.slide as string;
    const shapeType = (args.type as string).toUpperCase();

    if (!SHAPE_TYPES.includes(shapeType)) {
      output.error(`Invalid shape type. Valid types: ${SHAPE_TYPES.join(', ')}`);
      return;
    }

    const presentation = await gslides.getPresentation(presentationId);
    const slides = presentation.slides || [];

    let slideId: string;
    const slideNum = parseInt(slideArg, 10);
    if (!isNaN(slideNum) && slideNum > 0 && slideNum <= slides.length) {
      slideId = slides[slideNum - 1].objectId;
    } else {
      slideId = slideArg;
    }

    const fillColor = flags.color ? parseColor(flags.color as string) : undefined;

    const spinner = output.spinner('Adding shape...');
    try {
      const shapeId = await gslides.addShape(
        presentationId,
        slideId,
        shapeType as 'RECTANGLE',
        {
          x: flags.x as number,
          y: flags.y as number,
          width: flags.width as number,
          height: flags.height as number,
          fillColor,
        }
      );
      spinner.success(`Shape added: ${shapeType}`);

      if (globalFlags.json) {
        output.json({ presentationId, slideId, shapeId, shapeType });
        return;
      }

      output.text(`Shape ID: ${shapeId}`);
    } catch (error) {
      spinner.fail('Failed to add shape');
      throw error;
    }
  },
};

// Add line
export const addLineCommand: Command = {
  name: 'add-line',
  description: 'Add a line to a slide',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
    { name: 'slide', description: 'Slide number or ID', required: true },
  ],
  options: [
    { name: 'type', short: 't', type: 'string', description: 'Line type: STRAIGHT, BENT, CURVED (default: STRAIGHT)' },
    { name: 'startX', type: 'number', description: 'Start X (default: 50)' },
    { name: 'startY', type: 'number', description: 'Start Y (default: 100)' },
    { name: 'endX', type: 'number', description: 'End X (default: 300)' },
    { name: 'endY', type: 'number', description: 'End Y (default: 100)' },
    { name: 'color', short: 'c', type: 'string', description: 'Line color' },
    { name: 'weight', short: 'w', type: 'number', description: 'Line weight in PT' },
    { name: 'dash', short: 'd', type: 'string', description: 'Dash style: SOLID, DOT, DASH, DASH_DOT' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const slideArg = args.slide as string;
    const lineCategory = ((flags.type as string) || 'STRAIGHT').toUpperCase() as 'STRAIGHT' | 'BENT' | 'CURVED';

    const presentation = await gslides.getPresentation(presentationId);
    const slides = presentation.slides || [];

    let slideId: string;
    const slideNum = parseInt(slideArg, 10);
    if (!isNaN(slideNum) && slideNum > 0 && slideNum <= slides.length) {
      slideId = slides[slideNum - 1].objectId;
    } else {
      slideId = slideArg;
    }

    const lineColor = flags.color ? parseColor(flags.color as string) : undefined;

    const spinner = output.spinner('Adding line...');
    try {
      const lineId = await gslides.addLine(presentationId, slideId, lineCategory, {
        startX: flags.startX as number,
        startY: flags.startY as number,
        endX: flags.endX as number,
        endY: flags.endY as number,
        lineColor,
        weight: flags.weight as number,
        dashStyle: (flags.dash as string)?.toUpperCase() as 'SOLID' | 'DOT' | 'DASH',
      });
      spinner.success('Line added');

      if (globalFlags.json) {
        output.json({ presentationId, slideId, lineId, lineCategory });
        return;
      }

      output.text(`Line ID: ${lineId}`);
    } catch (error) {
      spinner.fail('Failed to add line');
      throw error;
    }
  },
};

// Add table
export const addTableCommand: Command = {
  name: 'add-table',
  description: 'Add a table to a slide',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
    { name: 'slide', description: 'Slide number or ID', required: true },
    { name: 'rows', description: 'Number of rows', required: true },
    { name: 'columns', description: 'Number of columns', required: true },
  ],
  options: [
    { name: 'x', type: 'number', description: 'X position (default: 50)' },
    { name: 'y', type: 'number', description: 'Y position (default: 100)' },
    { name: 'width', short: 'w', type: 'number', description: 'Width (default: 400)' },
    { name: 'height', short: 'h', type: 'number', description: 'Height (default: 200)' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const slideArg = args.slide as string;
    const rows = parseInt(args.rows as string, 10);
    const columns = parseInt(args.columns as string, 10);

    const presentation = await gslides.getPresentation(presentationId);
    const slides = presentation.slides || [];

    let slideId: string;
    const slideNum = parseInt(slideArg, 10);
    if (!isNaN(slideNum) && slideNum > 0 && slideNum <= slides.length) {
      slideId = slides[slideNum - 1].objectId;
    } else {
      slideId = slideArg;
    }

    const spinner = output.spinner('Adding table...');
    try {
      const tableId = await gslides.addTable(presentationId, slideId, rows, columns, {
        x: flags.x as number,
        y: flags.y as number,
        width: flags.width as number,
        height: flags.height as number,
      });
      spinner.success(`Table added: ${rows}x${columns}`);

      if (globalFlags.json) {
        output.json({ presentationId, slideId, tableId, rows, columns });
        return;
      }

      output.text(`Table ID: ${tableId}`);
    } catch (error) {
      spinner.fail('Failed to add table');
      throw error;
    }
  },
};

// Add video
export const addVideoCommand: Command = {
  name: 'add-video',
  description: 'Add a video to a slide (YouTube or Drive)',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
    { name: 'slide', description: 'Slide number or ID', required: true },
    { name: 'videoId', description: 'YouTube video ID or Drive file ID', required: true },
  ],
  options: [
    { name: 'source', short: 's', type: 'string', description: 'Source: YOUTUBE or DRIVE (default: YOUTUBE)' },
    { name: 'x', type: 'number', description: 'X position (default: 100)' },
    { name: 'y', type: 'number', description: 'Y position (default: 100)' },
    { name: 'width', short: 'w', type: 'number', description: 'Width (default: 400)' },
    { name: 'height', short: 'h', type: 'number', description: 'Height (default: 225)' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const slideArg = args.slide as string;
    const videoId = args.videoId as string;
    const source = ((flags.source as string) || 'YOUTUBE').toUpperCase() as 'YOUTUBE' | 'DRIVE';

    const presentation = await gslides.getPresentation(presentationId);
    const slides = presentation.slides || [];

    let slideId: string;
    const slideNum = parseInt(slideArg, 10);
    if (!isNaN(slideNum) && slideNum > 0 && slideNum <= slides.length) {
      slideId = slides[slideNum - 1].objectId;
    } else {
      slideId = slideArg;
    }

    const spinner = output.spinner('Adding video...');
    try {
      const objectId = await gslides.addVideo(presentationId, slideId, videoId, source, {
        x: flags.x as number,
        y: flags.y as number,
        width: flags.width as number,
        height: flags.height as number,
      });
      spinner.success('Video added');

      if (globalFlags.json) {
        output.json({ presentationId, slideId, objectId, videoId, source });
        return;
      }

      output.text(`Video ID: ${objectId}`);
    } catch (error) {
      spinner.fail('Failed to add video');
      throw error;
    }
  },
};

// Background
export const backgroundCommand: Command = {
  name: 'background',
  description: 'Set slide background color or image',
  args: [{ name: 'id', description: 'Presentation ID or URL', required: true }],
  options: [
    { name: 'slide', short: 's', type: 'string', description: 'Slide number (1-indexed). Default: all slides' },
    { name: 'color', short: 'c', type: 'string', description: 'Background color (hex or name)' },
    { name: 'image', short: 'i', type: 'string', description: 'Background image URL' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const slideNum = flags.slide ? parseInt(flags.slide as string, 10) : undefined;
    const color = flags.color as string | undefined;
    const imageUrl = flags.image as string | undefined;

    if (!color && !imageUrl) {
      output.error('Specify --color or --image for the background');
      return;
    }

    const spinner = output.spinner('Setting background...');
    try {
      const presentation = await gslides.getPresentation(presentationId);
      const slides = presentation.slides || [];

      if (slides.length === 0) {
        spinner.fail('Presentation has no slides');
        return;
      }

      let targetSlides: string[];
      if (slideNum) {
        const slideIndex = slideNum - 1;
        if (slideIndex < 0 || slideIndex >= slides.length) {
          spinner.fail(`Invalid slide number. Presentation has ${slides.length} slides.`);
          return;
        }
        targetSlides = [slides[slideIndex].objectId];
      } else {
        targetSlides = slides.map(s => s.objectId);
      }

      for (const slideId of targetSlides) {
        if (imageUrl) {
          await gslides.setSlideBackgroundImage(presentationId, slideId, imageUrl);
        } else if (color) {
          await gslides.setSlideBackgroundColor(presentationId, slideId, parseColor(color));
        }
      }

      const slideDesc = slideNum ? `slide ${slideNum}` : `${targetSlides.length} slides`;
      spinner.success(`Set background for ${slideDesc}`);

      if (globalFlags.json) {
        output.json({
          slides: slideNum || 'all',
          background: imageUrl ? { type: 'image', url: imageUrl } : { type: 'color', value: color },
        });
      }
    } catch (error) {
      spinner.fail('Failed to set background');
      throw error;
    }
  },
};

// Notes
export const notesCommand: Command = {
  name: 'notes',
  description: 'Get or set speaker notes for a slide',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
    { name: 'slide', description: 'Slide number (1-indexed) or slide ID', required: true },
  ],
  options: [
    { name: 'set', short: 's', type: 'string', description: 'Set speaker notes content' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const slideArg = args.slide as string;

    const presentation = await gslides.getPresentation(presentationId);
    const slides = presentation.slides || [];

    let slideId: string;
    const slideNum = parseInt(slideArg, 10);
    if (!isNaN(slideNum) && slideNum > 0 && slideNum <= slides.length) {
      slideId = slides[slideNum - 1].objectId;
    } else {
      slideId = slideArg;
    }

    if (flags.set) {
      const notes = flags.set as string;
      const spinner = output.spinner('Setting notes...');
      try {
        await gslides.setSpeakerNotes(presentationId, slideId, notes);
        spinner.success('Notes set');

        if (globalFlags.json) {
          output.json({ presentationId, slideId, notes });
        }
      } catch (error) {
        spinner.fail('Failed to set notes');
        throw error;
      }
    } else {
      const spinner = output.spinner('Fetching notes...');
      try {
        const notes = await gslides.getSpeakerNotes(presentationId, slideId);
        spinner.stop();

        if (globalFlags.json) {
          output.json({ presentationId, slideId, notes });
          return;
        }

        if (!notes) {
          output.info('No speaker notes for this slide.');
        } else {
          output.info(`Speaker notes:\n${notes}`);
        }
      } catch (error) {
        spinner.fail('Failed to fetch notes');
        throw error;
      }
    }
  },
};

// Reorder slides
export const reorderCommand: Command = {
  name: 'reorder',
  description: 'Move slides to a new position',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
    { name: 'slides', description: 'Slide numbers to move (comma-separated)', required: true },
    { name: 'position', description: 'New position (1-indexed)', required: true },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const slidesArg = args.slides as string;
    const position = parseInt(args.position as string, 10);

    const presentation = await gslides.getPresentation(presentationId);
    const slides = presentation.slides || [];

    const slideNums = slidesArg.split(',').map(s => parseInt(s.trim(), 10));
    const slideIds = slideNums.map(num => {
      if (num > 0 && num <= slides.length) {
        return slides[num - 1].objectId;
      }
      throw new Error(`Invalid slide number: ${num}`);
    });

    const spinner = output.spinner('Reordering slides...');
    try {
      await gslides.reorderSlides(presentationId, slideIds, position - 1);
      spinner.success(`Moved ${slideIds.length} slide(s) to position ${position}`);

      if (globalFlags.json) {
        output.json({ presentationId, slideIds, newPosition: position });
      }
    } catch (error) {
      spinner.fail('Failed to reorder slides');
      throw error;
    }
  },
};

// Format text
export const formatTextCommand: Command = {
  name: 'format-text',
  description: 'Format text in a shape',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
    { name: 'shape', description: 'Shape/text box ID', required: true },
  ],
  options: [
    { name: 'bold', short: 'b', type: 'boolean', description: 'Make text bold' },
    { name: 'italic', short: 'i', type: 'boolean', description: 'Make text italic' },
    { name: 'underline', short: 'u', type: 'boolean', description: 'Underline text' },
    { name: 'size', short: 's', type: 'number', description: 'Font size in PT' },
    { name: 'color', short: 'c', type: 'string', description: 'Text color (hex or name)' },
    { name: 'font', short: 'f', type: 'string', description: 'Font family' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const shapeId = args.shape as string;

    const style: {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      fontSize?: number;
      foregroundColor?: { red: number; green: number; blue: number };
      fontFamily?: string;
    } = {};

    if (flags.bold !== undefined) style.bold = flags.bold as boolean;
    if (flags.italic !== undefined) style.italic = flags.italic as boolean;
    if (flags.underline !== undefined) style.underline = flags.underline as boolean;
    if (flags.size) style.fontSize = flags.size as number;
    if (flags.color) style.foregroundColor = parseColor(flags.color as string);
    if (flags.font) style.fontFamily = flags.font as string;

    if (Object.keys(style).length === 0) {
      output.error('Specify at least one formatting option');
      return;
    }

    const spinner = output.spinner('Formatting text...');
    try {
      await gslides.updateTextStyle(presentationId, shapeId, style);
      spinner.success('Text formatted');

      if (globalFlags.json) {
        output.json({ presentationId, shapeId, style });
      }
    } catch (error) {
      spinner.fail('Failed to format text');
      throw error;
    }
  },
};

// Transform element
export const transformCommand: Command = {
  name: 'transform',
  description: 'Move or resize an element',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
    { name: 'element', description: 'Element ID', required: true },
  ],
  options: [
    { name: 'x', type: 'number', description: 'X position' },
    { name: 'y', type: 'number', description: 'Y position' },
    { name: 'scaleX', type: 'number', description: 'X scale factor' },
    { name: 'scaleY', type: 'number', description: 'Y scale factor' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const elementId = args.element as string;

    const transform = {
      x: flags.x as number | undefined,
      y: flags.y as number | undefined,
      scaleX: flags.scaleX as number | undefined,
      scaleY: flags.scaleY as number | undefined,
    };

    const spinner = output.spinner('Transforming element...');
    try {
      await gslides.transformElement(presentationId, elementId, transform);
      spinner.success('Element transformed');

      if (globalFlags.json) {
        output.json({ presentationId, elementId, transform });
      }
    } catch (error) {
      spinner.fail('Failed to transform element');
      throw error;
    }
  },
};

// Link
export const linkCommand: Command = {
  name: 'link',
  description: 'Add a link to text in a shape',
  args: [
    { name: 'id', description: 'Presentation ID or URL', required: true },
    { name: 'shape', description: 'Shape ID', required: true },
    { name: 'url', description: 'Link URL', required: true },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.id as string);
    const shapeId = args.shape as string;
    const url = args.url as string;

    const spinner = output.spinner('Adding link...');
    try {
      await gslides.addLink(presentationId, shapeId, url);
      spinner.success('Link added');

      if (globalFlags.json) {
        output.json({ presentationId, shapeId, url });
      }
    } catch (error) {
      spinner.fail('Failed to add link');
      throw error;
    }
  },
};

// Group elements
export const groupCommand: Command = {
  name: 'group',
  description: 'Group or ungroup elements',
  args: [
    { name: 'action', description: 'group or ungroup', required: true },
    { name: 'id', description: 'Presentation ID or URL', required: true },
  ],
  options: [
    { name: 'elements', short: 'e', type: 'string', description: 'Element IDs to group (comma-separated)' },
    { name: 'groupId', short: 'g', type: 'string', description: 'Group ID to ungroup' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const action = args.action as string;
    const presentationId = extractPresentationId(args.id as string);

    if (action === 'group') {
      const elementsArg = flags.elements as string;
      if (!elementsArg) {
        output.error('Specify elements to group with --elements "id1,id2,..."');
        return;
      }

      const elementIds = elementsArg.split(',').map(s => s.trim());
      if (elementIds.length < 2) {
        output.error('At least 2 elements are required to create a group');
        return;
      }

      const spinner = output.spinner('Grouping elements...');
      try {
        const groupId = await gslides.groupElements(presentationId, elementIds);
        spinner.success(`Grouped ${elementIds.length} elements`);

        if (globalFlags.json) {
          output.json({ presentationId, groupId, elementIds });
          return;
        }

        output.text(`Group ID: ${groupId}`);
      } catch (error) {
        spinner.fail('Failed to group elements');
        throw error;
      }
    } else if (action === 'ungroup') {
      const groupId = flags.groupId as string;
      if (!groupId) {
        output.error('Specify group ID with --groupId');
        return;
      }

      const spinner = output.spinner('Ungrouping elements...');
      try {
        await gslides.ungroupElements(presentationId, groupId);
        spinner.success('Elements ungrouped');

        if (globalFlags.json) {
          output.json({ presentationId, groupId, ungrouped: true });
        }
      } catch (error) {
        spinner.fail('Failed to ungroup elements');
        throw error;
      }
    } else {
      output.error('Action must be: group or ungroup');
    }
  },
};

// Comments
export const commentsCommand: Command = {
  name: 'comments',
  description: 'List, add, resolve, or delete comments',
  args: [
    { name: 'action', description: 'list, add, resolve, unresolve, or delete', required: true },
    { name: 'presentation', description: 'Presentation ID or URL', required: true },
  ],
  options: [
    { name: 'content', short: 'c', description: 'Comment content (for add)', type: 'string' },
    { name: 'id', description: 'Comment ID (for resolve/delete)', type: 'string' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const action = args.action as string;
    const presentationId = extractPresentationId(args.presentation as string);

    if (action === 'list') {
      const spinner = output.spinner('Fetching comments...');
      try {
        const comments = await gslides.listComments(presentationId);
        spinner.stop();

        if (globalFlags.json) {
          output.json(comments);
          return;
        }

        if (comments.length === 0) {
          output.info('No comments found.');
          return;
        }

        output.info('');
        for (const comment of comments) {
          const status = comment.resolved ? c.green('[Resolved]') : c.yellow('[Open]');
          output.info(`${status} ${c.bold(comment.author.displayName)}`);
          output.info(`  ${comment.content}`);
          output.info(`  ${c.dim(comment.id)} - ${c.dim(new Date(comment.createdTime).toLocaleString())}`);
          output.info('');
        }
      } catch (error) {
        spinner.fail('Failed to fetch comments');
        throw error;
      }
    } else if (action === 'add') {
      const content = flags.content as string;
      if (!content) {
        output.error('Content is required. Use -c "your comment"');
        return;
      }

      const spinner = output.spinner('Adding comment...');
      try {
        const result = await gslides.addComment(presentationId, content);
        spinner.stop();

        if (globalFlags.json) {
          output.json(result);
          return;
        }

        output.success(`Comment added (ID: ${result.id})`);
      } catch (error) {
        spinner.fail('Failed to add comment');
        throw error;
      }
    } else if (action === 'resolve' || action === 'unresolve') {
      const commentId = flags.id as string;
      if (!commentId) {
        output.error('Comment ID is required. Use --id COMMENT_ID');
        return;
      }

      const resolve = action === 'resolve';
      const spinner = output.spinner(`${resolve ? 'Resolving' : 'Unresolving'} comment...`);
      try {
        await gslides.resolveComment(presentationId, commentId, resolve);
        spinner.stop();

        if (globalFlags.json) {
          output.json({ success: true, commentId, resolved: resolve });
          return;
        }

        output.success(`Comment ${resolve ? 'resolved' : 'unresolved'}`);
      } catch (error) {
        spinner.fail(`Failed to ${action} comment`);
        throw error;
      }
    } else if (action === 'delete') {
      const commentId = flags.id as string;
      if (!commentId) {
        output.error('Comment ID is required. Use --id COMMENT_ID');
        return;
      }

      const spinner = output.spinner('Deleting comment...');
      try {
        await gslides.deleteComment(presentationId, commentId);
        spinner.stop();

        if (globalFlags.json) {
          output.json({ success: true, commentId });
          return;
        }

        output.success('Comment deleted');
      } catch (error) {
        spinner.fail('Failed to delete comment');
        throw error;
      }
    } else {
      output.error('Action must be: list, add, resolve, unresolve, or delete');
    }
  },
};

// ============================================================
// CHART COMMAND (from Google Sheets)
// ============================================================

export const chartCommand: Command = {
  name: 'chart',
  description: 'Insert a chart from Google Sheets into a slide',
  args: [
    { name: 'presentation', description: 'Presentation ID or URL', required: true },
    { name: 'spreadsheet', description: 'Spreadsheet ID or URL containing the chart', required: true },
    { name: 'chartId', description: 'Chart ID from the spreadsheet (use "uni gsheets charts" to find)', required: true },
  ],
  options: [
    { name: 'slide', short: 's', type: 'string', description: 'Slide number (1-indexed, default: 1)' },
    { name: 'x', type: 'number', description: 'X position in points (default: 100)' },
    { name: 'y', type: 'number', description: 'Y position in points (default: 100)' },
    { name: 'width', short: 'w', type: 'number', description: 'Width in points (default: 400)' },
    { name: 'height', short: 'h', type: 'number', description: 'Height in points (default: 300)' },
    { name: 'refresh', short: 'r', type: 'string', description: 'Refresh existing chart by element ID instead of inserting' },
  ],
  examples: [
    'uni gslides chart <presentation-id> <spreadsheet-id> 123456789',
    'uni gslides chart <presentation-id> <spreadsheet-id> 123456789 --slide 2',
    'uni gslides chart <presentation-id> <spreadsheet-id> 123456789 --width 600 --height 400',
    'uni gslides chart <presentation-id> --refresh <chart-element-id>',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.presentation as string);
    const refreshElementId = flags.refresh as string | undefined;

    // Refresh existing chart
    if (refreshElementId) {
      const spinner = output.spinner('Refreshing chart...');
      try {
        await gslides.refreshChart(presentationId, refreshElementId);
        spinner.success('Chart refreshed');
        if (globalFlags.json) {
          output.json({ refreshed: true, elementId: refreshElementId });
        }
      } catch (error) {
        spinner.fail('Failed to refresh chart');
        throw error;
      }
      return;
    }

    // Insert new chart
    const spreadsheetId = extractPresentationId(args.spreadsheet as string); // works for sheets URLs too
    const chartId = parseInt(args.chartId as string, 10);

    if (isNaN(chartId)) {
      output.error('Chart ID must be a number. Use "uni gsheets charts <spreadsheet-id>" to find chart IDs.');
      return;
    }

    const slideNum = parseInt(flags.slide as string || '1', 10);
    const x = flags.x as number | undefined;
    const y = flags.y as number | undefined;
    const width = flags.width as number | undefined;
    const height = flags.height as number | undefined;

    const spinner = output.spinner('Inserting chart from Sheets...');

    try {
      const presentation = await gslides.getPresentation(presentationId);
      const slides = presentation.slides || [];

      if (slideNum < 1 || slideNum > slides.length) {
        spinner.fail(`Invalid slide number. Presentation has ${slides.length} slide(s).`);
        return;
      }

      const slideId = slides[slideNum - 1].objectId;

      const elementId = await gslides.insertChart(
        presentationId,
        slideId,
        spreadsheetId,
        chartId,
        x !== undefined || y !== undefined ? { x: x ?? 100, y: y ?? 100 } : undefined,
        width !== undefined || height !== undefined ? { width: width ?? 400, height: height ?? 300 } : undefined
      );

      spinner.success(`Chart inserted on slide ${slideNum}`);

      if (globalFlags.json) {
        output.json({
          elementId,
          slideNumber: slideNum,
          spreadsheetId,
          chartId,
        });
      } else {
        console.log(`Element ID: ${elementId}`);
        console.log(`Use --refresh ${elementId} to update the chart later`);
      }
    } catch (error) {
      spinner.fail('Failed to insert chart');
      throw error;
    }
  },
};

// ============================================================
// AUTH COMMAND
// ============================================================

export const authCommand = createGoogleAuthCommand({
  serviceName: 'Slides',
  serviceKey: 'gslides',
  client: gslides,
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function parseColor(color: string): { red: number; green: number; blue: number } {
  const colors: Record<string, { red: number; green: number; blue: number }> = {
    black: { red: 0, green: 0, blue: 0 },
    white: { red: 1, green: 1, blue: 1 },
    red: { red: 1, green: 0, blue: 0 },
    green: { red: 0, green: 0.8, blue: 0 },
    blue: { red: 0, green: 0, blue: 1 },
    yellow: { red: 1, green: 1, blue: 0 },
    cyan: { red: 0, green: 1, blue: 1 },
    gray: { red: 0.5, green: 0.5, blue: 0.5 },
    lightgray: { red: 0.9, green: 0.9, blue: 0.9 },
    darkgray: { red: 0.3, green: 0.3, blue: 0.3 },
    orange: { red: 1, green: 0.65, blue: 0 },
    purple: { red: 0.5, green: 0, blue: 0.5 },
    navy: { red: 0, green: 0, blue: 0.5 },
  };

  const lower = color.toLowerCase();
  if (colors[lower]) return colors[lower];

  const hex = color.replace('#', '');
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return {
      red: parseInt(hex.slice(0, 2), 16) / 255,
      green: parseInt(hex.slice(2, 4), 16) / 255,
      blue: parseInt(hex.slice(4, 6), 16) / 255,
    };
  }

  return { red: 1, green: 1, blue: 1 };
}

// ============================================================
// EXPORT ALL COMMANDS
// ============================================================

export const commands = [
  ...simpleCommands,
  listCommand,
  getCommand,
  copyCommand,
  shareCommand,
  moveCommand,
  versionsCommand,
  addSlideCommand,
  deleteSlideCommand,
  duplicateSlideCommand,
  clearSlideCommand,
  replaceTextCommand,
  exportCommand,
  addTextCommand,
  addImageCommand,
  addShapeCommand,
  addLineCommand,
  addTableCommand,
  addVideoCommand,
  backgroundCommand,
  notesCommand,
  reorderCommand,
  formatTextCommand,
  transformCommand,
  linkCommand,
  groupCommand,
  commentsCommand,
  chartCommand,
  authCommand,
];
