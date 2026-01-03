/**
 * QR Code generation using 'qrcode' npm package
 */

import QRCode from 'qrcode';

export interface QROptions {
  size?: number;
  foreground?: string;
  background?: string;
}

/**
 * Generate QR code as terminal ASCII art
 */
export async function toTerminal(content: string): Promise<string> {
  return QRCode.toString(content, {
    type: 'terminal',
    small: true,
  });
}

/**
 * Generate QR code as PNG file
 */
export async function toFile(
  content: string,
  filePath: string,
  options: QROptions = {}
): Promise<void> {
  await QRCode.toFile(filePath, content, {
    width: options.size || 256,
    color: {
      dark: options.foreground || '#000000',
      light: options.background || '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
}

/**
 * Generate QR code as data URL (base64)
 */
export async function toDataURL(
  content: string,
  options: QROptions = {}
): Promise<string> {
  return QRCode.toDataURL(content, {
    width: options.size || 256,
    color: {
      dark: options.foreground || '#000000',
      light: options.background || '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
}

/**
 * Generate WiFi QR code content
 */
export function wifiContent(ssid: string, password: string, security: 'WPA' | 'WEP' | 'nopass' = 'WPA'): string {
  // Escape special characters
  const escapedSsid = ssid.replace(/[\\;,:]/g, '\\$&');
  const escapedPass = password.replace(/[\\;,:]/g, '\\$&');

  return `WIFI:T:${security};S:${escapedSsid};P:${escapedPass};;`;
}
