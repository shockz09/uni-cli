/**
 * Pipe - Cross-platform data piping between uni commands
 *
 * Provides --select, --filter, and --each for transforming and iterating over data
 * without requiring external tools like jq or xargs.
 */

import * as c from '../utils/colors';

export interface PipeOptions {
  select?: string;      // JSON path to select (e.g., "items[*].name")
  filter?: string;      // Filter expression (e.g., "status == 'active'")
  each?: string;        // Command template to run for each item
  dryRun?: boolean;     // Show commands without executing
  json?: boolean;       // Output as JSON
}

export interface PipeResult {
  success: boolean;
  itemsProcessed: number;
  itemsMatched: number;
  results: Array<{
    item: unknown;
    command?: string;
    success: boolean;
    output?: string;
    error?: string;
  }>;
}

/**
 * Get a value from an object using dot notation path
 * Supports: "foo.bar", "items[0]", "items[*]" (wildcard for arrays)
 */
export function getByPath(obj: unknown, path: string): unknown {
  if (!path || path === '.') return obj;

  const parts = path.split(/\.|\[|\]/).filter(Boolean);
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    // Handle wildcard array access
    if (part === '*') {
      if (!Array.isArray(current)) {
        return undefined;
      }
      // Return the array itself for further processing
      return current;
    }

    // Handle numeric index
    if (/^\d+$/.test(part)) {
      if (Array.isArray(current)) {
        current = current[parseInt(part, 10)];
      } else {
        return undefined;
      }
    } else {
      // Handle object property
      if (typeof current === 'object' && current !== null) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
  }

  return current;
}

/**
 * Flatten nested arrays from wildcard selections
 * e.g., "items[*].tags[*]" returns flat array of all tags
 */
export function selectPath(data: unknown, path: string): unknown[] {
  if (!path || path === '.') {
    return Array.isArray(data) ? data : [data];
  }

  // Split path by [*] to handle wildcards
  const wildcardParts = path.split(/\[\*\]/);

  let results: unknown[] = Array.isArray(data) ? data : [data];

  for (let i = 0; i < wildcardParts.length; i++) {
    const subPath = wildcardParts[i].replace(/^\./, '').replace(/\.$/, '');

    if (subPath) {
      // Apply subpath to each current result
      results = results.map(item => getByPath(item, subPath)).filter(x => x !== undefined);
    }

    // Flatten arrays for next iteration (except on last part)
    if (i < wildcardParts.length - 1) {
      results = results.flat();
    }
  }

  // Final flatten in case last selection was an array
  return results.flat();
}

/**
 * Evaluate a filter expression against an item
 * Supports: ==, !=, >, <, >=, <=, contains, startsWith, endsWith
 */
