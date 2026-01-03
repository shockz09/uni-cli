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
    return JSON.parse(text) as T;
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
  async addText(presentationId: string, slideId: string, text: string): Promise<void> {
    const shapeId = `textbox_${Date.now()}`;

    const requests = [
      {
        createShape: {
          objectId: shapeId,
          shapeType: 'TEXT_BOX',
          elementProperties: {
            pageObjectId: slideId,
            size: {
              width: { magnitude: 500, unit: 'PT' },
              height: { magnitude: 300, unit: 'PT' },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: 50,
              translateY: 100,
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
