#!/usr/bin/env bun
/**
 * uni - Universal CLI for everything
 *
 * Usage:
 *   uni <service> <command> [options] [args]
 *
 * Examples:
 *   uni exa search "React hooks"
 *   uni gh pr list
 *   uni gcal add "Meeting" --time 10am
 */

import { cli } from './core/cli';

// Run the CLI
cli.run(process.argv.slice(2)).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
