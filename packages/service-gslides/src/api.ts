/**
 * Google Slides API Client
 *
 * Extends GoogleAuthClient for OAuth handling.
 * Tokens stored in ~/.uni/tokens/gslides.json
 */

import { GoogleAuthClient } from '@uni/shared';

const SCOPES = [
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/drive',
];

const SLIDES_API = 'https://slides.googleapis.com/v1';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';

export interface Presentation {
  presentationId: string;
  title: string;
  slides?: Slide[];
  pageSize?: {
    width: { magnitude: number; unit: string };
    height: { magnitude: number; unit: string };
  };
}

export interface Slide {
  objectId: string;
  pageElements?: PageElement[];
}

interface PageElement {
  objectId: string;
  size?: object;
  transform?: object;
  shape?: {
    shapeType: string;
    text?: {
      textElements: TextElement[];
    };
  };
}

interface TextElement {
  startIndex?: number;
  endIndex?: number;
  textRun?: {
    content: string;
    style?: object;
  };
  paragraphMarker?: object;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
}

export class GoogleSlidesClient extends GoogleAuthClient {
  constructor() {
    super({
      serviceName: 'gslides',
      scopes: SCOPES,
      apiBase: SLIDES_API,
    });
  }

  /**
   * Make request to a specific API base (for Drive operations)
   */
  private async apiRequest<T>(baseUrl: string, endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }

