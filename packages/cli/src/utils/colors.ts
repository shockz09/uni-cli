/**
 * ANSI color utilities
 */

import { supportsColor } from '@uni/shared';

const enabled = supportsColor();

// ANSI escape codes
const codes = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  // Colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Bright colors
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // Background
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

function wrap(code: string, text: string): string {
  if (!enabled) return text;
  return `${code}${text}${codes.reset}`;
}

// Style functions
export const bold = (text: string) => wrap(codes.bold, text);
export const dim = (text: string) => wrap(codes.dim, text);
export const italic = (text: string) => wrap(codes.italic, text);
export const underline = (text: string) => wrap(codes.underline, text);

// Color functions
export const red = (text: string) => wrap(codes.red, text);
export const green = (text: string) => wrap(codes.green, text);
export const yellow = (text: string) => wrap(codes.yellow, text);
export const blue = (text: string) => wrap(codes.blue, text);
export const magenta = (text: string) => wrap(codes.magenta, text);
export const cyan = (text: string) => wrap(codes.cyan, text);
export const white = (text: string) => wrap(codes.white, text);
export const gray = (text: string) => wrap(codes.gray, text);

// Semantic colors
export const success = (text: string) => wrap(codes.green, text);
export const error = (text: string) => wrap(codes.red, text);
export const warning = (text: string) => wrap(codes.yellow, text);
export const info = (text: string) => wrap(codes.cyan, text);
export const muted = (text: string) => wrap(codes.gray, text);

// Symbols
export const symbols = {
  success: enabled ? '✔' : '[OK]',
  error: enabled ? '✖' : '[ERROR]',
  warning: enabled ? '⚠' : '[WARN]',
  info: enabled ? 'ℹ' : '[INFO]',
  arrow: enabled ? '→' : '->',
  bullet: enabled ? '•' : '-',
  pointer: enabled ? '❯' : '>',
};

// Strip ANSI codes from string
export function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

// Get visible length (without ANSI codes)
export function visibleLength(str: string): string['length'] {
  return stripAnsi(str).length;
}
