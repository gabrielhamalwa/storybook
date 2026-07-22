import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer, type AddressInfo, type Server } from 'node:net';

import { vol } from 'memfs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { startRoadRunnerServer } from './roadrunner.ts';

vi.mock('node:child_process', { spy: true });
vi.mock('node:fs/promises', { spy: true });
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

describe('startRoadRunnerServer', () => {
  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response));
    vol.reset();
    vol.fromNestedJSON({
      '/project': null,
      '/tmp/storybook-symfony-roadrunner-test': null,
    });

    const mockChild = createMockChildProcess();
    vi.mocked(spawn).mockReturnValue(mockChild);
    vi.mocked(mkdtemp).mockResolvedValue('/tmp/storybook-symfony-roadrunner-test');
    vi.mocked(rm).mockResolvedValue();

    vi.mocked(createServer).mockReturnValue({
      listen: vi.fn((port: number, host: string, callback: () => void) => {
        callback();
      }),
      address: vi.fn(() => ({ port: 12345, family: 'IPv4', address: '127.0.0.1' }) as AddressInfo),
      close: vi.fn((callback: () => void) => callback()),
      on: vi.fn(),
    } as unknown as Server);

    const memfs = await vi.importActual<typeof import('memfs')>('memfs');
    vi.mocked(writeFile).mockImplementation(memfs.fs.promises.writeFile as typeof writeFile);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('writes a temporary config and spawns rr with the correct arguments', async () => {
    const server = await startRoadRunnerServer({
      environment: 'storybook',
      projectDir: '/project',
      publicDir: '/project/public',
      port: 12345,
      phpBinary: 'php',
      console: '/project/bin/console',
    });

    expect(server.url).toBe('http://127.0.0.1:12345');
    const files = vol.toJSON();
    expect(files).toHaveProperty('/tmp/storybook-symfony-roadrunner-test/rr.yaml');

    const config = files['/tmp/storybook-symfony-roadrunner-test/rr.yaml'] as string;
    expect(config).toContain('version: "3"');
    expect(config).toContain("command: '''php'' ''/project/public/index.php'''");
    expect(config).toContain("APP_ENV: 'storybook'");
    expect(config).toContain("APP_RUNTIME: 'Runtime\\RoadRunnerSymfonyNyholm\\Runtime'");
    expect(config).toContain('address: 127.0.0.1:12345');

    expect(spawn).toHaveBeenCalledWith(
      'rr',
      ['serve', '-c', '/tmp/storybook-symfony-roadrunner-test/rr.yaml'],
      {
        cwd: '/project',
        env: expect.objectContaining({ APP_ENV: 'storybook' }),
        stdio: 'ignore',
      }
    );
  });

  it('stops the child process and removes the config on stop()', async () => {
    const server = await startRoadRunnerServer({
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
    expect(rm).toHaveBeenCalledWith('/tmp/storybook-symfony-roadrunner-test', {
      recursive: true,
      force: true,
    });
  });
});