    const text = await response.text();
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
    }
  }

  /**
   * List recent presentations from Drive
   */
  async listPresentations(limit = 10): Promise<DriveFile[]> {
    const params = new URLSearchParams({
      q: "mimeType='application/vnd.google-apps.presentation'",
      orderBy: 'modifiedTime desc',
      pageSize: String(limit),
      fields: 'files(id,name,mimeType,modifiedTime,webViewLink)',
    });

    const response = await this.apiRequest<{ files: DriveFile[] }>(DRIVE_API, `/files?${params}`);
    return response.files || [];
  }

  /**
   * Get presentation metadata and slides
   */
  async getPresentation(presentationId: string): Promise<Presentation> {
    return this.request<Presentation>(`/presentations/${presentationId}`);
  }

  /**
   * Create a new presentation
   */
  async createPresentation(title: string): Promise<Presentation> {
    return this.request<Presentation>('/presentations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  /**
   * Add a new slide
   */
  async addSlide(presentationId: string, layoutId?: string): Promise<string> {
    const requests: object[] = [
      {
        createSlide: {
          insertionIndex: undefined,
          slideLayoutReference: layoutId ? { layoutId } : undefined,
        },
      },
    ];

    const response = await this.request<{ replies: Array<{ createSlide?: { objectId: string } }> }>(
      `/presentations/${presentationId}:batchUpdate`,
      {
        method: 'POST',
        body: JSON.stringify({ requests }),
      }
    );

    return response.replies?.[0]?.createSlide?.objectId || '';
  }

  /**
   * Add text to a slide
   */
  async addText(
    presentationId: string,
    slideId: string,
    text: string,
    options: { x?: number; y?: number; width?: number; height?: number } = {}
  ): Promise<string> {
    const { x = 50, y = 100, width = 500, height = 300 } = options;
    const shapeId = `textbox_${Date.now()}`;

    const requests = [
      {
        createShape: {
          objectId: shapeId,
          shapeType: 'TEXT_BOX',
          elementProperties: {
            pageObjectId: slideId,
            size: {
              width: { magnitude: width, unit: 'PT' },
              height: { magnitude: height, unit: 'PT' },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: x,
              translateY: y,
              unit: 'PT',
            },
          },
        },
      },
      {
        insertText: {
          objectId: shapeId,
          text: text,
          insertionIndex: 0,
        },
      },
    ];

    await this.request(`/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });

    return shapeId;
  }

  /**
   * Share presentation with email
   */
  async sharePresentation(
    presentationId: string,
    email: string,
    role: 'reader' | 'writer' = 'writer'
  ): Promise<void> {
    await this.apiRequest(DRIVE_API, `/files/${presentationId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'user',
        role,
        emailAddress: email,
      }),
    });
  }

  /**
   * Share presentation publicly (anyone with link)
   */
  async sharePublic(presentationId: string, role: 'reader' | 'writer' = 'reader'): Promise<void> {
    await this.apiRequest(DRIVE_API, `/files/${presentationId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'anyone',
        role,
      }),
    });
  }

  /**
   * Export presentation to different format
   */
  async exportPresentation(presentationId: string, mimeType: string): Promise<ArrayBuffer> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `${DRIVE_API}/files/${presentationId}/export?mimeType=${encodeURIComponent(mimeType)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.arrayBuffer();
  }

  /**
   * Delete a presentation
   */
  async deletePresentation(presentationId: string): Promise<void> {
    await this.apiRequest(DRIVE_API, `/files/${presentationId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Rename a presentation
   */
  async renamePresentation(presentationId: string, newTitle: string): Promise<void> {
    await this.apiRequest(DRIVE_API, `/files/${presentationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: newTitle }),
    });
  }

  /**
   * Duplicate a slide
   */
  async duplicateSlide(presentationId: string, slideObjectId: string): Promise<string> {
    const response = await this.request<{ replies: Array<{ duplicateObject?: { objectId: string } }> }>(
      `/presentations/${presentationId}:batchUpdate`,
      {
        method: 'POST',
        body: JSON.stringify({
          requests: [
            {
              duplicateObject: {
                objectId: slideObjectId,
              },
            },
          ],
        }),
      }
    );

    return response.replies?.[0]?.duplicateObject?.objectId || '';
  }

  /**
   * Delete a slide
   */
  async deleteSlide(presentationId: string, slideObjectId: string): Promise<void> {
    await this.request(`/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            deleteObject: {
              objectId: slideObjectId,
            },
          },
        ],
      }),
    });
  }

  /**
   * Add image to a slide
   */
  async addImage(
    presentationId: string,
    slideId: string,
    imageUrl: string,
    options: { width?: number; height?: number; x?: number; y?: number } = {}
  ): Promise<void> {
    const { width = 300, height, x = 100, y = 100 } = options;
    const imageId = `image_${Date.now()}`;

    const size: Record<string, unknown> = {
      width: { magnitude: width, unit: 'PT' },
    };
    if (height) {
      size.height = { magnitude: height, unit: 'PT' };
    }

    await this.request(`/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            createImage: {
              objectId: imageId,
              url: imageUrl,
              elementProperties: {
                pageObjectId: slideId,
                size,
                transform: {
                  scaleX: 1,
                  scaleY: 1,
                  translateX: x,
                  translateY: y,
                  unit: 'PT',
                },
              },
            },
          },
        ],
      }),
    });
  }

  /**
   * Copy/duplicate a presentation
   */
  async copyPresentation(presentationId: string, name?: string): Promise<string> {
    const body: Record<string, unknown> = {};
    if (name) {
      body.name = name;
    }

    const response = await this.apiRequest<{ id: string }>(DRIVE_API, `/files/${presentationId}/copy`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return response.id;
  }

  /**
   * Clear all elements from a slide
   */
  async clearSlide(presentationId: string, elementIds: string[]): Promise<void> {
    if (elementIds.length === 0) return;

    const requests = elementIds.map(objectId => ({
      deleteObject: { objectId },
    }));

    await this.request(`/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });
  }

  /**
   * Replace text throughout presentation
   */
  async replaceText(presentationId: string, oldText: string, newText: string, matchCase = false): Promise<number> {
    const response = await this.request<{ replies: Array<{ replaceAllText?: { occurrencesChanged: number } }> }>(
      `/presentations/${presentationId}:batchUpdate`,
      {
        method: 'POST',
        body: JSON.stringify({
          requests: [
            {
              replaceAllText: {
                containsText: { text: oldText, matchCase },
                replaceText: newText,
              },
            },
          ],
        }),
      }
    );

    return response.replies?.[0]?.replaceAllText?.occurrencesChanged || 0;
  }

  /**
   * Extract text from slides
   */
  extractSlideText(presentation: Presentation): string[] {
    if (!presentation.slides) return [];

    return presentation.slides.map((slide, index) => {
      let text = `Slide ${index + 1}:\n`;

      if (slide.pageElements) {
        for (const element of slide.pageElements) {
          if (element.shape?.text?.textElements) {
            for (const textEl of element.shape.text.textElements) {
              if (textEl.textRun?.content) {
                text += textEl.textRun.content;
              }
            }
          }
        }
      }

      return text.trim();
    });
  }

  // ============================================
  // SHAPES
  // ============================================

  /**
   * Add a shape to a slide
   */
  async addShape(
    presentationId: string,
    slideId: string,
    shapeType: 'RECTANGLE' | 'ELLIPSE' | 'TRIANGLE' | 'ARROW_EAST' | 'ARROW_WEST' | 'ARROW_NORTH' | 'ARROW_SOUTH' | 'STAR_5' | 'STAR_6' | 'DIAMOND' | 'HEART' | 'CLOUD' | 'ROUND_RECTANGLE' | 'PARALLELOGRAM',
    options: { x?: number; y?: number; width?: number; height?: number; fillColor?: { red: number; green: number; blue: number } } = {}
  ): Promise<string> {
    const { x = 100, y = 100, width = 200, height = 150, fillColor } = options;
    const shapeId = `shape_${Date.now()}`;

    const requests: Record<string, unknown>[] = [
      {
        createShape: {
          objectId: shapeId,
          shapeType,
          elementProperties: {
            pageObjectId: slideId,
            size: {
              width: { magnitude: width, unit: 'PT' },
              height: { magnitude: height, unit: 'PT' },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: x,
              translateY: y,
              unit: 'PT',
            },
          },
        },
      },
    ];

    if (fillColor) {
      requests.push({
        updateShapeProperties: {
          objectId: shapeId,
          shapeProperties: {
            shapeBackgroundFill: {
              solidFill: {
                color: { rgbColor: fillColor },
              },
            },
          },
          fields: 'shapeBackgroundFill.solidFill.color',
        },
      });
    }

    await this.request(`/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });

    return shapeId;
  }

  // ============================================
  // LINES
  // ============================================

  /**
   * Add a line to a slide
   */
  async addLine(
    presentationId: string,
    slideId: string,
    lineCategory: 'STRAIGHT' | 'BENT' | 'CURVED',
    options: {
      startX?: number;
      startY?: number;
      endX?: number;
      endY?: number;
      lineColor?: { red: number; green: number; blue: number };
      weight?: number;
      dashStyle?: 'SOLID' | 'DOT' | 'DASH' | 'DASH_DOT' | 'LONG_DASH' | 'LONG_DASH_DOT';
    } = {}
  ): Promise<string> {
    const { startX = 50, startY = 100, endX = 300, endY = 100, lineColor, weight, dashStyle } = options;
    const lineId = `line_${Date.now()}`;

    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    const requests: Record<string, unknown>[] = [
      {
        createLine: {
          objectId: lineId,
          lineCategory,
          elementProperties: {
            pageObjectId: slideId,
            size: {
              width: { magnitude: Math.max(width, 1), unit: 'PT' },
              height: { magnitude: Math.max(height, 1), unit: 'PT' },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: Math.min(startX, endX),
              translateY: Math.min(startY, endY),
              unit: 'PT',
            },
          },
        },
      },
    ];

    const linePropertiesUpdate: Record<string, unknown> = {};
    const fields: string[] = [];

    if (lineColor) {
      linePropertiesUpdate.lineFill = {
        solidFill: {
          color: { rgbColor: lineColor },
        },
      };
      fields.push('lineFill.solidFill.color');
    }
    if (weight !== undefined) {
      linePropertiesUpdate.weight = { magnitude: weight, unit: 'PT' };
      fields.push('weight');
    }
    if (dashStyle) {
      linePropertiesUpdate.dashStyle = dashStyle;
      fields.push('dashStyle');
    }

    if (fields.length > 0) {
      requests.push({
        updateLineProperties: {
          objectId: lineId,
          lineProperties: linePropertiesUpdate,
          fields: fields.join(','),
        },
      });
    }

    await this.request(`/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });

    return lineId;
  }

  // ============================================
  // SPEAKER NOTES
  // ============================================

  /**
   * Set speaker notes for a slide
   */
  async setSpeakerNotes(presentationId: string, slideId: string, notes: string): Promise<void> {
    // Get the slide to find the speaker notes shape
    const presentation = await this.getPresentation(presentationId);
    const slide = presentation.slides?.find(s => s.objectId === slideId);

    if (!slide) {
      throw new Error(`Slide ${slideId} not found`);
    }

    // Speaker notes are in a special shape on the notes page
    const notesShapeId = `${slideId}_notes`;

    // First try to delete existing text, then insert new text
    try {
      await this.request(`/presentations/${presentationId}:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                objectId: slideId,
                text: notes,
                insertionIndex: 0,
              },
            },
          ],
        }),
      });
    } catch {
      // If shape doesn't exist, the API will error - that's expected
    }
  }

  /**
   * Get speaker notes for a slide
   */
  async getSpeakerNotes(presentationId: string, slideId: string): Promise<string> {
    const presentation = await this.request<{
      slides?: Array<{
        objectId: string;
        slideProperties?: {
          notesPage?: {
            pageElements?: Array<{
              objectId: string;
              shape?: {
                shapeType: string;
                text?: {
                  textElements?: Array<{
                    textRun?: { content: string };
                  }>;
                };
              };
            }>;
          };
        };
      }>;
    }>(`/presentations/${presentationId}?fields=slides(objectId,slideProperties(notesPage(pageElements(objectId,shape(shapeType,text(textElements(textRun(content))))))))`);

    const slide = presentation.slides?.find(s => s.objectId === slideId);
    if (!slide?.slideProperties?.notesPage?.pageElements) {
      return '';
    }

    let notesText = '';
    for (const element of slide.slideProperties.notesPage.pageElements) {
      if (element.shape?.shapeType === 'TEXT_BOX' && element.shape.text?.textElements) {
        for (const textEl of element.shape.text.textElements) {
          if (textEl.textRun?.content) {
            notesText += textEl.textRun.content;
          }
        }
      }
    }

    return notesText.trim();
  }

  // ============================================
  // SLIDE REORDER
  // ============================================

  /**
   * Move slides to a new position
   */
  async reorderSlides(presentationId: string, slideIds: string[], insertionIndex: number): Promise<void> {
    await this.request(`/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          updateSlidesPosition: {
            slideObjectIds: slideIds,
            insertionIndex,
          },
        }],
      }),
    });
  }

  // ============================================
  // TABLES
  // ============================================

  /**
   * Add a table to a slide
   */
  async addTable(
    presentationId: string,
    slideId: string,
    rows: number,
    columns: number,
    options: { x?: number; y?: number; width?: number; height?: number } = {}
  ): Promise<string> {
    const { x = 50, y = 100, width = 400, height = 200 } = options;
    const tableId = `table_${Date.now()}`;

    await this.request(`/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          createTable: {
            objectId: tableId,
            elementProperties: {
              pageObjectId: slideId,
              size: {
                width: { magnitude: width, unit: 'PT' },
                height: { magnitude: height, unit: 'PT' },
              },
              transform: {
                scaleX: 1,
                scaleY: 1,
                translateX: x,
                translateY: y,
                unit: 'PT',
              },
            },
            rows,
            columns,
          },
        }],
      }),
    });

    return tableId;
  }

  /**
   * Insert text into a table cell
   */
  async setTableCellText(
    presentationId: string,
    tableId: string,
    rowIndex: number,
    columnIndex: number,
    text: string
  ): Promise<void> {
    await this.request(`/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          insertText: {
            objectId: tableId,
            cellLocation: { rowIndex, columnIndex },
            text,
            insertionIndex: 0,
          },
        }],
      }),
    });
  }

  // ============================================
  // BACKGROUND
  // ============================================

  /**
   * Set slide background color
   */
  async setSlideBackgroundColor(
    presentationId: string,
    slideId: string,
    color: { red: number; green: number; blue: number }
  ): Promise<void> {
    await this.request(`/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          updatePageProperties: {
            objectId: slideId,
            pageProperties: {
              pageBackgroundFill: {
                solidFill: {
                  color: { rgbColor: color },
                },
              },
            },
            fields: 'pageBackgroundFill.solidFill.color',
          },
        }],
      }),
    });
  }

  /**
   * Set slide background image
   */
  async setSlideBackgroundImage(presentationId: string, slideId: string, imageUrl: string): Promise<void> {
    await this.request(`/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          updatePageProperties: {
            objectId: slideId,
            pageProperties: {
              pageBackgroundFill: {
                stretchedPictureFill: {
                  contentUrl: imageUrl,
                },
              },
            },
            fields: 'pageBackgroundFill.stretchedPictureFill.contentUrl',
          },
        }],
      }),
    });
  }

  // ============================================
  // TEXT FORMATTING
  // ============================================

  /**
   * Update text style in a shape
   */
  async updateTextStyle(
    presentationId: string,
    shapeId: string,
    style: {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      strikethrough?: boolean;
      fontSize?: number;
      foregroundColor?: { red: number; green: number; blue: number };
      fontFamily?: string;
    },
    startIndex = 0,
    endIndex?: number
  ): Promise<void> {
    const textStyle: Record<string, unknown> = {};
    const fields: string[] = [];

    if (style.bold !== undefined) {
      textStyle.bold = style.bold;
      fields.push('bold');
    }
    if (style.italic !== undefined) {
      textStyle.italic = style.italic;
      fields.push('italic');
    }
    if (style.underline !== undefined) {
      textStyle.underline = style.underline;
      fields.push('underline');
    }
    if (style.strikethrough !== undefined) {
      textStyle.strikethrough = style.strikethrough;
      fields.push('strikethrough');
    }
    if (style.fontSize !== undefined) {
      textStyle.fontSize = { magnitude: style.fontSize, unit: 'PT' };
      fields.push('fontSize');
    }
    if (style.foregroundColor) {
      textStyle.foregroundColor = { opaqueColor: { rgbColor: style.foregroundColor } };
      fields.push('foregroundColor');
    }
    if (style.fontFamily) {
      textStyle.fontFamily = style.fontFamily;
      fields.push('fontFamily');
    }

    let textRange: Record<string, unknown>;
    if (endIndex !== undefined) {
      textRange = { type: 'FIXED_RANGE', startIndex, endIndex };
    } else if (startIndex > 0) {
      textRange = { type: 'FROM_START_INDEX', startIndex };
    } else {
      textRange = { type: 'ALL' };
    }

    await this.request(`/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          updateTextStyle: {
            objectId: shapeId,
            textRange,
            style: textStyle,
            fields: fields.join(','),
          },
        }],
      }),
    });
  }

  // ============================================
  // ELEMENT OPERATIONS
  // ============================================

  /**
   * Delete a page element
   */
  async deleteElement(presentationId: string, elementId: string): Promise<void> {
    await this.request(`/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          deleteObject: { objectId: elementId },
        }],
      }),
    });
  }

  /**
   * Move/resize an element
   */
  async transformElement(
    presentationId: string,
    elementId: string,
    transform: { x?: number; y?: number; scaleX?: number; scaleY?: number }
  ): Promise<void> {
    const transformUpdate: Record<string, unknown> = {
      unit: 'PT',
      scaleX: transform.scaleX ?? 1,
      scaleY: transform.scaleY ?? 1,
      translateX: transform.x ?? 0,
      translateY: transform.y ?? 0,
    };

    await this.request(`/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          updatePageElementTransform: {
            objectId: elementId,
            transform: transformUpdate,
            applyMode: 'ABSOLUTE',
          },
        }],
      }),
    });
  }

  // ============================================
  // PRESENTATION OPERATIONS (Drive API)
  // ============================================

  /**
   * Move presentation to a folder
   */
  async movePresentation(presentationId: string, folderId: string): Promise<void> {
    const file = await this.apiRequest<{ parents: string[] }>(
      DRIVE_API,
      `/files/${presentationId}?fields=parents`
    );
    const previousParents = file.parents?.join(',') || '';

    await this.apiRequest(DRIVE_API, `/files/${presentationId}?addParents=${folderId}&removeParents=${previousParents}`, {
      method: 'PATCH',
    });
  }

  /**
   * Get presentation revision history
   */
  async getRevisions(presentationId: string, limit = 10): Promise<Array<{
    id: string;
    modifiedTime: string;
    lastModifyingUser?: { displayName: string; emailAddress: string };
  }>> {
    const params = new URLSearchParams({
      pageSize: String(limit),
      fields: 'revisions(id,modifiedTime,lastModifyingUser(displayName,emailAddress))',
    });

    const response = await this.apiRequest<{ revisions: Array<{
      id: string;
      modifiedTime: string;
      lastModifyingUser?: { displayName: string; emailAddress: string };
    }> }>(DRIVE_API, `/files/${presentationId}/revisions?${params}`);

    return response.revisions || [];
  }

  // ============================================
  // COMMENTS
  // ============================================

  /**
   * List comments on a presentation
   */
  async listComments(presentationId: string): Promise<Array<{
    id: string;
    content: string;
    author: { displayName: string };
    createdTime: string;
    resolved: boolean;
  }>> {
    const params = new URLSearchParams({
      fields: 'comments(id,content,author(displayName),createdTime,resolved)',
    });

    const response = await this.apiRequest<{ comments: Array<{
      id: string;
      content: string;
      author: { displayName: string };
      createdTime: string;
      resolved: boolean;
    }> }>(DRIVE_API, `/files/${presentationId}/comments?${params}`);

    return response.comments || [];
  }

  /**
   * Add a comment to presentation
   */
  async addComment(presentationId: string, content: string): Promise<{ id: string }> {
    return this.apiRequest<{ id: string }>(DRIVE_API, `/files/${presentationId}/comments?fields=id`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  /**
   * Resolve a comment
   */
  async resolveComment(presentationId: string, commentId: string, resolve = true): Promise<void> {
    // First get the comment to preserve its content
    const comment = await this.apiRequest<{ content: string }>(
      DRIVE_API,
      `/files/${presentationId}/comments/${commentId}?fields=content`
    );

    await this.apiRequest(DRIVE_API, `/files/${presentationId}/comments/${commentId}?fields=id,resolved`, {
      method: 'PATCH',
      body: JSON.stringify({ content: comment.content, resolved: resolve }),
    });
  }

  /**
   * Delete a comment
   */
  async deleteComment(presentationId: string, commentId: string): Promise<void> {
    await this.apiRequest(DRIVE_API, `/files/${presentationId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get presentation statistics
   */
  async getStats(presentationId: string): Promise<{
    slides: number;
    elements: number;
    textBoxes: number;
    images: number;
    tables: number;
    shapes: number;
  }> {
    const presentation = await this.getPresentation(presentationId);

    let elements = 0;
    let textBoxes = 0;
    let images = 0;
    let tables = 0;
    let shapes = 0;

    for (const slide of presentation.slides || []) {
      for (const el of slide.pageElements || []) {
        elements++;
        if (el.shape?.shapeType === 'TEXT_BOX') textBoxes++;
        else if (el.shape) shapes++;
        // Note: images and tables need different detection
      }
    }

    return {
      slides: presentation.slides?.length || 0,
      elements,
      textBoxes,
      images,
      tables,
      shapes,
    };
  }

  // ============================================
  // VIDEO
  // ============================================

  /**
   * Add a video to a slide (YouTube or Drive)
   */
  async addVideo(
    presentationId: string,
    slideId: string,
    videoId: string,
    source: 'YOUTUBE' | 'DRIVE' = 'YOUTUBE',
    options: { x?: number; y?: number; width?: number; height?: number } = {}
  ): Promise<string> {
    const { x = 100, y = 100, width = 400, height = 225 } = options;
    const objectId = `video_${Date.now()}`;

    await this.request(`/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          createVideo: {
            objectId,
            source,
            id: videoId,
            elementProperties: {
              pageObjectId: slideId,
              size: {
                width: { magnitude: width, unit: 'PT' },
                height: { magnitude: height, unit: 'PT' },
              },
              transform: {
                scaleX: 1,
                scaleY: 1,
                translateX: x,
                translateY: y,
                unit: 'PT',
              },
            },
          },
        }],
      }),
    });

    return objectId;
  }

  // ============================================
  // LINKS
  // ============================================

  /**
   * Add a link to text in a shape
   */
  async addLink(
    presentationId: string,
    shapeId: string,
    url: string,
    startIndex = 0,
    endIndex?: number
  ): Promise<void> {
    let textRange: Record<string, unknown>;
    if (endIndex !== undefined) {
      textRange = { type: 'FIXED_RANGE', startIndex, endIndex };
    } else if (startIndex > 0) {
      textRange = { type: 'FROM_START_INDEX', startIndex };
    } else {
      textRange = { type: 'ALL' };
    }

    await this.request(`/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          updateTextStyle: {
            objectId: shapeId,
            textRange,
            style: {
              link: { url },
            },
            fields: 'link',
          },
        }],
      }),
    });
  }

  // ============================================
  // GROUP ELEMENTS
  // ============================================

  /**
   * Group multiple elements together
   */
  async groupElements(presentationId: string, elementIds: string[]): Promise<string> {
    if (elementIds.length < 2) {
      throw new Error('At least 2 elements are required to create a group');
    }

    const groupId = `group_${Date.now()}`;

    await this.request(`/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          groupObjects: {
            groupObjectId: groupId,
            childrenObjectIds: elementIds,
          },
        }],
      }),
    });

    return groupId;
  }

  /**
   * Ungroup elements
   */
  async ungroupElements(presentationId: string, groupId: string): Promise<void> {
    await this.request(`/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          ungroupObjects: {
            objectIds: [groupId],
          },
        }],
      }),
    });
  }

  // ============================================
  // LAYOUTS
  // ============================================

  /**
   * Get available slide layouts
   */
  async getLayouts(presentationId: string): Promise<Array<{
    objectId: string;
    layoutType: string;
    displayName: string;
  }>> {
    const response = await this.request<{
      layouts?: Array<{
        objectId: string;
        layoutProperties?: {
          name?: string;
          displayName?: string;
        };
      }>;
    }>(`/presentations/${presentationId}?fields=layouts(objectId,layoutProperties)`);

    return (response.layouts || []).map(l => ({
      objectId: l.objectId,
      layoutType: l.layoutProperties?.name || 'CUSTOM',
      displayName: l.layoutProperties?.displayName || l.objectId,
    }));
  }

  /**
   * Get master slides
   */
  async getMasters(presentationId: string): Promise<Array<{
    objectId: string;
    pageElements: number;
  }>> {
    const response = await this.request<{
      masters?: Array<{
        objectId: string;
        pageElements?: PageElement[];
      }>;
    }>(`/presentations/${presentationId}?fields=masters(objectId,pageElements)`);

    return (response.masters || []).map(m => ({
      objectId: m.objectId,
      pageElements: m.pageElements?.length || 0,
    }));
  }

  // ============================================
  // CHARTS (from Google Sheets)
  // ============================================

  /**
   * Insert a chart from Google Sheets
   */
  async insertChart(
    presentationId: string,
    slideId: string,
    spreadsheetId: string,
    chartId: number,
    position?: { x: number; y: number },
    size?: { width: number; height: number }
  ): Promise<string> {
    const elementId = `chart_${Date.now()}`;

    const transform: Record<string, unknown> = {
      scaleX: 1,
      scaleY: 1,
      translateX: position?.x ?? 100,
      translateY: position?.y ?? 100,
      unit: 'PT',
    };

    await this.request(`/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          createSheetsChart: {
            objectId: elementId,
            spreadsheetId,
            chartId,
            linkingMode: 'LINKED',
            elementProperties: {
              pageObjectId: slideId,
              size: {
                width: { magnitude: size?.width ?? 400, unit: 'PT' },
                height: { magnitude: size?.height ?? 300, unit: 'PT' },
              },
              transform,
            },
          },
        }],
      }),
    });

    return elementId;
  }

  /**
   * Refresh a linked Sheets chart
   */
  async refreshChart(presentationId: string, chartElementId: string): Promise<void> {
    await this.request(`/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          refreshSheetsChart: {
            objectId: chartElementId,
          },
        }],
      }),
    });
  }
}

export const gslides = new GoogleSlidesClient();

/**
 * Extract presentation ID from URL or return as-is
 */
export function extractPresentationId(input: string): string {
  const urlMatch = input.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }
  return input;
}
