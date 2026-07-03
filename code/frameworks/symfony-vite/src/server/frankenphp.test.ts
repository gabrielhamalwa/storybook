import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, type AddressInfo, type Server } from 'node:net';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { startFrankenPhpServer } from './frankenphp.ts';

vi.mock('node:child_process', { spy: true });
vi.mock('node:net', { spy: true });

type EventHandler = (...args: unknown[]) => void;

const createMockChildProcess = (): ChildProcess => {
  const eventHandlers: Record<string, EventHandler[]> = {};

  const child = {
    kill: vi.fn((signal: NodeJS.Signals | number) => {
      if (eventHandlers.exit) {
        eventHandlers.exit.forEach((handler) =>
          handler(signal === 'SIGKILL' ? 137 : 0, signal as NodeJS.Signals)
        );
      }
      if (eventHandlers.close) {
        eventHandlers.close.forEach((handler) => handler());
      }
      return true;
    }),
    on: vi.fn((event: string, handler: EventHandler) => {
      eventHandlers[event] = eventHandlers[event] ?? [];
      eventHandlers[event].push(handler);
      return child as ChildProcess;
    }),
    once: vi.fn((event: string, handler: EventHandler) => {
      eventHandlers[event] = eventHandlers[event] ?? [];
      eventHandlers[event].push(handler);
      return child as ChildProcess;
    }),
  } as unknown as ChildProcess;

  return child;
};

describe('startFrankenPhpServer', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response));

    const mockChild = createMockChildProcess();
    vi.mocked(spawn).mockReturnValue(mockChild);

    vi.mocked(createServer).mockReturnValue({
      listen: vi.fn((port: number, host: string, callback: () => void) => {
        callback();
      }),
      address: vi.fn(() => ({ port: 12345, family: 'IPv4', address: '127.0.0.1' }) as AddressInfo),
      close: vi.fn((callback: () => void) => callback()),
      on: vi.fn(),
    } as unknown as Server);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('spawns frankenphp with the correct arguments and environment', async () => {
    const server = await startFrankenPhpServer({
      environment: 'storybook',
      projectDir: '/project',
      publicDir: '/project/public',
      port: 12345,
      phpBinary: 'php',
      console: '/project/bin/console',
    });

    expect(server.url).toBe('http://127.0.0.1:12345');
    expect(spawn).toHaveBeenCalledWith(
      'frankenphp',
      [
        'php-server',
        '--worker',
        '/project/public/index.php',
        '--root',
        '/project/public',
        '--listen',
        '127.0.0.1:12345',
      ],
      {
        cwd: '/project',
        env: expect.objectContaining({ APP_ENV: 'storybook' }),
        stdio: 'ignore',
      }
    );
  });

  it('stops the child process on stop()', async () => {
    const server = await startFrankenPhpServer({
      environment: 'storybook',
      projectDir: '/project',
      publicDir: '/project/public',
      port: 12345,
      phpBinary: 'php',
      console: '/project/bin/console',
    });

    const mockChild = vi.mocked(spawn).mock.results[0].value as ChildProcess;

    await server.stop();

    expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');
  });
});
