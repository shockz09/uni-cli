/**
 * WhatsApp Daemon Client
 * Communicates with wa-daemon.mjs via Unix socket
 */

import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

const HOME = process.env.HOME || '~';
const UNI_DIR = path.join(HOME, '.uni');
const SOCKET_PATH = path.join(UNI_DIR, 'wa.sock');
const PID_FILE = path.join(UNI_DIR, 'wa.pid');
const DAEMON_SCRIPT = path.join(__dirname, '..', '..', 'wa-daemon.mjs');

export interface DaemonResponse {
  ok?: boolean;
  error?: string;
  id?: string;
  chats?: Array<{ id: string; name: string }>;
  connected?: boolean;
  user?: string;
  uptime?: number;
  message?: string;
}

/**
 * Check if daemon is running
 */
export function isDaemonRunning(): boolean {
  if (!fs.existsSync(PID_FILE)) return false;

  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8'));
    process.kill(pid, 0); // Check if process exists
    return true;
  } catch {
    return false;
  }
}

/**
 * Start the daemon if not running
 */
export async function ensureDaemon(): Promise<boolean> {
  if (isDaemonRunning()) return true;

  // Find the daemon script
  const scriptPath = fs.existsSync(DAEMON_SCRIPT)
    ? DAEMON_SCRIPT
    : path.join(HOME, 'projects', 'uni-cli', 'packages', 'service-wa', 'wa-daemon.mjs');

  if (!fs.existsSync(scriptPath)) {
    console.error('Daemon script not found:', scriptPath);
    return false;
  }

  // Start daemon in background
  const child = spawn('node', [scriptPath, 'start'], {
    detached: true,
    stdio: 'ignore',
    cwd: path.dirname(scriptPath),
  });
  child.unref();

  // Wait for socket to be ready
  for (let i = 0; i < 50; i++) {
    await new Promise(r => setTimeout(r, 100));
    if (fs.existsSync(SOCKET_PATH)) {
      // Try to connect
      try {
        const result = await sendCommand({ action: 'ping' });
        if (result.ok) return true;
      } catch {
        // Keep waiting
      }
    }
  }

  return false;
}

/**
 * Send a command to the daemon
 */
export function sendCommand(cmd: Record<string, unknown>): Promise<DaemonResponse> {
  return new Promise((resolve, reject) => {
    let resolved = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const done = (result: DaemonResponse | Error) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);
      client.destroy();
      if (result instanceof Error) {
        reject(result);
      } else {
        resolve(result);
      }
    };

    const client = net.createConnection(SOCKET_PATH, () => {
      client.write(JSON.stringify(cmd) + '\n');
    });

    let buffer = '';
    client.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            done(JSON.parse(line));
          } catch {
            done(new Error('Invalid response from daemon'));
          }
          return;
        }
      }
    });

    client.on('error', (err) => done(err));

    client.on('close', () => {
      if (!resolved && buffer.trim()) {
        try {
          done(JSON.parse(buffer));
        } catch {
          done(new Error('Connection closed'));
        }
      }
    });

    timeoutId = setTimeout(() => done(new Error('Timeout')), 10000);
  });
}

/**
 * Execute a daemon command with auto-start
 */
export async function execDaemon(cmd: Record<string, unknown>): Promise<DaemonResponse> {
  // Ensure daemon is running
  const running = await ensureDaemon();
  if (!running) {
    return { error: 'Failed to start daemon. Run "uni wa auth" first.' };
  }

  try {
    return await sendCommand(cmd);
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/**
 * Stop the daemon
 */
export async function stopDaemon(): Promise<boolean> {
  if (!isDaemonRunning()) return true;

  try {
    await sendCommand({ action: 'stop' });
    return true;
  } catch {
    // Force kill
    if (fs.existsSync(PID_FILE)) {
      try {
        const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8'));
        process.kill(pid, 'SIGTERM');
      } catch {}
    }
    return true;
  }
}
