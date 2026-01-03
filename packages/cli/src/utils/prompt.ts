/**
 * Interactive prompt utilities
 */

import type { PromptHelper, SelectOption, TextPromptOptions } from '@uni/shared';
import { isTTY } from '@uni/shared';
import * as c from './colors';

/**
 * Create a prompt helper
 */
export function createPromptHelper(): PromptHelper {
  return {
    async text(message: string, options?: TextPromptOptions): Promise<string> {
      if (!isTTY()) {
        throw new Error('Cannot prompt in non-interactive mode');
      }

      const prompt = options?.default
        ? `${message} ${c.dim(`(${options.default})`)}: `
        : `${message}: `;

      process.stdout.write(prompt);

      const response = await readLine();
      const value = response.trim() || options?.default || '';

      // Validate if provided
      if (options?.validate) {
        const result = options.validate(value);
        if (result !== true) {
          console.log(c.error(typeof result === 'string' ? result : 'Invalid input'));
          return this.text(message, options);
        }
      }

      return value;
    },

    async confirm(message: string, defaultValue = false): Promise<boolean> {
      if (!isTTY()) {
        return defaultValue;
      }

      const hint = defaultValue ? 'Y/n' : 'y/N';
      process.stdout.write(`${message} ${c.dim(`(${hint})`)}: `);

      const response = await readLine();
      const trimmed = response.trim().toLowerCase();

      if (!trimmed) return defaultValue;
      return trimmed === 'y' || trimmed === 'yes';
    },

    async select<T extends string>(
      message: string,
      options: SelectOption<T>[]
    ): Promise<T> {
      if (!isTTY()) {
        return options[0].value;
      }

      console.log(`\n${message}\n`);

      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        console.log(
          `  ${c.cyan(`${i + 1})`)} ${opt.label}${opt.description ? c.dim(` - ${opt.description}`) : ''}`
        );
      }

      process.stdout.write(`\n${c.dim('Enter number')}: `);
      const response = await readLine();
      const index = parseInt(response.trim(), 10) - 1;

      if (isNaN(index) || index < 0 || index >= options.length) {
        console.log(c.error('Invalid selection'));
        return this.select(message, options);
      }

      return options[index].value;
    },

    async multiselect<T extends string>(
      message: string,
      options: SelectOption<T>[]
    ): Promise<T[]> {
      if (!isTTY()) {
        return [];
      }

      console.log(`\n${message} ${c.dim('(comma-separated numbers)')}\n`);

      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        console.log(
          `  ${c.cyan(`${i + 1})`)} ${opt.label}${opt.description ? c.dim(` - ${opt.description}`) : ''}`
        );
      }

      process.stdout.write(`\n${c.dim('Enter numbers')}: `);
      const response = await readLine();

      const indices = response
        .split(',')
        .map(s => parseInt(s.trim(), 10) - 1)
        .filter(i => !isNaN(i) && i >= 0 && i < options.length);

      return indices.map(i => options[i].value);
    },

    async password(message: string): Promise<string> {
      if (!isTTY()) {
        throw new Error('Cannot prompt for password in non-interactive mode');
      }

      process.stdout.write(`${message}: `);

      // Note: In a real implementation, we'd use something like
      // readline with hidden input. For now, just read normally.
      const response = await readLine();
      return response;
    },
  };
}

/**
 * Read a line from stdin
 */
async function readLine(): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const isRaw = stdin.isRaw;

    stdin.setRawMode?.(false);
    stdin.resume();

    let data = '';

    const onData = (chunk: Buffer) => {
      const str = chunk.toString();

      if (str.includes('\n') || str.includes('\r')) {
        stdin.removeListener('data', onData);
        stdin.pause();
        stdin.setRawMode?.(isRaw ?? false);
        resolve(data + str.replace(/[\r\n]/g, ''));
      } else {
        data += str;
      }
    };

    stdin.on('data', onData);
  });
}
