/**
 * ANSI Color Helpers
 *
 * Simple utilities for consistent terminal colors.
 * Use `c.cyan(text)` instead of `\x1b[36m${text}\x1b[0m`
 */

export const colors = {
  // Text colors
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  magenta: (s: string) => `\x1b[35m${s}\x1b[0m`,

  // Styles
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[90m${s}\x1b[0m`,
  italic: (s: string) => `\x1b[3m${s}\x1b[0m`,
  underline: (s: string) => `\x1b[4m${s}\x1b[0m`,
  strikethrough: (s: string) => `\x1b[9m${s}\x1b[0m`,

  // Semantic aliases
  success: (s: string) => `\x1b[32m${s}\x1b[0m`,
  error: (s: string) => `\x1b[31m${s}\x1b[0m`,
  warn: (s: string) => `\x1b[33m${s}\x1b[0m`,
  info: (s: string) => `\x1b[36m${s}\x1b[0m`,
};

// Short alias for convenience
export const c = colors;
