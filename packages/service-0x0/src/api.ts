/**
 * 0x0.st API Client
 *
 * The null pointer - file hosting and URL shortening.
 * No auth required. Files expire based on size.
 * Docs: https://0x0.st/
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const API_URL = 'https://0x0.st';

export interface UploadResult {
  url: string;
  filename?: string;
}

export async function uploadFile(filePath: string): Promise<UploadResult> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer]), fileName);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'User-Agent': 'uni-cli/1.0',
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed: ${text}`);
  }

  const url = (await response.text()).trim();

  return { url, filename: fileName };
}

export async function uploadText(
  text: string,
  filename: string = 'paste.txt'
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', new Blob([text]), filename);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'User-Agent': 'uni-cli/1.0',
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Upload failed: ${errText}`);
  }

  const url = (await response.text()).trim();

  return { url, filename };
}

export async function shortenUrl(longUrl: string): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('shorten', longUrl);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'User-Agent': 'uni-cli/1.0',
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Shorten failed: ${errText}`);
  }

  const url = (await response.text()).trim();

  return { url };
}