export function evaluateFilter(item: unknown, expression: string): boolean {
  if (!expression) return true;

  // Create a safe evaluation context with the item's properties
  const context: Record<string, unknown> = {};

  if (typeof item === 'object' && item !== null) {
    Object.assign(context, item);
  } else {
    context.value = item;
  }

  // Add helper functions
  context.contains = (str: string, sub: string) =>
    String(str).toLowerCase().includes(String(sub).toLowerCase());
  context.startsWith = (str: string, prefix: string) =>
    String(str).toLowerCase().startsWith(String(prefix).toLowerCase());
  context.endsWith = (str: string, suffix: string) =>
    String(str).toLowerCase().endsWith(String(suffix).toLowerCase());
  context.len = (x: unknown) => Array.isArray(x) ? x.length : String(x).length;
  context.num = (x: unknown) => Number(x);
  context.lower = (x: unknown) => String(x).toLowerCase();
  context.upper = (x: unknown) => String(x).toUpperCase();

  try {
    // Transform expression to be JavaScript-compatible
    let jsExpr = expression
      // Handle 'contains' as method call: field contains "value" -> contains(field, "value")
      .replace(/(\w+)\s+contains\s+(['"].*?['"]|\w+)/gi, 'contains($1, $2)')
      // Handle 'startsWith': field startsWith "value" -> startsWith(field, "value")
      .replace(/(\w+)\s+startsWith\s+(['"].*?['"]|\w+)/gi, 'startsWith($1, $2)')
      // Handle 'endsWith': field endsWith "value" -> endsWith(field, "value")
      .replace(/(\w+)\s+endsWith\s+(['"].*?['"]|\w+)/gi, 'endsWith($1, $2)')
      // Handle 'and' -> &&
      .replace(/\s+and\s+/gi, ' && ')
      // Handle 'or' -> ||
      .replace(/\s+or\s+/gi, ' || ')
      // Handle 'not' at start or after logical operators -> !
      .replace(/^not\s+/i, '!(')
      .replace(/(\s*&&\s*|\s*\|\|\s*)not\s+/gi, '$1!(');

    // If we added a '!(' for 'not', we need to close the parenthesis
    const notCount = (expression.match(/\bnot\s+/gi) || []).length;
    if (notCount > 0) {
      jsExpr = jsExpr + ')'.repeat(notCount);
    }

    // Create function with context variables
    const varNames = Object.keys(context);
    const varValues = Object.values(context);

    const fn = new Function(...varNames, `return (${jsExpr})`);
    return Boolean(fn(...varValues));
  } catch {
    // If expression fails, return false
    return false;
  }
}

/**
 * Substitute {{field}} templates in a string with values from an item
 */
export function substituteTemplate(template: string, item: unknown, index: number): string {
  let result = template;

  // Replace {{.}} or {{value}} with the item itself (for primitives)
  result = result.replace(/\{\{\s*(\.|value)\s*\}\}/g, String(item));

  // Replace {{index}} with the current index
  result = result.replace(/\{\{\s*index\s*\}\}/g, String(index));

  // Replace {{field}} with item.field
  if (typeof item === 'object' && item !== null) {
    result = result.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\}\}/g, (_, path) => {
      const value = getByPath(item, path);
      if (value === undefined || value === null) return '';
      return String(value);
    });
  }

  return result;
}

/**
 * Execute a single uni command and capture output
 */
async function executeCommand(command: string, captureOutput: boolean = true): Promise<{
  success: boolean;
  output?: string;
  error?: string;
}> {
  try {
    const { spawn } = await import('node:child_process');

    // Use process.argv[1] which is the path to the running uni CLI
    const uniPath = process.argv[1];

    return new Promise((resolve) => {
      const child = spawn('sh', ['-c', `${uniPath} ${command}`], {
        stdio: 'pipe',
        cwd: process.cwd(),
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
        if (!captureOutput) {
          process.stdout.write(data);
        }
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
        if (!captureOutput) {
          process.stderr.write(data);
        }
      });

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          output: stdout.trim(),
          error: code !== 0 ? stderr || `Exit code ${code}` : undefined,
        });
      });

      child.on('error', (err) => {
        resolve({
          success: false,
          error: err.message,
        });
      });
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run a pipe operation
 */
export async function runPipe(
  sourceCommand: string,
  options: PipeOptions
): Promise<PipeResult> {
  const { select, filter, each, dryRun } = options;

  // Step 1: Execute source command with --json
  console.log(`${c.dim('⟳')} Running: ${c.cyan(sourceCommand)}`);

  let sourceData: unknown;

  if (dryRun) {
    console.log(`${c.dim('  → Would execute:')} ${sourceCommand} --json`);
    // For dry run, use sample data
    sourceData = [{ sample: 'data', index: 0 }, { sample: 'data', index: 1 }];
  } else {
    const sourceResult = await executeCommand(`${sourceCommand} --json`, true);

    if (!sourceResult.success) {
      return {
        success: false,
        itemsProcessed: 0,
        itemsMatched: 0,
        results: [{
          item: null,
          success: false,
          error: sourceResult.error || 'Source command failed',
        }],
      };
    }

    // Parse JSON output
    try {
      sourceData = JSON.parse(sourceResult.output || '[]');
    } catch {
      return {
        success: false,
        itemsProcessed: 0,
        itemsMatched: 0,
        results: [{
          item: null,
          success: false,
          error: `Failed to parse source output as JSON: ${sourceResult.output?.slice(0, 100)}`,
        }],
      };
    }
  }

  // Step 2: Apply --select to extract data
  let items = selectPath(sourceData, select || '');
  const itemsProcessed = items.length;

  console.log(`${c.dim('  → Selected:')} ${itemsProcessed} item(s)`);

  // Step 3: Apply --filter to narrow down
  if (filter) {
    items = items.filter(item => evaluateFilter(item, filter));
    console.log(`${c.dim('  → After filter:')} ${items.length} item(s)`);
  }

  const itemsMatched = items.length;

  // Step 4: If no --each, just output the data
  if (!each) {
    if (options.json) {
      console.log(JSON.stringify(items, null, 2));
    } else {
      console.log('');
      for (const item of items) {
        if (typeof item === 'object') {
          console.log(JSON.stringify(item));
        } else {
          console.log(String(item));
        }
      }
    }

    return {
      success: true,
      itemsProcessed,
      itemsMatched,
      results: items.map(item => ({ item, success: true })),
    };
  }

  // Step 5: Execute --each command for each item
  console.log(`${c.dim('  → Executing:')} ${each}`);
  console.log('');

  const results: PipeResult['results'] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const command = substituteTemplate(each, item, i);

    if (dryRun) {
      console.log(`${c.dim(`  [${i + 1}/${items.length}]`)} ${command}`);
      results.push({ item, command, success: true });
    } else {
      console.log(`${c.dim(`[${i + 1}/${items.length}]`)} ${c.cyan(command)}`);
      const result = await executeCommand(command, false);
      results.push({
        item,
        command,
        success: result.success,
        output: result.output,
        error: result.error,
      });

      if (!result.success) {
        console.log(`${c.red('  ✗')} ${result.error}`);
      }
    }
  }

  const allSuccess = results.every(r => r.success);
  const failedCount = results.filter(r => !r.success).length;

  console.log('');
  if (allSuccess) {
    console.log(`${c.green('✓')} Completed ${results.length} item(s)`);
  } else {
    console.log(`${c.red('✗')} ${failedCount}/${results.length} failed`);
  }

  return {
    success: allSuccess,
    itemsProcessed,
    itemsMatched,
    results,
  };
}

/**
 * Show pipe help
 */
export function showPipeHelp(): void {
  console.log(`
${c.bold('uni pipe')} - Transform and iterate over command output

${c.bold('Usage:')}
  uni pipe <command> [options]

${c.bold('Options:')}
  --select <path>    JSON path to extract (e.g., "items[*].name", "data.users")
  --filter <expr>    Filter expression (e.g., "status == 'active'", "count > 10")
  --each <cmd>       Uni command to run for each item (use {{field}} for values)
  -n, --dry-run      Show what would be executed without running
  --json             Output results as JSON

${c.bold('Template Variables:')}
  {{fieldName}}      Value of field from current item
  {{nested.field}}   Nested field access
  {{.}} or {{value}} The item itself (for primitives)
  {{index}}          Current item index (0-based)

${c.bold('Filter Operators:')}
  ==, !=, >, <, >=, <=    Comparison
  contains, startsWith, endsWith    String matching
  and, or, not            Logical operators

${c.bold('Examples:')}
  ${c.dim('# List calendar events, send each to Slack')}
  uni pipe "gcal list --today" --select "events[*]" --each "slack send #standup '{{title}}'"

  ${c.dim('# Get spreadsheet rows, filter, create tasks')}
  uni pipe "gsheets get ID" --filter "status == 'todo'" --each "todoist add '{{task}}'"

  ${c.dim('# Search emails, forward urgent ones')}
  uni pipe "gmail list" --filter "subject contains 'urgent'" --each "slack send #alerts '{{subject}}'"

  ${c.dim('# Get all attendee emails from calendar')}
  uni pipe "gcal list" --select "events[*].attendees[*].email"

  ${c.dim('# Dry run to see what would execute')}
  uni pipe "gcal list" --each "echo {{title}}" --dry-run
`);
}
