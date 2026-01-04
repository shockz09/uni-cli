/**
 * Google Photos API Client
 *
 * Extends GoogleAuthClient for OAuth handling.
 * Tokens stored in ~/.uni/tokens/gphotos.json
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { GoogleAuthClient } from '@uni/shared';

const SCOPES = [
  'https://www.googleapis.com/auth/photoslibrary',
];

const PHOTOS_API = 'https://photoslibrary.googleapis.com/v1';

export interface MediaItem {
  id: string;
  description?: string;
  productUrl: string;
  baseUrl: string;
  mimeType: string;
  filename: string;
  mediaMetadata: {
    creationTime: string;
    width: string;
    height: string;
    photo?: {
      cameraMake?: string;
      cameraModel?: string;
    };
    video?: {
      fps?: number;
      status?: string;
    };
  };
}

export interface Album {
  id: string;
  title: string;
  productUrl: string;
  mediaItemsCount?: string;
  coverPhotoBaseUrl?: string;
  isWriteable?: boolean;
}

interface MediaItemsResponse {
  mediaItems?: MediaItem[];
  nextPageToken?: string;
}

interface AlbumsResponse {
  albums?: Album[];
  nextPageToken?: string;
}

export class GPhotosClient extends GoogleAuthClient {
  constructor() {
    super({
      serviceName: 'gphotos',
      scopes: SCOPES,
      apiBase: PHOTOS_API,
    });
  }

  /**
   * List recent photos
   */
  async listPhotos(options: { limit?: number } = {}): Promise<MediaItem[]> {
    const limit = options.limit || 20;

    const response = await this.request<MediaItemsResponse>(
      `/mediaItems?pageSize=${limit}`
    );

    return response.mediaItems || [];
  }

  /**
   * Search photos by text or date
   */
  async searchPhotos(options: { query?: string; date?: string; limit?: number } = {}): Promise<MediaItem[]> {
    const limit = options.limit || 20;
    const token = await this.getAccessToken();

    const filters: Record<string, unknown> = {};

    if (options.date) {
      // Parse date like "2025-01" or "2025-01-15"
      const parts = options.date.split('-');
      const dateFilter: Record<string, unknown> = {
        dates: [{
          year: parseInt(parts[0]),
          month: parts[1] ? parseInt(parts[1]) : undefined,
          day: parts[2] ? parseInt(parts[2]) : undefined,
        }],
      };
      filters.dateFilter = dateFilter;
    }

    if (options.query) {
      filters.contentFilter = {
        includedContentCategories: ['NONE'], // Will search by description
      };
    }

    const body: Record<string, unknown> = {
      pageSize: limit,
    };

    if (Object.keys(filters).length > 0) {
      body.filters = filters;
    }

    const response = await fetch(`${PHOTOS_API}/mediaItems:search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Search failed: ${error}`);
    }

    const data = await response.json() as MediaItemsResponse;
    return data.mediaItems || [];
  }

  /**
   * Get photo details
   */
  async getPhoto(mediaItemId: string): Promise<MediaItem> {
    return this.request<MediaItem>(`/mediaItems/${mediaItemId}`);
  }

  /**
   * Download photo to local path
   */
  async downloadPhoto(mediaItemId: string, destPath: string): Promise<void> {
    const photo = await this.getPhoto(mediaItemId);

    // Add download parameters to base URL
    const isVideo = photo.mimeType.startsWith('video/');
    const downloadUrl = isVideo
      ? `${photo.baseUrl}=dv` // dv = download video
      : `${photo.baseUrl}=d`; // d = download

    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();

    // Use provided path or generate from filename
    const finalPath = destPath.endsWith('/') || fs.existsSync(destPath) && fs.statSync(destPath).isDirectory()
      ? path.join(destPath, photo.filename)
      : destPath;

    fs.writeFileSync(finalPath, Buffer.from(buffer));
  }

  /**
   * Upload photo
   */
  async uploadPhoto(filePath: string, options: { albumId?: string; description?: string } = {}): Promise<MediaItem> {
    const token = await this.getAccessToken();
    const fileName = path.basename(filePath);
    const fileContent = fs.readFileSync(filePath);

    // Step 1: Upload bytes
    const uploadResponse = await fetch(`${PHOTOS_API}/uploads`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'X-Goog-Upload-Content-Type': this.getMimeType(filePath),
        'X-Goog-Upload-Protocol': 'raw',
      },
      body: fileContent,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      throw new Error(`Upload failed: ${error}`);
    }

    const uploadToken = await uploadResponse.text();

    // Step 2: Create media item
    const createBody: Record<string, unknown> = {
      newMediaItems: [{
        description: options.description || '',
        simpleMediaItem: {
          fileName,
          uploadToken,
        },
      }],
    };

    if (options.albumId) {
      createBody.albumId = options.albumId;
    }

    const createResponse = await fetch(`${PHOTOS_API}/mediaItems:batchCreate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createBody),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Create media item failed: ${error}`);
    }

    const result = await createResponse.json() as { newMediaItemResults: Array<{ mediaItem: MediaItem }> };
    return result.newMediaItemResults[0].mediaItem;
  }

  /**
   * List albums
   */
  async listAlbums(options: { limit?: number } = {}): Promise<Album[]> {
    const limit = options.limit || 20;

    const response = await this.request<AlbumsResponse>(
      `/albums?pageSize=${limit}`
    );

    return response.albums || [];
  }

  /**
   * Create album
   */
  async createAlbum(title: string): Promise<Album> {
    const token = await this.getAccessToken();

    const response = await fetch(`${PHOTOS_API}/albums`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ album: { title } }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Create album failed: ${error}`);
    }

    return response.json() as Promise<Album>;
  }

  /**
   * Get album photos
   */
  async getAlbumPhotos(albumId: string, limit = 50): Promise<MediaItem[]> {
    const token = await this.getAccessToken();

    const response = await fetch(`${PHOTOS_API}/mediaItems:search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        albumId,
        pageSize: limit,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Get album photos failed: ${error}`);
    }

    const data = await response.json() as MediaItemsResponse;
    return data.mediaItems || [];
  }

  /**
   * Share album and get share URL
   */
  async shareAlbum(albumId: string): Promise<string> {
    const token = await this.getAccessToken();

    const response = await fetch(`${PHOTOS_API}/albums/${albumId}:share`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sharedAlbumOptions: {
          isCollaborative: false,
          isCommentable: true,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Share album failed: ${error}`);
    }

    const result = await response.json() as { shareInfo: { shareableUrl: string } };
    return result.shareInfo.shareableUrl;
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.heic': 'image/heic',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Format date for display
   */
  formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

export const gphotos = new GPhotosClient();
